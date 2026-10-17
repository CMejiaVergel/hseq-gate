import { describe, it, expect } from 'vitest'
import { evalCond, getPath, distanceTo, checklistComplete } from '../../src/engine/conditions.js'

const objects = {
  c1: { kind: 'item', group: 'candado-personal' }, c2: { kind: 'item', group: 'candado-prestado' },
  z: { kind: 'zone', segment: [[0, 0], [4, 0]], y: 6 }, p: { kind: 'item', pos: [10, 1, 10] },
  lista: { kind: 'checklist', items: [{ id: 'a' }, { id: 'b' }, { id: 'x', correct: false }] },
}
const base = (over = {}) => ({
  state: { v: 'open', n: 5, det: { on: true, lecturas: { fondo: { ok: false } } }, punto: ['c1'], lista: ['a', 'b'], seq: ['f:si', 'b:no', 'f:si'], t0: 2 },
  flags: new Set(['ats']), readings: { presion: 45 }, done: new Set(['s1']), inventory: ['c2'], hand: 'c2',
  player: { x: 2, y: 6, z: 1 }, objects, timers: { vent: 12 }, time: 10, mode: 'practica', variant: { arnes: 2 }, phasesDone: new Set(['f1']), ...over,
})

describe('condiciones', () => {
  it('state: igualdad, rutas con punto y operadores', () => {
    const c = base()
    expect(evalCond({ state: ['v', 'open'] }, c)).toBe(true)
    expect(evalCond({ state: ['v', 'closed'] }, c)).toBe(false)
    expect(evalCond({ state: ['det.on', true] }, c)).toBe(true)
    expect(evalCond({ state: ['det.lecturas.fondo.ok', false] }, c)).toBe(true)
    expect(evalCond({ state: ['det.lecturas.medio.ok', true] }, c)).toBe(false)
    expect(evalCond({ state: ['v', 'in', ['open', 'x']] }, c)).toBe(true)
    expect(evalCond({ state: ['n', '>=', 5] }, c)).toBe(true)
    expect(evalCond({ state: ['n', '<', 5] }, c)).toBe(false)
    expect(evalCond({ state: ['n', '!=', 4] }, c)).toBe(true)
    expect(getPath(c.state, 'det.lecturas.fondo.ok')).toBe(false)
  })
  it('has / lacks sobre listas, por id o por grupo', () => {
    const c = base()
    expect(evalCond({ state: ['punto', 'has', 'c1'] }, c)).toBe(true)
    expect(evalCond({ state: ['punto', 'has', 'candado-personal'] }, c)).toBe(true)
    expect(evalCond({ state: ['punto', 'has', 'candado-prestado'] }, c)).toBe(false)
    expect(evalCond({ state: ['punto', 'lacks', 'candado-prestado'] }, c)).toBe(true)
    expect(evalCond({ count: ['punto', '==', 1] }, c)).toBe(true)
  })
  it('reading, flag, stepDone, phaseDone, has, hand, timer, elapsed', () => {
    const c = base()
    expect(evalCond({ reading: ['presion', '>', 0] }, c)).toBe(true)
    expect(evalCond({ reading: ['nada', '>', 0] }, c)).toBe(false)
    expect(evalCond({ flag: 'ats' }, c)).toBe(true)
    expect(evalCond({ flag: 'otra' }, c)).toBe(false)
    expect(evalCond({ stepDone: 's1' }, c)).toBe(true)
    expect(evalCond({ phaseDone: 'f1' }, c)).toBe(true)
    expect(evalCond({ has: 'c2' }, c)).toBe(true)
    expect(evalCond({ has: 'candado-prestado' }, c)).toBe(true)
    expect(evalCond({ has: 'c1' }, c)).toBe(false)
    expect(evalCond({ hand: 'c2' }, c)).toBe(true)
    expect(evalCond({ hand: null }, c)).toBe(false)
    expect(evalCond({ hand: null }, base({ hand: null }))).toBe(true)
    expect(evalCond({ timer: ['vent', '>=', 10] }, c)).toBe(true)
    expect(evalCond({ elapsed: ['t0', '>', 5] }, c)).toBe(true)
    expect(evalCond({ elapsed: ['t0', '<', 5] }, c)).toBe(false)
  })
  it('near: segmento con altura y punto', () => {
    const c = base()
    expect(evalCond({ near: ['z', 1.5] }, c)).toBe(true)
    expect(evalCond({ near: ['z', 0.5] }, c)).toBe(false)
    expect(evalCond({ near: ['z', 1.5] }, base({ player: { x: 2, y: 0, z: 1 } }))).toBe(false)
    expect(evalCond({ near: ['p', 2] }, base({ player: { x: 10, y: 0, z: 11 } }))).toBe(true)
    expect(distanceTo(undefined, { x: 0, z: 0 })).toBe(Infinity)
  })
  it('complete, sequence, mode, variant y combinadores', () => {
    const c = base()
    expect(evalCond({ complete: 'lista' }, c)).toBe(true)
    expect(checklistComplete(objects.lista, ['a', 'b', 'x'])).toBe(false)
    expect(checklistComplete(objects.lista, ['a'])).toBe(false)
    expect(evalCond({ sequence: ['seq', ['f:si', 'b:no', 'f:si']] }, c)).toBe(true)
    expect(evalCond({ sequence: ['seq', ['b:no', 'b:no']] }, c)).toBe(false)
    expect(evalCond({ mode: 'practica' }, c)).toBe(true)
    expect(evalCond({ mode: ['evaluacion', 'aprendizaje'] }, c)).toBe(false)
    expect(evalCond({ variant: ['arnes', 2] }, c)).toBe(true)
    expect(evalCond({ all: [{ flag: 'ats' }, { not: { flag: 'x' } }] }, c)).toBe(true)
    expect(evalCond({ any: [{ flag: 'x' }, { stepDone: 'zz' }] }, c)).toBe(false)
    expect(evalCond(true, c)).toBe(true)
    expect(evalCond(false, c)).toBe(false)
    expect(() => evalCond({ rara: 1 }, c)).toThrow()
  })
})
