import { describe, it, expect } from 'vitest'
import { createRun } from '../../src/engine/runner.js'
import { verbsOf } from '../../src/engine/kinds.js'

/* un escenario mínimo con un objeto de cada kind; un paso inalcanzable para que no termine */
const sc = {
  id: 'kinds', title: 'kinds', version: 1,
  objects: {
    doc: { kind: 'document', label: 'Doc' },
    lista: { kind: 'checklist', label: 'Lista', items: [{ id: 'a' }, { id: 'b' }] },
    br: { kind: 'breaker', label: 'Br', initial: 'on' },
    pb: { kind: 'pushbutton', label: 'Pb' },
    v: { kind: 'valve', label: 'V', initial: 'open' },
    pt: { kind: 'lockpoint', label: 'Pt', preset: ['ajeno'] },
    c1: { kind: 'item', label: 'C1', group: 'candado-personal' },
    t1: { kind: 'item', label: 'T1', group: 'tarjeta' },
    ajeno: { kind: 'item', label: 'Ajeno', initial: 'en:pt' },
    llevado: { kind: 'item', label: 'Llevado', initial: 'inventario' },
    mano: { kind: 'gauge', label: 'PI', reading: 'p' },
    prob: { kind: 'tester', label: 'Probador', reads: { fuente: 'vf', bornera: 'vb' }, dead: { flag: 'descargado' } },
    det: { kind: 'gasdetector', label: 'Det', reading: 'atm', limits: { o2: [19.5, 23.5], lel: 10, h2s: 1, co: 25 } },
    arnes: { kind: 'harness', label: 'Arnés', points: ['costuras', 'argollas'] },
    an: { kind: 'anchor', label: 'Anclaje' },
    bar: { kind: 'barrier', label: 'Barrera' },
    tapa: { kind: 'door', label: 'Tapa' },
    fan: { kind: 'fan', label: 'Ventilador' },
    radio: { kind: 'radio', label: 'Radio', options: [{ id: 'op', label: 'Operador' }] },
    npc: { kind: 'person', label: 'NPC', options: [{ id: 'hola', label: 'Hola' }] },
    esc: { kind: 'ladder', label: 'Escalera' },
    quiz: { kind: 'quiz', label: 'Quiz', options: [{ id: 'si', label: 'Sí', correct: true }, { id: 'no', label: 'No' }] },
    sello: { kind: 'task', label: 'Sello', initial: 'montado', verbs: { desmontar: 'desmontado', montar: 'montado' }, from: { montar: ['desmontado'] } },
    borde: { kind: 'zone', label: 'Borde', segment: [[0, 0], [1, 0]] },
  },
  readings: { p: (s) => (s.v === 'closed' ? 0 : 45), vf: () => 440, vb: (s) => (s.br === 'on' ? 440 : 0), atm: () => ({ fondo: { o2: 18.4, lel: 6, h2s: 14, co: 8 }, arriba: { o2: 20.9, lel: 0, h2s: 0, co: 0 } }) },
  phases: [{ id: 'f', title: 'F', order: 'any', steps: [{ id: 'nunca', title: 'Nunca', done: { flag: 'jamas' }, points: 100 }] }],
}
const mk = () => createRun(sc, { mode: 'aprendizaje' })

