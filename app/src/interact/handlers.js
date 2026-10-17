import { HANDLERS } from '../scene/actions.js'
import { haptic } from '../scene/interact.js'
import { useApp } from '../store.js'
import { act, getRun, repeatInstruction } from '../run/bridge.js'
import { verbsOf } from '../engine/kinds.js'
import * as S from '../world/effects/sound.js'

/*
 * Traduce los controles del jugador (gatillo, grip, A, B, X, escaleras) a acciones del motor
 * según el kind del objeto apuntado (docs/06).  Los objetos con varias decisiones (documentos,
 * diálogos, inspección del arnés, detector, punto de bloqueo…) abren su panel de detalle.
 *
 * Una malla de selección puede llevar userData.verb (p. ej. los dos botones de una botonera).
 */
const PANEL_KINDS = new Set(['document', 'person', 'radio', 'checklist', 'quiz', 'harness', 'gasdetector', 'tester', 'lockpoint'])
const TOGGLES = {
  valve: (s) => (s === 'closed' ? 'open' : 'close'),
  breaker: (s) => (s === 'off' ? 'on' : 'off'),
  anchor: (s) => (s === 'conectado' ? 'desconectar' : 'conectar'),
  barrier: (s) => (s === 'colocada' ? 'retirar' : 'colocar'),
  door: (s) => (s === 'abierta' ? 'cerrar' : 'abrir'),
  fan: (s) => (s === 'on' ? 'off' : 'on'),
}

/** verbos de un `task` que tienen sentido desde su estado actual */
export function taskVerbs(def, cur) {
  return verbsOf(def).filter((v) => def.verbs[v] !== cur && (!def.from?.[v] || def.from[v].includes(cur)))
}

export function triggerObj(obj, verbOverride) {
  const run = getRun()
  const def = run?.objects[obj]
  if (!def) return
  S.unlockAudio()
  const cur = run.state[obj]
  const app = useApp.getState()
  let r = null
  if (verbOverride) r = act(obj, verbOverride)
  else if (PANEL_KINDS.has(def.kind)) {
    if (def.kind === 'document') act(obj, 'leer')
    app.openModal(obj)
    S.click()
  } else if (TOGGLES[def.kind]) r = act(obj, TOGGLES[def.kind](cur))
  else if (def.kind === 'item') { if (cur === 'sitio') r = act(obj, 'tomar') }
  else if (def.kind === 'gauge') { r = act(obj, 'leer'); const v = getRun().state[obj]; app.showToast(`${def.label}: ${v} ${def.unit || ''}`.trim(), 'info') }
  else if (def.kind === 'pushbutton') r = act(obj, 'start')
  else if (def.kind === 'task') {
    const vs = taskVerbs(def, cur)
    if (vs.length === 1) r = act(obj, vs[0])
    else if (vs.length > 1) app.openModal(obj)
  } else if (def.kind === 'ladder') { /* las escaleras se usan con A / F */ app.showToast('Escalera: acércate y pulsa A (F en el PC)', 'info') }
  if (r?.ok) { haptic('right', 0.6, 50); S.click() } else if (r && !r.ok) S.beep(220, 0.08, 0.15)
}

HANDLERS.trigger = (hit) => {
  if (typeof hit === 'string') triggerObj(hit)
  else if (hit?.obj) triggerObj(hit.obj, hit.verb)
}

/** grip / E: tomar lo apuntado; si no apunta a nada tomable, soltar lo que tiene en la mano */
HANDLERS.grip = (obj) => {
  const run = getRun()
  if (!run) return
  const def = obj && run.objects[obj]
  if (def?.kind === 'item' && run.state[obj] === 'sitio') { act(obj, 'tomar'); haptic('right', 0.5, 40); S.click(); return }
  if (run.hand) {
    const h = run.hand
    const r = act(h, 'soltar')
    if (r.ok) useApp.getState().showToast('Soltaste: ' + run.objects[h].label, 'info')
  }
}

/** A / F: usar lo que hay en la mano sobre lo apuntado */
HANDLERS.use = (obj) => {
  const run = getRun()
  if (!run) return
  const h = run.hand
  const def = obj && run.objects[obj]
  const app = useApp.getState()
  if (!def) { if (h) app.showToast('Apunta al objeto donde quieres usar: ' + run.objects[h].label, 'info'); return }
  if (!h) { triggerObj(obj); return }
  let r
  if (def.kind === 'lockpoint') r = act(obj, 'poner', h)
  else if (def.kind === 'anchor') r = act(obj, 'conectar')
  else if (def.kind === 'tester' || run.objects[h].kind === 'tester') r = act(run.objects[h].kind === 'tester' ? h : obj, 'medir', run.objects[h].kind === 'tester' ? def.measureAs || obj : h)
  else r = act(h, 'usar', obj)
  if (r?.ok) { haptic('right', 0.7, 60); S.click() } else S.beep(220, 0.08, 0.15)
}

/** B / Q: siguiente objeto del inventario a la mano */
HANDLERS.cycle = () => {
  const run = getRun()
  if (!run || !run.inventory.length) return
  const inv = run.inventory
  const i = inv.indexOf(run.hand)
  const next = i + 1 >= inv.length ? null : inv[i + 1]
  act('jugador', 'mano', next)
  useApp.getState().showToast(next ? 'En la mano: ' + run.objects[next].label : 'Mano libre', 'info')
}

HANDLERS.repeat = () => repeatInstruction()

/** escaleras: si la escalera es un objeto del escenario, la acción pasa por el motor (puede ser un error crítico) */
HANDLERS.climb = (c, toTop) => {
  const run = getRun()
  if (!run || !c.obj || !run.objects[c.obj]) return true
  const r = act(c.obj, toTop ? (c.upVerb || 'subir') : (c.downVerb || 'bajar'))
  return !r.cancelled && run.status !== 'finished'
}
