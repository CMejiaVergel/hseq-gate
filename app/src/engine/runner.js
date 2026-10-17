import { evalCond, listHas } from './conditions.js'
import { KINDS, INVALID } from './kinds.js'
import { createRng } from './rng.js'
import { computeScore } from './scoring.js'

/*
 * Runner: ejecuta un escenario (docs/02).  JS puro, sin React ni three.js: así cada escenario se
 * prueba entero con vitest.
 *
 *   const run = createRun(scenario, { mode, seed })
 *   run.act(objId, verb, payload)   → { ok, events }      única forma de cambiar el mundo
 *   run.tick(dt, { player })        → events               tiempo: temporizadores, disparadores, zonas
 *   run.hint()                      → texto de la pista del paso actual (en práctica cuesta puntos)
 *   run.retry()                     → tras un crítico (aprendizaje/práctica): sigue desde el paso
 *   run.abandon()                   → termina el intento sin aprobar
 *   run.snapshot() / run.result()   → estado serializable / resultado para el registro
 *   run.on(evento, fn)              → 'step' 'phase' 'error' 'critical' 'finished' 'state' 'trigger'
 *
 * Al recibir una acción: (1) verbo válido para el kind, si no se ignora; (2) errores cuyo `on`
 * coincide y cuyo `when` se cumple ANTES de la acción (o después, con `after: true`); un crítico
 * cancela la acción; (3) cambio de estado + `effects` + lecturas; (4) pasos: en `strict` solo el
 * siguiente (uno posterior que se cumpla antes = error «fuera-de-orden»), en `any` cualquiera;
 * (5) última fase → 'finished'.
 */

const ORDER_ERROR = 'fuera-de-orden'
/* grupos de items que, puestos en un punto de bloqueo, impiden operar el equipo (def.lockedBy) */
const LOCK_GROUPS = ['candado-personal', 'candado-prestado', 'candado-ajeno', 'cubre-volante']

/** sustituye '$obj' y '$payload' en una condición por los de la acción que se evalúa */
function bind(c, obj, payload) {
  if (c == null || typeof c !== 'object') return c === '$obj' ? obj : c === '$payload' ? payload : c
  if (Array.isArray(c)) return c.map((x) => bind(x, obj, payload))
  const o = {}
  for (const k of Object.keys(c)) o[k] = bind(c[k], obj, payload)
  return o
}
const hasBinding = (c) => c != null && JSON.stringify(c).includes('"$')
const clone = (v) => (v == null || typeof v !== 'object' ? v : JSON.parse(JSON.stringify(v)))

/** ¿la acción coincide con el patrón [obj | [objs] | '*', verbo, carga?] ? */
function matchAct(pat, obj, verb, payload, objects) {
  if (!pat) return false
  /* lista de patrones: todos sus elementos son arreglos (un patrón suelto tiene el verbo en texto) */
  if (pat.every(Array.isArray)) return pat.some((p) => matchAct(p, obj, verb, payload, objects))
  const [po, pv, pp] = pat
  if (po !== '*' && (Array.isArray(po) ? !po.includes(obj) : po !== obj)) return false
  if (pv !== '*' && pv !== verb) return false
  if (pat.length >= 3 && pp !== undefined) {
    if (Array.isArray(pp)) return pp.some((x) => x === payload || objects[payload]?.group === x)
    return pp === payload || objects[payload]?.group === pp
  }
  return true
}

