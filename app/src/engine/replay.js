import { createRun } from './runner.js'

/*
 * Reproduce un intento desde su traza (docs/07): misma semilla, mismo modo, mismas acciones en
 * los mismos instantes.  La traza guarda también muestras de la posición del jugador ('_pos')
 * y los reintentos tras un crítico ('_retry'), así las reglas espaciales vuelven a dispararse.
 */
export function replay(scenario, record) {
  const run = createRun(scenario, { mode: record.mode, seed: record.seed })
  const player = { ...run.player }
  for (const a of record.actions || []) {
    const dt = a.t - run.time
    if (a.obj === '_pos') {
      player.x = a.p[0]; player.y = a.p[1]; player.z = a.p[2]
      run.tick(dt > 1e-6 ? dt : 1e-4, { player })
      continue
    }
    if (dt > 1e-6) run.tick(dt, { player })
    if (a.obj === '_retry') run.retry()
    else run.act(a.obj, a.verb, a.payload)
  }
  return run
}
