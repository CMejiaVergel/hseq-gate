import { create } from 'zustand'
import { createRun } from '../engine/runner.js'
import { newSeed } from '../engine/rng.js'
import { SCENARIO_INDEX } from '../scenarios/index.js'
import { useApp } from '../store.js'
import { PLAYER, START } from '../walk/walk.js'
import { buildAttempt, saveAttempt } from '../records/records.js'
import { playConsequence, clearConsequence } from '../world/effects/consequences.js'
import * as S from '../world/effects/sound.js'
import { APP_VERSION } from '../ui/XrOverlays.jsx'

/*
 * Puente motor ↔ React.  El runner (engine/) vive aquí, fuera de React; la interfaz lee una
 * instantánea publicada en zustand (`useRun`) con selectores finos:
 *
 *   useRunState(objId)   estado de un objeto (los componentes 3D se repintan solo si cambia el suyo)
 *   useSnap(sel)         cualquier dato de la instantánea (paso actual, inventario, puntaje…)
 *   act(obj, verbo, x)   la única vía de la interfaz para cambiar el mundo
 *
 * También traduce los eventos del motor a la experiencia: avisos (según el modo, docs/02),
 * sonidos, efectos de consecuencia y el registro del intento al terminar.
 */
export const useRun = create(() => ({ snap: null, consequence: null, n: 0, runId: 0 }))
let RUN = null
let runCounter = 0
let startedAt = null
let tickAcc = 0, pubAcc = 0

export const getRun = () => RUN
export const useSnap = (sel) => useRun((s) => (s.snap ? sel(s.snap) : undefined))
export const useRunState = (id) => useRun((s) => s.snap?.state[id])

/* instantánea con estructura compartida: lo que no cambió conserva su referencia, así los selectores
   de zustand no re-renderizan (ni reconstruyen geometría) los objetos cuyo estado sigue igual */
const sameJSON = (a, b) => a === b || (a && b && typeof a === 'object' && JSON.stringify(a) === JSON.stringify(b))
function share(prev, next) {
  if (!prev) return next
  for (const k of ['inventory', 'done', 'errors', 'flags', 'variant', 'pending', 'step', 'phase', 'score', 'timers']) if (sameJSON(prev[k], next[k])) next[k] = prev[k]
  for (const grp of ['state', 'readings']) {
    const p = prev[grp], n = next[grp]
    let all = true
    for (const k of Object.keys(n)) { if (sameJSON(p[k], n[k])) n[k] = p[k]; else all = false }
    if (all && Object.keys(p).length === Object.keys(n).length) next[grp] = p
  }
  return next
}
function publish() { if (RUN) useRun.setState((s) => ({ snap: share(s.snap, RUN.snapshot()), n: s.n + 1 })) }

const device = () => {
  const st = useApp.getState()
  if (st.inXR) return /OculusBrowser|Quest/i.test(navigator.userAgent) ? 'quest-3s' : 'browser'
  return 'pc'
}

/* ---------- eventos del motor → experiencia ---------- */
function handle(events) {
  const app = useApp.getState()
  const mode = RUN?.mode
  for (const e of events) {
    switch (e.type) {
      case 'step':
        if (mode !== 'evaluacion') { app.showToast('✔ ' + e.step.title, 'ok'); S.okSound() } else S.click()
        break
      case 'error': {
        const def = (RUN.scenario.errors || []).find((x) => x.id === e.error.id)
        if (def?.effect) playConsequence(def.effect)
        if (mode === 'aprendizaje') { app.showToast(`⚠ ${e.error.message}${e.error.explain ? '\n' + e.error.explain : ''}`, e.error.severity); S.warnSound() }
        else if (mode === 'practica') { app.showToast('⚠ ' + e.error.message, e.error.severity); S.warnSound() }
        break
      }
      case 'critical': {
        const dur = playConsequence(e.consequence)
        const scen = RUN.scenario
        const err = (scen.errors || []).find((x) => x.id === e.error.id) || {}
        useRun.setState({ consequence: { name: e.consequence, error: e.error, should: err.should || null, retry: e.retry, stage: 'effect', n: performance.now() } })
        app.openModal(null)
        setTimeout(() => { const c = useRun.getState().consequence; if (c) useRun.setState({ consequence: { ...c, stage: 'panel' } }) }, dur * 1000)
        break
      }
      case 'trigger':
        if (e.trigger.message) app.showToast(e.trigger.message, 'mayor')
        if (e.trigger.sound === 'alarma') S.alarm(5)
        break
      case 'finished':
        onFinished(e)
        break
      default: break
    }
  }
}

