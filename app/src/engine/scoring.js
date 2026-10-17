import { SCORING } from '../scenarios/limits.js'

/*
 * Puntaje (docs/07).  Base = suma de los puntos de los pasos completados (cada escenario suma 100);
 * menos penalizaciones: error menor, mayor, pista usada (práctica, una vez por paso) y reintentos
 * tras un error crítico.  Aprobado = modo evaluación + terminado + puntaje ≥ mínimo + 0 críticos.
 * Aprendizaje y práctica nunca «aprueban»: quedan como entrenamiento.
 */
export function totalPoints(scenario) {
  let t = 0
  for (const ph of scenario.phases) for (const s of ph.steps) t += s.points || 0
  return t
}

export function computeScore({ scenario, done, errors, hinted = 0, retries = 0, mode, finished }, S = SCORING) {
  let base = 0
  for (const ph of scenario.phases) for (const s of ph.steps) if (done.has(s.id)) base += s.points || 0
  const menores = errors.filter((e) => e.severity === 'menor').length
  const mayores = errors.filter((e) => e.severity === 'mayor').length
  const criticos = errors.filter((e) => e.severity === 'critico').length
  const penalty = menores * S.menor + mayores * S.mayor + hinted * S.hint + retries * S.retry
  const score = Math.max(0, Math.min(100, base - penalty))
  const passed = mode === 'evaluacion' && !!finished && score >= S.pass && criticos === 0
  return { base, penalty, score, passed, menores, mayores, criticos }
}
