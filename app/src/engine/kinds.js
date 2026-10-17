/*
 * Kinds: comportamiento genérico de cada tipo de objeto (docs/02).  Un kind dice qué verbos acepta
 * y cómo cambia el estado.  Cada verbo recibe un BORRADOR del mundo (`w`) y lo modifica; si la
 * acción no tiene sentido (cerrar algo ya retirado, medir con el detector apagado…) devuelve
 * INVALID y el runner la ignora sin error.  Nada de mutar objetos anidados: siempre copias nuevas.
 *
 *   w = { id, def, payload, state, inventory, hand, readings, time, objects, cond(c) }
 *   w.get() / w.set(v)          estado de ESTE objeto
 *   w.setOf(id, v)               estado de otro objeto
 *   w.give(item) / w.take(item)  inventario (take también vacía la mano si lo tenía)
 */
import { listHas } from './conditions.js'

export const INVALID = Symbol('invalid')
const same = (w, v) => { w.set(v); return true }
const toggle2 = (a, b) => ({ [a]: (w) => same(w, a), [b]: (w) => same(w, b) })

export const KINDS = {
  /* documentos: permiso, orden de trabajo, ATS (pendiente → leido → firmado → cerrado) */
  document: {
    initial: () => 'pendiente',
    verbs: {
      leer: (w) => { if (w.get() === 'pendiente') w.set('leido'); return true },
      firmar: (w) => (['pendiente', 'leido'].includes(w.get()) ? same(w, 'firmado') : INVALID),
      cerrar: (w) => (w.get() === 'firmado' ? same(w, 'cerrado') : INVALID),
    },
  },
  /* lista de chequeo (matriz de energías, ATS, peligros): conjunto de ítems marcados */
  checklist: {
    initial: () => [],
    verbs: {
      marcar: (w) => {
        if (!w.def.items?.some((i) => i.id === w.payload)) return INVALID
        if (!w.get().includes(w.payload)) w.set([...w.get(), w.payload])
        return true
      },
      desmarcar: (w) => { if (!w.get().includes(w.payload)) return INVALID; w.set(w.get().filter((x) => x !== w.payload)); return true },
    },
  },
  breaker: { initial: () => 'on', verbs: toggle2('on', 'off') },
  /* pulsador: guarda la última pulsación; el efecto lo definen los `effects` del escenario */
  pushbutton: { initial: () => null, verbs: { start: (w) => same(w, 'start'), stop: (w) => same(w, 'stop') } },
  valve: {
    initial: () => 'open',
    verbs: { open: (w) => same(w, 'open'), close: (w) => same(w, 'closed') },
  },
  /* punto de bloqueo: lista de candados, tarjetas y dispositivos puestos (ids de items) */
  lockpoint: {
    initial: (def) => def.preset ? [...def.preset] : [],
    verbs: {
      poner: (w) => {
        const it = w.payload
        if (!w.objects[it] || !w.inventory.includes(it)) return INVALID
        w.take(it)
        w.set([...w.get(), it])
        w.setOf(it, 'en:' + w.id)
        return true
      },
      quitar: (w) => {
        const it = w.payload
        if (!w.get().includes(it)) return INVALID
        w.set(w.get().filter((x) => x !== it))
        w.give(it)
        w.setOf(it, 'inventario')
        return true
      },
    },
  },
  /* objeto tomable: candado, tarjeta, cubre-volante, herramienta, detector… */
  item: {
    initial: (def) => def.initial ?? 'sitio',
    verbs: {
      tomar: (w) => {
        if (w.get() !== 'sitio') return INVALID
        w.set('inventario'); w.give(w.id); w.setHand(w.id)
        return true
      },
      soltar: (w) => {
        if (!w.inventory.includes(w.id)) return INVALID
        w.take(w.id); w.set('sitio')
        return true
      },
      usar: (w) => (w.inventory.includes(w.id) ? true : INVALID),
    },
  },
  /* manómetro: leer guarda el valor que marcaba en ese momento */
  gauge: {
    initial: () => null,
    verbs: { leer: (w) => { const v = w.readings[w.def.reading]; w.set(typeof v === 'number' ? Math.round(v * 10) / 10 : v); return true } },
  },
  /*
   * probador de tensión: medir(objetivo) agrega 'objetivo:si' o 'objetivo:no' a su historial.
   * def.reads = { objetivo: lectura }, def.dead = condición (p. ej. batería descargada → siempre 'no').
   */
  tester: {
    initial: () => [],
    verbs: {
      medir: (w) => {
        const r = w.def.reads?.[w.payload]
        if (!r) return INVALID
        const live = !w.cond(w.def.dead ?? false) && (w.readings[r] ?? 0) > (w.def.threshold ?? 30)
        w.set([...w.get(), `${w.payload}:${live ? 'si' : 'no'}`])
        return true
      },
    },
  },
  /*
   * detector multigás: { on, bump, lecturas: { nivel: { o2, lel, h2s, co, ok, t } }, hist: [niveles], lastT }
   * def.reading = nombre de la lectura que devuelve { nivel: { o2, lel, h2s, co } }; def.limits = umbrales.
   */
  gasdetector: {
    initial: () => ({ on: false, bump: false, lecturas: {}, hist: [], lastT: null }),
    verbs: {
      encender: (w) => same(w, { ...w.get(), on: true }),
      apagar: (w) => same(w, { ...w.get(), on: false }),
      bump: (w) => (w.get().on ? same(w, { ...w.get(), bump: true }) : INVALID),
      medir: (w) => {
        const s = w.get()
        if (!s.on) return INVALID
        const atm = w.readings[w.def.reading]?.[w.payload]
        if (!atm) return INVALID
        const L = w.def.limits || {}
        const ok = (L.o2 ? atm.o2 >= L.o2[0] && atm.o2 <= L.o2[1] : true) && (L.lel == null || atm.lel < L.lel) && (L.h2s == null || atm.h2s < L.h2s) && (L.co == null || atm.co < L.co)
        w.set({ ...s, lecturas: { ...s.lecturas, [w.payload]: { ...atm, ok, t: w.time } }, hist: [...s.hist, w.payload], lastT: w.time })
        return true
      },
    },
  },
  /* arnés: inspección por puntos, puesto, ajustado.  El defecto (si lo trae) lo decide la variante del escenario */
  harness: {
    initial: () => ({ inspeccionado: [], puesto: false, ajustado: false }),
    verbs: {
      inspeccionar: (w) => {
        const s = w.get()
        if (w.def.points && !w.def.points.includes(w.payload)) return INVALID
        return same(w, s.inspeccionado.includes(w.payload) ? s : { ...s, inspeccionado: [...s.inspeccionado, w.payload] })
      },
      poner: (w) => same(w, { ...w.get(), puesto: true }),
      ajustar: (w) => (w.get().puesto ? same(w, { ...w.get(), ajustado: true }) : INVALID),
      quitar: (w) => (w.get().puesto ? same(w, { ...w.get(), puesto: false, ajustado: false }) : INVALID),
    },
  },
  anchor: { initial: () => 'libre', verbs: { conectar: (w) => same(w, 'conectado'), desconectar: (w) => same(w, 'libre') } },
  barrier: { initial: () => 'retirada', verbs: { colocar: (w) => same(w, 'colocada'), retirar: (w) => same(w, 'retirada') } },
  door: { initial: () => 'cerrada', verbs: { abrir: (w) => same(w, 'abierta'), cerrar: (w) => same(w, 'cerrada') } },
  fan: { initial: () => 'off', verbs: toggle2('on', 'off') },
  /* radio y personas (NPC): registran la lista de mensajes / opciones elegidas */
  radio: {
    initial: () => [],
    verbs: { llamar: (w) => (w.def.options?.some((o) => o.id === w.payload) ? same(w, [...w.get(), w.payload]) : INVALID) },
  },
  person: {
    initial: () => [],
    verbs: { hablar: (w) => (w.def.options?.some((o) => o.id === w.payload) ? same(w, [...w.get(), w.payload]) : INVALID) },
  },
  /* escalera: arriba / abajo (para el foso, abajo = adentro) */
  ladder: { initial: () => 'abajo', verbs: { subir: (w) => same(w, 'arriba'), bajar: (w) => same(w, 'abajo') } },
  /* pregunta de la tableta (claridad de caída, rescate): estado = última respuesta */
  quiz: {
    initial: () => null,
    verbs: { responder: (w) => (w.def.options?.some((o) => o.id === w.payload) ? same(w, w.payload) : INVALID) },
  },
  /* equipo con verbos propios: def.verbs = { desmontar: 'desmontado', montar: 'montado' };
     def.from = { verbo: [estados desde los que vale] }; def.requires = { verbo: condición } */
  task: {
    initial: (def) => def.initial ?? null,
    verbs: new Proxy({}, {
      get: (_, verb) => (w) => {
        const to = w.def.verbs?.[verb]
        if (to === undefined) return INVALID
        if (w.def.from?.[verb] && !w.def.from[verb].includes(w.get())) return INVALID
        if (w.def.requires?.[verb] && !w.cond(w.def.requires[verb])) return INVALID
        return same(w, to)
      },
      has: () => true,
    }),
    verbList: (def) => Object.keys(def.verbs || {}),
  },
  /* zona espacial (borde, foso): sin verbos, sirve a { near } */
  zone: { initial: () => null, verbs: {} },
  /* el jugador (objeto implícito 'jugador'): cambiar lo que lleva en la mano */
  player: {
    initial: () => null,
    verbs: {
      mano: (w) => {
        if (w.payload != null && !w.inventory.includes(w.payload)) return INVALID
        w.setHand(w.payload ?? null)
        return true
      },
    },
  },
}

/** verbos válidos de un objeto (para el validador y la interfaz) */
export function verbsOf(def) {
  const k = KINDS[def?.kind]
  if (!k) return []
  return k.verbList ? k.verbList(def) : Object.keys(k.verbs)
}

export { listHas }
