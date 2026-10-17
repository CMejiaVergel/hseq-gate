import { describe, it, expect } from 'vitest'
import demo from '../fixtures/demo.js'
import { play, ofType } from '../helpers/play.js'
import { createRun } from '../../src/engine/runner.js'
import { replay } from '../../src/engine/replay.js'
import { SCORING } from '../../src/scenarios/limits.js'

const FELIZ = [
  ['permiso', 'leer'], ['permiso', 'firmar'], ['candado', 'tomar'],
  ['int-01', 'off'], ['v-01', 'close'], ['punto-int', 'poner', 'candado'],
  ['detector', 'encender'], ['detector', 'medir', 'zona'], ['tapa', 'abrir'],
]

describe('runner — escenario demo', () => {
  it('camino feliz en evaluación: termina, 100 puntos, aprobado', () => {
    const { result, types, run } = play(demo, FELIZ)
    expect(run.status).toBe('finished')
    expect(result.completed).toBe(true)
    expect(result.score).toBe(100)
    expect(result.passed).toBe(true)
    expect(result.errors).toEqual([])
    expect(ofType(play(demo, FELIZ).events, 'step')).toHaveLength(7)
    expect(types.filter((t) => t === 'phase')).toHaveLength(3)
    expect(types).toContain('finished')
  })

  it('fase any: los pasos se completan en cualquier orden', () => {
    const { run } = play(demo, [['candado', 'tomar'], ['permiso', 'firmar']])
    expect(run.isDone('tomar-candado')).toBe(true)
    expect(run.isDone('firmar')).toBe(true)
    expect(run.currentPhase().id).toBe('aislar')
  })

  it('fase strict: un paso posterior adelantado → error fuera-de-orden (menor) y no se completa', () => {
    const { run, result } = play(demo, [['permiso', 'firmar'], ['candado', 'tomar'], ['v-01', 'close']])
    expect(result.errors.map((e) => e.id)).toEqual(['fuera-de-orden'])
    expect(result.errors[0].severity).toBe('menor')
    expect(run.isDone('cerrar-v')).toBe(false)
    /* al llegar su turno se completa solo (el estado ya se cumple) */
    run.act('int-01', 'off')
    expect(run.isDone('abrir-int')).toBe(true)
    expect(run.isDone('cerrar-v')).toBe(true)
  })

  it('paso de una fase futura cumplido antes de tiempo → fuera-de-orden una sola vez', () => {
    const { result } = play(demo, [['permiso', 'firmar'], ['int-01', 'off'], ['int-01', 'on'], ['int-01', 'off']])
    expect(result.errors.filter((e) => e.id === 'fuera-de-orden')).toHaveLength(1)
  })

  it('errores por severidad descuentan puntos', () => {
    const { result } = play(demo, [['int-01', 'off'], ...FELIZ])
    const ids = result.errors.map((e) => e.id)
    expect(ids).toContain('sin-permiso')
    expect(result.mayores).toBe(1)
    expect(result.menores).toBe(1)        // abrir el interruptor estando en la fase de preparación
    expect(result.score).toBe(100 - SCORING.mayor - SCORING.menor)
    expect(result.passed).toBe(true)      // 88 ≥ 80 sin críticos
  })

  it('un error no se repite (una vez por intento)', () => {
    const { result } = play(demo, [['int-01', 'off'], ['int-01', 'on'], ['int-01', 'off']])
    expect(result.errors.filter((e) => e.id === 'sin-permiso')).toHaveLength(1)
  })

  it('crítico en evaluación: consecuencia y fin del intento sin aprobar; la acción no se aplica', () => {
    const { run, result, events } = play(demo, [['permiso', 'firmar'], ['tapa', 'abrir']])
    const crit = ofType(events, 'critical')
    expect(crit).toHaveLength(1)
    expect(crit[0].consequence).toBe('arranque-inesperado')
    expect(run.status).toBe('finished')
    expect(result.passed).toBe(false)
    expect(result.completed).toBe(false)
    expect(run.state.tapa).toBe('cerrada')
    expect(run.act('int-01', 'off').ok).toBe(false)   // ya terminó
  })

  it('crítico en aprendizaje: pausa, reintentar desde el paso (−puntos) y el error vuelve a armarse', () => {
    const run = createRun(demo, { mode: 'aprendizaje' })
    run.act('permiso', 'firmar')
    const r = run.act('tapa', 'abrir')
    expect(r.cancelled).toBe(true)
    expect(run.status).toBe('paused')
    expect(run.pending.id).toBe('tapa-sin-aislar')
    expect(run.act('candado', 'tomar').ok).toBe(false)  // en pausa no se actúa
    run.retry()
    expect(run.status).toBe('running')
    run.act('tapa', 'abrir')
    expect(run.status).toBe('paused')                   // se vuelve a disparar
    run.retry()
    for (const a of FELIZ.slice(2)) run.act(...a)
    const res = run.result()
    expect(res.completed).toBe(true)
    expect(res.retries).toBe(2)
    expect(res.criticos).toBe(2)
    expect(res.score).toBe(100 - 2 * SCORING.retry)
    expect(res.passed).toBe(false)                      // aprendizaje nunca aprueba
  })

  it('práctica: la pista cuesta puntos una vez por paso; en evaluación no hay pistas', () => {
    const run = createRun(demo, { mode: 'practica' })
    expect(run.hint()).toMatch(/permiso/i)
    run.hint()
    for (const a of FELIZ) run.act(...a)
    expect(run.result().score).toBe(100 - SCORING.hint)
    expect(run.result().steps.find((s) => s.id === 'firmar').hinted).toBe(true)
    expect(createRun(demo, { mode: 'evaluacion' }).hint()).toBe(null)
    const ap = createRun(demo, { mode: 'aprendizaje' })
    ap.hint()
    for (const a of FELIZ) ap.act(...a)
    expect(ap.result().score).toBe(100)
  })

  it('acciones inválidas se ignoran sin error ni traza', () => {
    const run = createRun(demo, { mode: 'evaluacion' })
    expect(run.act('nadie', 'x').ok).toBe(false)
    expect(run.act('v-01', 'volar').ok).toBe(false)
    expect(run.act('punto-int', 'poner', 'candado').ok).toBe(false)   // no lo tiene
    expect(run.result().actions).toEqual([])
    expect(run.errors).toEqual([])
  })

  it('abandonar termina sin aprobar', () => {
    const run = createRun(demo, { mode: 'evaluacion' })
    run.act('permiso', 'firmar')
    run.abandon()
    expect(run.status).toBe('abandoned')
    expect(run.result().passed).toBe(false)
  })

  it('snapshot serializable con paso actual, puntaje y estado', () => {
    const run = createRun(demo, { mode: 'aprendizaje' })
    const s = run.snapshot()
    expect(s.step.id).toBe('firmar')
    expect(s.step.targets).toEqual(['permiso'])
    expect(JSON.parse(JSON.stringify(s)).state['v-01']).toBe('open')
    expect(s.score.score).toBe(0)
  })

  it('reproducción desde la traza: mismo resultado', () => {
    const run = createRun(demo, { mode: 'aprendizaje', seed: 7 })
    run.act('permiso', 'firmar'); run.tick(2); run.act('tapa', 'abrir'); run.retry()
    for (const a of FELIZ.slice(2)) { run.tick(1.5); run.act(...a) }
    const rec = run.result()
    const again = replay(demo, rec).result()
    expect(again.score).toBe(rec.score)
    expect(again.errors).toEqual(rec.errors)
    expect(again.steps).toEqual(rec.steps)
  })
})

