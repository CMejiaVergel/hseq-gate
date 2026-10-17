import { getAdapter } from './db.js'

/*
 * Registros de aprendices e intentos (docs/07).  El esquema del intento:
 *
 *   { id: 'a-<timestamp>-<rand>' (también código de verificación del certificado),
 *     appVersion, scenarioId, scenarioVersion, mode, seed,
 *     trainee: { cedula, nombre, empresa, cargo }, device: 'quest-3s' | 'pc' | 'browser',
 *     startedAt, endedAt, durationSec, score, passed, completed,
 *     steps: [{ id, doneAt, hinted }], errors: [{ id, severity, at, message }],
 *     actions: [{ t, obj, verb, payload }] }      ← traza completa, reproducible con la misma semilla
 */
const db = () => getAdapter()

export const normCedula = (c) => String(c ?? '').replace(/\D/g, '')

/* ---------- aprendices ---------- */
export async function listTrainees() { return (await db().all('trainees')).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')) }
export async function getTrainee(cedula) { return db().get('trainees', normCedula(cedula)) }
export async function saveTrainee(t) {
  const cedula = normCedula(t.cedula)
  if (!cedula) throw new Error('Cédula vacía')
  const rec = { cedula, nombre: String(t.nombre || '').trim(), empresa: String(t.empresa || '').trim(), cargo: String(t.cargo || '').trim() }
  await db().put('trainees', rec)
  return rec
}
/** borra a la persona y todos sus intentos (habeas data, Ley 1581 de 2012) */
export async function deletePerson(cedula) {
  const c = normCedula(cedula)
  await db().del('trainees', c)
  for (const a of await db().all('attempts')) if (a.trainee?.cedula === c) await db().del('attempts', a.id)
}

/* ---------- intentos ---------- */
export const newAttemptId = (now = Date.now()) => `a-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`
export async function saveAttempt(a) { await db().put('attempts', a); return a }
export async function listAttempts() { return (await db().all('attempts')).sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt))) }
export async function getAttempt(id) { return db().get('attempts', id) }
export async function deleteAttempt(id) { return db().del('attempts', id) }

/** mejor puntaje de una persona en un escenario (cualquier modo) */
export async function bestScores(cedula) {
  const c = normCedula(cedula), best = {}
  for (const a of await db().all('attempts')) {
    if (a.trainee?.cedula !== c) continue
    const b = best[a.scenarioId]
    if (!b || a.score > b.score || (a.passed && !b.passed)) best[a.scenarioId] = { score: a.score, passed: a.passed, mode: a.mode }
  }
  return best
}

/** construye el registro del intento a partir del resultado del runner */
export function buildAttempt({ result, scenario, trainee, startedAt, endedAt = new Date(), device, appVersion, id }) {
  return {
    id: id || newAttemptId(),
    appVersion, scenarioId: scenario.id, scenarioVersion: scenario.version, scenarioTitle: scenario.title,
    mode: result.mode, seed: result.seed,
    trainee: { cedula: normCedula(trainee?.cedula) || 'invitado', nombre: trainee?.nombre || '', empresa: trainee?.empresa || '', cargo: trainee?.cargo || '' },
    device,
    startedAt: new Date(startedAt).toISOString(), endedAt: new Date(endedAt).toISOString(),
    durationSec: result.durationSec, score: result.score, passed: result.passed, completed: result.completed,
    criticos: result.criticos, retries: result.retries, hints: result.hints,
    steps: result.steps, errors: result.errors, actions: result.actions,
  }
}