describe('kinds', () => {
  it('document: pendiente → leido → firmado → cerrado; transiciones inválidas se ignoran', () => {
    const r = mk()
    expect(r.act('doc', 'cerrar').ok).toBe(false)
    r.act('doc', 'leer'); expect(r.state.doc).toBe('leido')
    r.act('doc', 'firmar'); expect(r.state.doc).toBe('firmado')
    r.act('doc', 'leer'); expect(r.state.doc).toBe('firmado')
    r.act('doc', 'cerrar'); expect(r.state.doc).toBe('cerrado')
    expect(r.act('doc', 'firmar').ok).toBe(false)
  })
  it('checklist: marcar / desmarcar ítems válidos', () => {
    const r = mk()
    r.act('lista', 'marcar', 'a'); r.act('lista', 'marcar', 'a')
    expect(r.state.lista).toEqual(['a'])
    expect(r.act('lista', 'marcar', 'zz').ok).toBe(false)
    r.act('lista', 'desmarcar', 'a'); expect(r.state.lista).toEqual([])
  })
  it('breaker, pushbutton, valve, anchor, barrier, door, fan, ladder', () => {
    const r = mk()
    r.act('br', 'off'); expect(r.state.br).toBe('off')
    r.act('pb', 'start'); expect(r.state.pb).toBe('start')
    r.act('v', 'close'); expect(r.state.v).toBe('closed')
    r.act('an', 'conectar'); expect(r.state.an).toBe('conectado')
    r.act('bar', 'colocar'); expect(r.state.bar).toBe('colocada')
    r.act('tapa', 'abrir'); expect(r.state.tapa).toBe('abierta')
    r.act('fan', 'on'); expect(r.state.fan).toBe('on')
    r.act('esc', 'subir'); expect(r.state.esc).toBe('arriba')
    expect(r.act('v', 'girar').ok).toBe(false)
  })
  it('item y lockpoint: tomar, mano, poner, quitar (también lo ajeno), soltar', () => {
    const r = mk()
    expect(r.inventory).toEqual(['llevado'])
    r.act('c1', 'tomar')
    expect(r.inventory).toContain('c1'); expect(r.hand).toBe('c1'); expect(r.state.c1).toBe('inventario')
    expect(r.act('c1', 'tomar').ok).toBe(false)
    expect(r.act('pt', 'poner', 't1').ok).toBe(false)
    r.act('pt', 'poner', 'c1')
    expect(r.state.pt).toEqual(['ajeno', 'c1']); expect(r.hand).toBe(null); expect(r.state.c1).toBe('en:pt')
    r.act('pt', 'quitar', 'ajeno')
    expect(r.inventory).toContain('ajeno')
    r.act('jugador', 'mano', 'ajeno'); expect(r.hand).toBe('ajeno')
    expect(r.act('jugador', 'mano', 'sello').ok).toBe(false)
    r.act('ajeno', 'soltar'); expect(r.inventory).not.toContain('ajeno'); expect(r.hand).toBe(null)
  })
  it('gauge lee la lectura del momento', () => {
    const r = mk()
    r.act('mano', 'leer'); expect(r.state.mano).toBe(45)
    r.act('v', 'close'); r.act('mano', 'leer'); expect(r.state.mano).toBe(0)
  })
  it('tester: historial de mediciones y probador descargado', () => {
    const r = mk()
    r.act('prob', 'medir', 'fuente'); r.act('prob', 'medir', 'bornera'); r.act('br', 'off'); r.act('prob', 'medir', 'bornera')
    expect(r.state.prob).toEqual(['fuente:si', 'bornera:si', 'bornera:no'])
    expect(r.act('prob', 'medir', 'nada').ok).toBe(false)
    const d = createRun({ ...sc, flags: ['descargado'] })
    d.act('prob', 'medir', 'fuente'); expect(d.state.prob).toEqual(['fuente:no'])
  })
  it('gasdetector: encender, bump, medir por nivel con umbrales', () => {
    const r = mk()
    expect(r.act('det', 'medir', 'fondo').ok).toBe(false)
    expect(r.act('det', 'bump').ok).toBe(false)
    r.act('det', 'encender'); r.act('det', 'bump')
    r.tick(3)
    r.act('det', 'medir', 'arriba'); r.act('det', 'medir', 'fondo')
    expect(r.state.det.bump).toBe(true)
    expect(r.state.det.lecturas.arriba.ok).toBe(true)
    expect(r.state.det.lecturas.fondo.ok).toBe(false)
    expect(r.state.det.hist).toEqual(['arriba', 'fondo'])
    expect(r.state.det.lastT).toBe(3)
  })
  it('harness: inspeccionar puntos, poner, ajustar, quitar', () => {
    const r = mk()
    expect(r.act('arnes', 'ajustar').ok).toBe(false)
    r.act('arnes', 'inspeccionar', 'costuras'); r.act('arnes', 'inspeccionar', 'costuras')
    expect(r.act('arnes', 'inspeccionar', 'otro').ok).toBe(false)
    r.act('arnes', 'poner'); r.act('arnes', 'ajustar')
    expect(r.state.arnes).toEqual({ inspeccionado: ['costuras'], puesto: true, ajustado: true })
    r.act('arnes', 'quitar'); expect(r.state.arnes.puesto).toBe(false)
  })
  it('radio, person y quiz solo aceptan sus opciones', () => {
    const r = mk()
    r.act('radio', 'llamar', 'op'); expect(r.state.radio).toEqual(['op'])
    expect(r.act('radio', 'llamar', 'x').ok).toBe(false)
    r.act('npc', 'hablar', 'hola'); expect(r.state.npc).toEqual(['hola'])
    r.act('quiz', 'responder', 'no'); r.act('quiz', 'responder', 'si'); expect(r.state.quiz).toBe('si')
    expect(r.act('quiz', 'responder', 'quizas').ok).toBe(false)
  })
  it('task: verbos propios y precondiciones', () => {
    const r = mk()
    expect(r.act('sello', 'montar').ok).toBe(false)
    r.act('sello', 'desmontar'); expect(r.state.sello).toBe('desmontado')
    r.act('sello', 'montar'); expect(r.state.sello).toBe('montado')
    expect(r.act('sello', 'volar').ok).toBe(false)
    expect(verbsOf(sc.objects.sello)).toEqual(['desmontar', 'montar'])
    expect(r.act('borde', 'x').ok).toBe(false)
  })
})
