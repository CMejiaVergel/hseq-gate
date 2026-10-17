import { taskVerbs } from '../interact/handlers.js'
import { C } from './Panel3D.jsx'

/*
 * Contenido del panel de detalle de un objeto, según su kind (documento, diálogo, radio, lista,
 * pregunta, arnés, detector, probador, punto de bloqueo, equipo con verbos).  Devuelve los widgets
 * de Panel3D y la acción que corresponde a cada botón: { widgets, actions: { botónId: [obj, verbo, carga] } }.
 * Lo usan ui/Modal.jsx (y las pruebas de humo para recorrer escenarios por script).
 */
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const fmt = (v, d = 1) => (typeof v === 'number' ? v.toFixed(d).replace('.', ',') : '—')

export function objectPanel(id, run, snap) {
  const def = run.objects[id]
  const st = snap.state[id]
  const W = [{ type: 'title', text: def.label, sub: def.subtitle }]
  const A = {}
  const btn = (key, label, act, extra = {}) => { A[key] = act; return { id: key, label, ...extra } }
  const label = (oid) => run.objects[oid]?.label ?? oid
  const learning = snap.mode === 'aprendizaje'

  switch (def.kind) {
    case 'document': {
      if (def.fields) W.push({ type: 'kv', rows: def.fields.map(([k, v]) => ({ k, v })) })
      if (def.text) W.push({ type: 'text', text: def.text, small: true })
      const stTxt = { pendiente: 'Pendiente de firma', leido: 'Leído · pendiente de firma', firmado: 'Firmado', cerrado: 'Cerrado' }[st] || st
      W.push({ type: 'kv', rows: [{ k: 'Estado', v: stTxt, color: st === 'firmado' ? C.ok : st === 'cerrado' ? C.mute : C.warn }] })
      const items = []
      if (st === 'pendiente' || st === 'leido') items.push(btn('firmar', def.signLabel || 'Firmar', [id, 'firmar'], { color: C.ok, active: true }))
      if (st === 'firmado' && def.closable !== false) items.push(btn('cerrar-doc', def.closeLabel || 'Cerrar el permiso', [id, 'cerrar']))
      if (items.length) W.push({ type: 'buttons', items, cols: items.length })
      break
    }
    case 'person': case 'radio': {
      if (def.text) W.push({ type: 'text', text: def.text, small: true })
      const last = st?.[st.length - 1]
      const lastOpt = def.options.find((o) => o.id === last)
      if (lastOpt?.reply) W.push({ type: 'banner', text: '« ' + lastOpt.reply + ' »', color: '#24476e' })
      W.push({ type: 'buttons', cols: 1, h: 64, font: 20, items: def.options.map((o) => btn('o:' + o.id, o.label, [id, def.kind === 'radio' ? 'llamar' : 'hablar', o.id], { active: st?.includes(o.id) && !learning ? false : st?.includes(o.id) })) })
      break
    }
    case 'checklist': {
      if (def.text) W.push({ type: 'text', text: def.text, small: true })
      W.push({ type: 'buttons', cols: def.cols || 2, h: 58, font: 19, items: def.items.map((it) => btn('i:' + it.id, (st.includes(it.id) ? '☑ ' : '☐ ') + it.label, [id, st.includes(it.id) ? 'desmarcar' : 'marcar', it.id], { active: st.includes(it.id), color: '#2d6a4f' })) })
      break
    }
    case 'quiz': {
      if (def.question) W.push({ type: 'text', text: def.question })
      if (def.data) W.push({ type: 'kv', rows: def.data.map(([k, v, u]) => ({ k, v, u })) })
      W.push({ type: 'buttons', cols: 1, h: 64, font: 20, items: def.options.map((o) => btn('q:' + o.id, o.label, [id, 'responder', o.id], { active: st === o.id })) })
      break
    }
    case 'harness': {
      if (def.text) W.push({ type: 'text', text: def.text, small: true })
      const defective = run.cond(def.defectIf ?? false)
      const dPoint = def.defectPointFrom ? run.variant[def.defectPointFrom] : def.defectPoint
      const rows = (def.points || []).map((p) => {
        const seen = st.inspeccionado.includes(p)
        const bad = seen && defective && p === dPoint
        return btn('p:' + p, `${seen ? (bad ? '✖ ' : '✔ ') : '○ '}${def.pointLabels?.[p] || cap(p)}`, [id, 'inspeccionar', p], { color: bad ? C.bad : '#2d6a4f', active: seen, sub: seen ? (bad ? def.defectText?.[p] || 'Defecto' : 'Sin novedad') : 'Inspeccionar' })
      })
      W.push({ type: 'buttons', cols: 2, h: 70, font: 19, items: rows })
      W.push({ type: 'kv', rows: [{ k: 'Puesto', v: st.puesto ? 'Sí' : 'No' }, { k: 'Ajustado', v: st.ajustado ? 'Sí' : 'No' }] })
      const items = []
      if (!st.puesto) items.push(btn('poner', 'Ponérmelo', [id, 'poner'], { color: C.ok, active: true }))
      else { if (!st.ajustado) items.push(btn('ajustar', 'Ajustar pecho y piernas', [id, 'ajustar'], { color: C.ok, active: true })); items.push(btn('quitar', 'Quitármelo', [id, 'quitar'])) }
      W.push({ type: 'buttons', cols: items.length, items })
      break
    }
    case 'gasdetector': {
      W.push({ type: 'kv', rows: [{ k: 'Encendido', v: st.on ? 'Sí' : 'No', color: st.on ? C.ok : C.mute }, { k: 'Prueba de respuesta (bump)', v: st.bump ? 'Hecha' : 'Pendiente', color: st.bump ? C.ok : C.warn }] })
      const levels = def.levels || Object.keys(st.lecturas)
      for (const lv of levels) {
        const r = st.lecturas[lv]
        if (!r) continue
        W.push({ type: 'kv', rows: [{ k: `${def.levelLabels?.[lv] || cap(lv)} · O₂ / LEL / H₂S / CO`, v: `${fmt(r.o2)} % · ${fmt(r.lel, 0)} % · ${fmt(r.h2s, 0)} · ${fmt(r.co, 0)} ppm`, color: r.ok ? C.ok : C.bad }] })
      }
      const items = [btn('on', st.on ? 'Apagar' : 'Encender', [id, st.on ? 'apagar' : 'encender'], { active: !st.on, color: C.ok }), btn('bump', 'Bump test', [id, 'bump'], { disabled: !st.on })]
      for (const lv of levels) items.push(btn('m:' + lv, 'Medir ' + (def.levelLabels?.[lv] || lv), [id, 'medir', lv], { disabled: !st.on }))
      W.push({ type: 'buttons', cols: 2, items })
      break
    }
    case 'tester': {
      if (def.text) W.push({ type: 'text', text: def.text, small: true })
      if (st.length) W.push({ type: 'list', items: st.slice(-4).map((m) => { const [t, r] = m.split(':'); return { text: `${def.readLabels?.[t] || t}: ${r === 'si' ? 'HAY tensión' : 'sin tensión'}`, mark: r === 'si' ? '⚡' : '○', color: r === 'si' ? C.warn : C.mute } }) })
      W.push({ type: 'buttons', cols: 1, items: Object.keys(def.reads).map((t) => btn('t:' + t, 'Medir: ' + (def.readLabels?.[t] || t), [id, 'medir', t])) })
      break
    }
    case 'lockpoint': {
      const list = Array.isArray(st) ? st : []
      W.push({ type: 'text', text: list.length ? 'Puesto en este punto:' : 'Sin candados ni tarjetas.', small: true })
      if (list.length) W.push({ type: 'buttons', cols: 1, h: 56, font: 19, items: list.map((it) => btn('q:' + it, 'Quitar: ' + label(it), [id, 'quitar', it])) })
      if (snap.hand) W.push({ type: 'buttons', cols: 1, items: [btn('poner', 'Poner: ' + label(snap.hand), [id, 'poner', snap.hand], { active: true, color: C.ok })] })
      else W.push({ type: 'text', text: 'Toma en la mano el candado, la tarjeta o el dispositivo y pulsa A (F en el PC) apuntando aquí.', small: true, color: C.mute })
      break
    }
    case 'task': {
      if (def.text) W.push({ type: 'text', text: def.text, small: true })
      const vs = taskVerbs(def, st)
      W.push({ type: 'buttons', cols: 1, items: vs.map((v) => btn('v:' + v, def.verbLabels?.[v] || cap(v), [id, v])) })
      break
    }
    default:
      W.push({ type: 'text', text: 'Sin acciones.' })
  }
  W.push({ type: 'gap', h: 4 })
  W.push({ type: 'buttons', cols: 1, h: 48, font: 19, items: [{ id: 'cerrar', label: 'Cerrar', bg: 'rgba(255,255,255,0.05)' }] })
  return { widgets: W, actions: A }
}