async function onFinished(e) {
  const app = useApp.getState()
  const scen = RUN.scenario
  const result = e.result
  const attempt = buildAttempt({ result, scenario: scen, trainee: app.trainee, startedAt, device: device(), appVersion: APP_VERSION })
  app.setLastResult({ ...result, attemptId: attempt.id, scenarioTitle: scen.title, debrief: scen.debrief || [], errorsFull: RUN.errors.slice(), status: RUN.status })
  try { await saveAttempt(attempt) } catch (err) { console.warn('No se pudo guardar el intento', err) }
  /* tras un crítico en evaluación se deja ver la consecuencia; el panel ofrece «Ver resultado» */
  if (!useRun.getState().consequence) toDebrief()
}

export function toDebrief() {
  clearConsequence()
  useRun.setState({ consequence: null })
  const app = useApp.getState()
  app.openModal(null); app.setTablet(false)
  app.setScreen('debrief')
}

/* ---------- ciclo de vida del intento ---------- */
export function startScenario(id, { mode, seed } = {}) {
  const scen = SCENARIO_INDEX[id]
  if (!scen) throw new Error('Escenario desconocido: ' + id)
  const app = useApp.getState()
  clearConsequence()
  RUN = createRun(scen, { mode: mode || app.mode, seed: seed ?? newSeed() })
  startedAt = Date.now()
  tickAcc = 0; pubAcc = 0
  useRun.setState({ consequence: null, runId: ++runCounter, snap: null })
  app.setScenario(id)
  app.setMode(RUN.mode)
  app.openModal(null)
  useApp.setState({ tabletTab: 'paso', tablet: RUN.mode === 'aprendizaje' })
  app.setScreen('escenario')
  app.requestFade()
  publish()
  if (RUN.mode === 'aprendizaje') setTimeout(() => repeatInstruction(), 1200)
  return RUN
}

export function act(obj, verb, payload) {
  if (!RUN) return { ok: false, events: [] }
  const r = RUN.act(obj, verb, payload)
  if (r.ok) { handle(r.events); publish() }
  else if (r.reason === 'requisito' && r.need) { useApp.getState().showToast(r.need, 'info'); S.beep(220, 0.1, 0.2) }
  else if (r.reason === 'bloqueado') { useApp.getState().showToast('🔒 Bloqueado: tiene candado puesto', 'info'); S.beep(220, 0.1, 0.2) }
  return r
}

/** llamado desde la escena en cada cuadro: avanza el tiempo del motor a 10 Hz y publica a ~4 Hz */
export function frameTick(dt) {
  if (!RUN || RUN.status !== 'running') return
  tickAcc += dt; pubAcc += dt
  if (tickAcc < 0.1) return
  const evs = RUN.tick(tickAcc, { player: { x: PLAYER.x, y: PLAYER.y, z: PLAYER.z } })
  tickAcc = 0
  if (evs.length) { handle(evs); publish(); pubAcc = 0 }
  else if (pubAcc > 0.25) { publish(); pubAcc = 0 }
}

export function retry() {
  if (!RUN) return
  const r = RUN.retry()
  clearConsequence()
  useRun.setState({ consequence: null })
  const sp = r?.retry?.spawn
  if (sp) useApp.getState().requestTeleport({ ...sp })
  publish()
  if (RUN.mode === 'aprendizaje') setTimeout(() => repeatInstruction(), 600)
}

export function hint() {
  if (!RUN) return null
  const h = RUN.hint()
  publish()
  return h
}

/** salir del escenario: el intento se registra como abandonado */
export function abandon() {
  if (!RUN) return
  if (RUN.status === 'running' || RUN.status === 'paused') {
    const evs = RUN.abandon()
    for (const e of evs) if (e.type === 'finished') onFinishedSilently(e)
  }
  clearConsequence()
  useRun.setState({ consequence: null })
}
async function onFinishedSilently(e) {
  const app = useApp.getState()
  const attempt = buildAttempt({ result: e.result, scenario: RUN.scenario, trainee: app.trainee, startedAt, device: device(), appVersion: APP_VERSION })
  try { await saveAttempt(attempt) } catch { /* sin almacenamiento */ }
}

export function exitToLobby() {
  abandon()
  RUN = null
  useRun.setState({ snap: null, consequence: null })
  const app = useApp.getState()
  app.openModal(null); app.setTablet(false)
  app.setScreen('lobby')
  app.requestFade()
}

export function restart() {
  const id = RUN?.scenario.id || useApp.getState().scenarioId
  const mode = RUN?.mode
  abandon()
  startScenario(id, { mode })
}

/** repite la instrucción del paso actual (botón X / tecla R) — solo en aprendizaje */
export function repeatInstruction() {
  if (!RUN || RUN.mode !== 'aprendizaje') return
  const s = RUN.currentStep()
  if (s) useApp.getState().showToast('▶ ' + s.title + (s.hint ? '\n' + s.hint : ''), 'info')
}

/** posición de aparición del escenario actual */
export const spawnOf = (scen) => ({ x: scen?.spawn?.x ?? START.x, z: scen?.spawn?.z ?? START.z, y: scen?.spawn?.y ?? 0, yaw: scen?.spawn?.yaw ?? 0 })