/* ---------- reglas generales con escenarios mínimos ---------- */
const mini = (extra = {}) => ({
  id: 'mini', title: 'Mini', version: 1,
  objects: { v: { kind: 'valve', label: 'V', initial: 'open' }, fan: { kind: 'fan', label: 'F' }, borde: { kind: 'zone', label: 'Borde', segment: [[0, 0], [4, 0]], y: 6 }, an: { kind: 'anchor', label: 'A' }, pb: { kind: 'pushbutton', label: 'PB' }, motor: { kind: 'task', label: 'Motor', initial: 'stopped', verbs: {} } },
  phases: [{ id: 'f', title: 'F', order: 'strict', steps: [{ id: 'cerrar', title: 'Cerrar', done: { state: ['v', 'closed'] }, points: 50 }, { id: 'vent', title: 'Ventilar', done: { timer: ['vent', '>=', 10] }, points: 50 }] }],
  timers: { vent: { while: { state: ['fan', 'on'] } } },
  ...extra,
})

describe('runner — tiempo, zonas, efectos, determinismo', () => {
  it('temporizadores avanzan solo mientras su condición se cumple y completan pasos', () => {
    const run = createRun(mini(), { mode: 'evaluacion' })
    run.act('v', 'close')
    run.tick(5)
    expect(run.snapshot().timers.vent).toBe(0)
    run.act('fan', 'on')
    run.tick(6); expect(run.isDone('vent')).toBe(false)
    run.tick(5); expect(run.isDone('vent')).toBe(true)
    expect(run.status).toBe('finished')
  })

  it('disparadores: una vez, tras su retardo', () => {
    const sc = mini({ triggers: [{ id: 'alarma', when: { state: ['fan', 'on'] }, delay: 3, flag: 'alarma', set: { v: 'open' } }] })
    const run = createRun(sc, { mode: 'aprendizaje' })
    const evs = []
    run.on('trigger', (e) => evs.push(e))
    run.act('fan', 'on'); run.tick(2); expect(run.flags.has('alarma')).toBe(false)
    run.tick(1.5); expect(run.flags.has('alarma')).toBe(true)
    run.tick(5)
    expect(evs).toHaveLength(1)
  })

  it('errores por tiempo con zona (near): crítico al entrar sin conexión; reintento lo rearma', () => {
    const sc = mini({ errors: [{ id: 'borde', on: 'tick', when: { all: [{ near: ['borde', 1.5] }, { not: { state: ['an', 'conectado'] } }] }, severity: 'critico', consequence: 'caida', explain: 'x', message: 'Caíste', retry: { spawn: { x: 0, z: 5, y: 6 } } }] })
    const run = createRun(sc, { mode: 'practica' })
    run.tick(0.1, { player: { x: 2, y: 6, z: 4 } }); expect(run.status).toBe('running')
    run.tick(0.1, { player: { x: 2, y: 6, z: 1 } }); expect(run.status).toBe('paused')
    expect(run.retry().retry.spawn.z).toBe(5)
    run.act('an', 'conectar')
    run.tick(0.1, { player: { x: 2, y: 6, z: 1 } }); expect(run.status).toBe('running')
    run.act('an', 'desconectar')
    run.tick(0.1, { player: { x: 2, y: 6, z: 1 } }); expect(run.status).toBe('paused')
  })

  it('efectos encadenados y errores evaluados después de la acción (after)', () => {
    const sc = mini({
      effects: [{ on: { act: ['pb', 'start'] }, when: { state: ['v', 'open'] }, set: { motor: 'running' }, flag: 'arranco' }],
      errors: [{ id: 'arranque', after: true, on: { act: ['pb', 'start'] }, when: { state: ['motor', 'running'] }, severity: 'mayor', message: 'Arrancó' }],
    })
    const run = createRun(sc, { mode: 'aprendizaje' })
    run.act('pb', 'start')
    expect(run.state.motor).toBe('running')
    expect(run.flags.has('arranco')).toBe(true)
    expect(run.errors.map((e) => e.id)).toEqual(['arranque'])
  })

  it('determinismo: misma semilla → mismas variantes; distinta semilla puede cambiar', () => {
    const sc = mini({ variants: (rng) => ({ orden: rng.shuffle(['a', 'b', 'c', 'd', 'e']), n: rng.int(1000) }) })
    const a = createRun(sc, { seed: 42 }).variant, b = createRun(sc, { seed: 42 }).variant
    expect(a).toEqual(b)
    const distintas = new Set([1, 2, 3, 4, 5].map((s) => JSON.stringify(createRun(sc, { seed: s }).variant)))
    expect(distintas.size).toBeGreaterThan(1)
  })
})
