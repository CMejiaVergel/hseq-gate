import { describe, it, expect } from 'vitest'
import demo from '../fixtures/demo.js'
import { validate } from '../../src/engine/validate.js'
import { computeScore, totalPoints } from '../../src/engine/scoring.js'
import { SCORING } from '../../src/scenarios/limits.js'

const clone = (o) => ({ ...o, objects: { ...o.objects }, phases: o.phases.map((p) => ({ ...p, steps: p.steps.map((s) => ({ ...s })) })), errors: [...o.errors] })

describe('validador', () => {
  it('el escenario demo es válido', () => {
    expect(validate(demo)).toEqual([])
  })
  it('detecta ids repetidos, referencias rotas, verbos inválidos y puntos que no suman 100', () => {
    const sc = clone(demo)
    sc.phases[0].steps.push({ id: 'firmar', title: 'Repetido', done: { state: ['fantasma', 'x'] }, points: 5 })
    sc.errors.push({ id: 'mal', on: { act: ['v-01', 'volar'] }, severity: 'grave', message: 'x' })
    sc.errors.push({ id: 'crit', on: { act: ['v-01', 'open'] }, severity: 'critico', message: 'x' })
    sc.phases[1].steps[0] = { ...sc.phases[1].steps[0], done: { stepDone: 'no-existe' } }
    sc.objects.raro = { kind: 'dragon', label: 'Raro' }
    const P = validate(sc).join('\n')
    expect(P).toMatch(/Paso repetido: firmar/)
    expect(P).toMatch(/objeto «fantasma» inexistente/)
    expect(P).toMatch(/verbo «volar» no válido/)
    expect(P).toMatch(/severidad «grave»/)
    expect(P).toMatch(/necesita explain/)
    expect(P).toMatch(/paso «no-existe» inexistente/)
    expect(P).toMatch(/kind desconocido «dragon»/)
    expect(P).toMatch(/suman 105 puntos/)
  })
  it('detecta pasos sin forma de completarse y condiciones desconocidas', () => {
    const sc = clone(demo)
    sc.phases[2].steps[1] = { id: 'x', title: 'X', points: 10 }
    sc.phases[2].steps[0] = { ...sc.phases[2].steps[0], done: { magia: true } }
    const P = validate(sc).join('\n')
    expect(P).toMatch(/no tiene forma de completarse/)
    expect(P).toMatch(/condición desconocida «magia»/)
  })
})

describe('puntaje', () => {
  it('total del demo = 100', () => expect(totalPoints(demo)).toBe(100))
  it('penalizaciones, límites 0–100 y regla de aprobado', () => {
    const done = new Set(demo.phases.flatMap((p) => p.steps.map((s) => s.id)))
    const e = (severity) => ({ severity })
    expect(computeScore({ scenario: demo, done, errors: [], mode: 'evaluacion', finished: true }).passed).toBe(true)
    expect(computeScore({ scenario: demo, done, errors: [e('critico')], mode: 'evaluacion', finished: true }).passed).toBe(false)
    expect(computeScore({ scenario: demo, done, errors: [], mode: 'practica', finished: true }).passed).toBe(false)
    expect(computeScore({ scenario: demo, done, errors: [], mode: 'evaluacion', finished: false }).passed).toBe(false)
    const two = computeScore({ scenario: demo, done, errors: [e('mayor'), e('mayor'), e('menor')], mode: 'evaluacion', finished: true })
    expect(two.score).toBe(100 - 2 * SCORING.mayor - SCORING.menor)
    expect(two.passed).toBe(two.score >= SCORING.pass)
    const lots = computeScore({ scenario: demo, done: new Set(), errors: Array(20).fill(e('mayor')), mode: 'evaluacion', finished: true })
    expect(lots.score).toBe(0)
  })
})