export function createRun(scenario, { mode = 'aprendizaje', seed = 1 } = {}) {
  const objects = { jugador: { kind: 'player', label: 'Jugador' }, ...scenario.objects }
  const rng = createRng(seed)
  const variant = scenario.variants ? scenario.variants(rng, mode) || {} : {}

  /* ---- estado ---- */
  const state = {}
  for (const [id, def] of Object.entries(objects)) {
    const k = KINDS[def.kind]
    if (!k) throw new Error(`Objeto ${id}: kind desconocido «${def.kind}»`)
    state[id] = clone(def.initial !== undefined && def.kind !== 'lockpoint' ? def.initial : k.initial(def))
  }
  if (scenario.setup) scenario.setup({ state, variant, mode })     // ajustes iniciales según la variante
  let inventory = Object.keys(objects).filter((id) => objects[id].kind === 'item' && state[id] === 'inventario')
  let hand = null
  const flags = new Set(scenario.flags || [])
  const done = new Map()            // stepId → { at, hinted }
  const phasesDone = new Set()
  const errors = []                 // { id, severity, at, message, explain, consequence }
  const fired = new Set()
  const outOfOrder = new Set()
  const prevTrue = new Map()        // stepId → última evaluación (para detectar transiciones)
  const hintedSteps = new Set()
  const timers = {}
  for (const k of Object.keys(scenario.timers || {})) timers[k] = 0
  const triggered = new Set()
  const triggerAcc = {}
  const actions = []
  const player = { x: scenario.spawn?.x ?? 0, y: scenario.spawn?.y ?? 0, z: scenario.spawn?.z ?? 0 }
  let time = 0
  let phaseIndex = 0
  let status = 'running'            // running | paused | finished | abandoned
  let pending = null                // error crítico que pausó el intento
  let retries = 0
  let finishedAt = null
  let readings = {}
  let lastPos = null                // última posición muestreada en la traza (para reproducir zonas)

  const listeners = {}
  const emit = (evs, type, data) => { const e = { type, ...data }; evs.push(e); for (const fn of listeners[type] || []) fn(e); for (const fn of listeners['*'] || []) fn(e) }

  const ctx = () => ({ state, flags, readings, done: doneSet, inventory, hand, player, objects, timers, time, mode, variant, phasesDone })
  const doneSet = { has: (id) => done.has(id) }
  const rctx = () => ({ variant, timers, flags, time, mode, done: doneSet, objects })
  const computeReadings = () => {
    const r = {}
    for (const [k, fn] of Object.entries(scenario.readings || {})) r[k] = fn(state, rctx())
    readings = r
  }
  computeReadings()
  const cond = (c) => evalCond(c, ctx())

  /* ---- errores ---- */
  function fireError(evs, err) {
    const severity = err.severity || 'menor'
    const rec = { id: err.id, severity, at: +time.toFixed(2), message: err.message, explain: err.explain, consequence: err.consequence || null, phase: currentPhase()?.id ?? null }
    errors.push(rec)
    if (!err.repeat) fired.add(err.id)
    if (severity === 'critico') {
      emit(evs, 'critical', { error: rec, consequence: rec.consequence, retry: err.retry || null })
      if (mode === 'evaluacion') finish(evs, false)
      else { status = 'paused'; pending = { ...rec, retry: err.retry || null } }
    } else emit(evs, 'error', { error: rec })
    return severity === 'critico'
  }
  function checkErrors(evs, match, after, act) {
    for (const err of scenario.errors || []) {
      if (status !== 'running') return true
      if (!!err.after !== after || fired.has(err.id)) continue
      if (!match(err.on)) continue
      const w = err.when ?? true
      if (!cond(act && hasBinding(w) ? bind(w, act.obj, act.payload) : w)) continue
      if (fireError(evs, err)) return true
    }
    return false
  }

  /* ---- pasos y fases ---- */
  const currentPhase = () => scenario.phases[phaseIndex]
  function currentStep() {
    const ph = currentPhase()
    if (!ph) return null
    return ph.steps.find((s) => !done.has(s.id)) || null
  }
  const stepCond = (s, act) => {
    if (s.on) return act ? matchAct(s.on.act, act.obj, act.verb, act.payload, objects) && cond(s.when ?? true) : false
    return cond(s.done)
  }
  function complete(evs, s) {
    done.set(s.id, { at: +time.toFixed(2), hinted: hintedSteps.has(s.id) })
    emit(evs, 'step', { step: { id: s.id, title: s.title, points: s.points || 0 }, phase: currentPhase().id })
  }
  function flagOrder(evs, s) {
    if (outOfOrder.has(s.id)) return
    outOfOrder.add(s.id)
    const expected = currentStep()
    fireError(evs, {
      id: ORDER_ERROR, repeat: true, severity: scenario.orderSeverity || 'menor',
      message: `Paso fuera de orden: «${s.title}»` + (expected ? ` antes de «${expected.title}».` : '.'),
      explain: 'El procedimiento tiene un orden: cada paso protege al siguiente.',
    })
  }
  function evalSteps(evs, act) {
    let guard = 0
    while (status === 'running' && guard++ < 200) {
      const ph = currentPhase()
      if (!ph) { finish(evs, true); return }
      let progressed = false
      if (ph.order === 'strict') {
        const next = currentStep()
        if (next && stepCond(next, act)) { complete(evs, next); progressed = true }
        else if (next) {
          for (const s of ph.steps) {
            if (done.has(s.id) || s === next || s.on) continue
            const v = stepCond(s, null)
            if (v && !prevTrue.get(s.id)) flagOrder(evs, s)
            prevTrue.set(s.id, v)
          }
        }
      } else {
        for (const s of ph.steps) if (!done.has(s.id) && stepCond(s, act)) { complete(evs, s); progressed = true }
      }
      if (ph.steps.every((s) => done.has(s.id))) {
        phasesDone.add(ph.id)
        emit(evs, 'phase', { phase: { id: ph.id, title: ph.title } })
        phaseIndex++
        continue
      }
      if (!progressed) break
    }
    /* pasos de fases futuras que se cumplen antes de tiempo → fuera de orden (una vez por paso) */
    if (status !== 'running' || scenario.flagFutureSteps === false) return
    for (let i = phaseIndex + 1; i < scenario.phases.length; i++) {
      for (const s of scenario.phases[i].steps) {
        if (s.on || s.noOrder) continue
        const v = stepCond(s, null)
        if (v && prevTrue.get(s.id) === false) flagOrder(evs, s)
        prevTrue.set(s.id, v)
      }
    }
  }
  /* estado inicial de las transiciones (lo que ya es cierto al empezar no cuenta como «fuera de orden») */
  for (const ph of scenario.phases) for (const s of ph.steps) if (!s.on) prevTrue.set(s.id, !!evalCond(s.done, ctx()))

  function finish(evs, completed) {
    if (status === 'finished' || status === 'abandoned') return
    status = completed ? 'finished' : (mode === 'evaluacion' && errors.some((e) => e.severity === 'critico') ? 'finished' : 'abandoned')
    finishedAt = time
    emit(evs, 'finished', { result: result(), completed })
  }

  /* ---- borrador del mundo para aplicar un verbo ---- */
  function applyVerb(obj, verb, payload) {
    const def = objects[obj]
    const kind = KINDS[def?.kind]
    if (!kind) return null
    const fn = kind.verbs[verb]
    if (typeof fn !== 'function') return null
    const draft = { state: { ...state }, inventory: [...inventory], hand }
    const w = {
      id: obj, def, payload, objects, readings, time,
      get state() { return draft.state }, get inventory() { return draft.inventory }, get hand() { return draft.hand },
      get: () => draft.state[obj],
      set: (v) => { draft.state[obj] = v },
      setOf: (id, v) => { draft.state[id] = v },
      give: (it) => { if (!draft.inventory.includes(it)) draft.inventory.push(it) },
      take: (it) => { draft.inventory = draft.inventory.filter((x) => x !== it); if (draft.hand === it) draft.hand = null },
      setHand: (it) => { draft.hand = it },
      cond,
    }
    const r = fn(w)
    if (r === INVALID || r === false) return null
    return draft
  }

  /* ---- API ---- */
  function act(obj, verb, payload) {
    const evs = []
    if (status !== 'running') return { ok: false, events: evs, reason: status }
    const def = objects[obj]
    if (def?.lockedBy && (state[def.lockedBy] || []).some((it) => LOCK_GROUPS.includes(objects[it]?.group))) return { ok: false, events: evs, reason: 'bloqueado' }
    if (def?.requires?.[verb] && !cond(def.requires[verb])) return { ok: false, events: evs, reason: 'requisito', need: def.requiresText?.[verb] || null }
    const draft = applyVerb(obj, verb, payload)
    if (!draft) return { ok: false, events: evs, reason: 'invalido' }
    actions.push(payload === undefined ? { t: +time.toFixed(2), obj, verb } : { t: +time.toFixed(2), obj, verb, payload })
    const match = (on) => on && on.act && matchAct(on.act, obj, verb, payload, objects)
    /* (2) errores previos a la acción: un crítico la cancela */
    if (checkErrors(evs, match, false, { obj, payload })) { emit(evs, 'state', {}); return { ok: true, cancelled: true, events: evs } }
    /* (3) aplicar */
    Object.assign(state, draft.state); inventory = draft.inventory; hand = draft.hand
    computeReadings()
    for (const ef of scenario.effects || []) {
      if (!matchAct(ef.on?.act, obj, verb, payload, objects) || !cond(ef.when ?? true)) continue
      if (ef.set) Object.assign(state, clone(ef.set))
      if (ef.flag) flags.add(ef.flag)
      if (ef.unflag) flags.delete(ef.unflag)
      computeReadings()
    }
    if (checkErrors(evs, match, true, { obj, payload })) { emit(evs, 'state', {}); return { ok: true, events: evs } }
    /* (4) pasos */
    evalSteps(evs, { obj, verb, payload })
    emit(evs, 'state', {})
    return { ok: true, events: evs }
  }

  function tick(dt, opts = {}) {
    const evs = []
    if (opts.player) Object.assign(player, opts.player)
    if (status !== 'running' || !(dt > 0)) return evs
    time += dt
    if (opts.player && (!lastPos || Math.hypot(player.x - lastPos[0], (player.y ?? 0) - lastPos[1], player.z - lastPos[2]) > 0.4)) {
      lastPos = [+player.x.toFixed(2), +(player.y ?? 0).toFixed(2), +player.z.toFixed(2)]
      actions.push({ t: +time.toFixed(2), obj: '_pos', p: lastPos })
    }
    for (const [k, t] of Object.entries(scenario.timers || {})) {
      if (cond(t.while ?? true)) timers[k] += dt
      else if (t.reset) timers[k] = 0
    }
    for (const tr of scenario.triggers || []) {
      if (triggered.has(tr.id)) continue
      if (cond(tr.when ?? true)) {
        triggerAcc[tr.id] = (triggerAcc[tr.id] || 0) + dt
        if (triggerAcc[tr.id] >= (tr.delay || 0)) {
          triggered.add(tr.id)
          if (tr.set) Object.assign(state, clone(tr.set))
          if (tr.flag) flags.add(tr.flag)
          emit(evs, 'trigger', { trigger: { id: tr.id, message: tr.message || null } })
        }
      } else if (!tr.keep) triggerAcc[tr.id] = 0
    }
    computeReadings()
    if (checkErrors(evs, (on) => on === 'tick', false)) { emit(evs, 'state', {}); return evs }
    evalSteps(evs, null)
    return evs
  }

  function hint() {
    if (status !== 'running' || mode === 'evaluacion') return null
    const s = currentStep()
    if (!s) return null
    if (mode === 'practica') hintedSteps.add(s.id)
    return s.hint || s.title
  }

  function retry() {
    if (status !== 'paused') return null
    status = 'running'
    retries++
    actions.push({ t: +time.toFixed(2), obj: '_retry' })
    const p = pending
    pending = null
    fired.delete(p.id)          // el error crítico vuelve a estar «armado»
    return { retry: p.retry, error: p }
  }

  function abandon() { const evs = []; if (status === 'running' || status === 'paused') { status = 'running'; finish(evs, false) } return evs }

  function score() {
    return computeScore({ scenario, done, errors, hinted: [...hintedSteps].length, retries, mode, finished: status === 'finished' && phaseIndex >= scenario.phases.length })
  }

  function result() {
    const sc = score()
    return {
      scenarioId: scenario.id, scenarioVersion: scenario.version, mode, seed,
      completed: phaseIndex >= scenario.phases.length,
      score: sc.score, passed: sc.passed, base: sc.base, penalty: sc.penalty,
      criticos: sc.criticos, mayores: sc.mayores, menores: sc.menores,
      durationSec: Math.round(finishedAt ?? time), hints: hintedSteps.size, retries,
      steps: [...done.entries()].map(([id, d]) => ({ id, doneAt: d.at, hinted: d.hinted })),
      errors: errors.map((e) => ({ id: e.id, severity: e.severity, at: e.at, message: e.message })),
      actions: actions.slice(),
    }
  }

  function snapshot() {
    const step = currentStep()
    return {
      status, mode, seed, time, phaseIndex, variant,
      phase: currentPhase() ? { id: currentPhase().id, title: currentPhase().title, order: currentPhase().order } : null,
      step: step ? { id: step.id, title: step.title, hint: step.hint, targets: step.targets || [] } : null,
      state: clone(state), flags: [...flags], done: [...done.keys()], inventory: [...inventory], hand,
      errors: errors.slice(), readings: clone(readings), timers: { ...timers }, pending, score: score(),
    }
  }

  function on(type, fn) { (listeners[type] ||= []).push(fn); return () => { listeners[type] = listeners[type].filter((f) => f !== fn) } }

  return {
    scenario, objects, variant, mode, seed,
    act, tick, hint, retry, abandon, snapshot, result, on, score,
    currentStep, currentPhase,
    get state() { return state }, get inventory() { return inventory }, get hand() { return hand },
    get flags() { return flags }, get readings() { return readings }, get errors() { return errors },
    get status() { return status }, get time() { return time }, get pending() { return pending },
    get phaseIndex() { return phaseIndex }, get player() { return player },
    isDone: (id) => done.has(id), cond, listHas: (list, v) => listHas(list, v, objects),
  }
}
