import { createRun } from '../../src/engine/runner.js'

/*
 * play(escenario, acciones, { mode, seed }) → { run, result, events }
 * Cada acción: ['obj', 'verbo', carga?] · { tick: s, player? } · 'retry'
 */
export function play(scenario, actions, opts = {}) {
  const run = createRun(scenario, { mode: opts.mode ?? 'evaluacion', seed: opts.seed ?? 1 })
  const events = []
  run.on('*', (e) => events.push(e))
  for (const a of actions) {
    if (a === 'retry') run.retry()
    else if (Array.isArray(a)) run.act(a[0], a[1], a[2])
    else if (a && a.tick != null) run.tick(a.tick, { player: a.player })
  }
  return { run, result: run.result(), events, types: events.map((e) => e.type) }
}
export const ofType = (events, t) => events.filter((e) => e.type === t)
