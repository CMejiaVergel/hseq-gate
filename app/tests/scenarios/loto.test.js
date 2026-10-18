import { describe, it, expect } from 'vitest'
import loto from '../../src/scenarios/loto.js'
import { validate } from '../../src/engine/validate.js'
import { createRun } from '../../src/engine/runner.js'
import { replay } from '../../src/engine/replay.js'
import { play, ofType } from '../helpers/play.js'
import { SCORING } from '../../src/scenarios/limits.js'

const MATRIZ = ['electrica', 'presion-succion', 'presion-descarga', 'almacenada', 'termica', 'mecanica']
const PREPARAR = [
  ['ot', 'leer'], ['permiso', 'leer'], ['permiso', 'firmar'], ['radio', 'llamar', 'op-fuera'],
  ...['candado-1', 'candado-2', 'candado-3', 'tarjeta-1', 'cubre-1', 'cubre-2'].map((id) => [id, 'tomar']),
  ...MATRIZ.map((i) => ['matriz', 'marcar', i]),
]
const AISLAR = [['pb-local', 'stop'], ['ccm-p101', 'off'], ['v-descarga', 'close'], ['v-succion', 'close']]
const BLOQUEAR = [
  ['punto-p101', 'poner', 'candado-1'], ['punto-p101', 'poner', 'tarjeta-1'],
  ['punto-succion', 'poner', 'cubre-1'], ['punto-succion', 'poner', 'candado-2'],
  ['punto-descarga', 'poner', 'cubre-2'], ['punto-descarga', 'poner', 'candado-3'],
]
const LIBERAR = [['v-purga', 'open'], ['pi-carcasa', 'leer']]
const verificar = (t) => [['pb-local', 'start'], ['pb-local', 'stop'], [t, 'medir', 'fuente'], [t, 'medir', 'bornera'], [t, 'medir', 'fuente']]
const TRABAJO = [['guarda', 'retirar'], ['sello', 'desmontar'], ['sello', 'montar']]
const RESTAURAR = [
  ['guarda', 'instalar'], ['radio', 'llamar', 'op-energizar'],
  ['punto-p101', 'quitar', 'tarjeta-1'], ['punto-p101', 'quitar', 'candado-1'], ['punto-succion', 'quitar', 'candado-2'], ['punto-succion', 'quitar', 'cubre-1'],
  ['punto-descarga', 'quitar', 'candado-3'], ['punto-descarga', 'quitar', 'cubre-2'],
  ['v-purga', 'close'], ['v-succion', 'open'], ['v-descarga', 'open'], ['ccm-p101', 'on'], ['permiso', 'cerrar'],
]
const feliz = (tester = 'probador') => [...PREPARAR, ...AISLAR, ...BLOQUEAR, ...LIBERAR, ...verificar(tester), ...TRABAJO, ...RESTAURAR]
const HASTA_VERIFICAR = [...PREPARAR, ...AISLAR, ...BLOQUEAR, ...LIBERAR]

/* semillas con y sin probador descargado (práctica/evaluación) */
const seedWith = (dead) => { for (let s = 1; s < 200; s++) if (createRun(loto, { mode: 'evaluacion', seed: s }).variant.probadorDescargado === dead) return s; throw new Error('sin semilla') }
const SEED_OK = seedWith(false), SEED_DEAD = seedWith(true)

describe('escenario LOTO — bomba P-101', () => {
  it('es válido y suma 100 puntos', () => {
    expect(validate(loto)).toEqual([])
  })

  it('camino feliz en evaluación: aprobado con 100 (probador bueno)', () => {
    const { result, run } = play(loto, feliz('probador'), { seed: SEED_OK })
    expect(run.status).toBe('finished')
    expect(result.errors).toEqual([])
    expect(result.score).toBe(100)
    expect(result.passed).toBe(true)
  })

  it('variación: probador descargado → marca «no» en la fuente; con el de repuesto se aprueba con 100', () => {
    const run = createRun(loto, { mode: 'evaluacion', seed: SEED_DEAD })
    for (const a of HASTA_VERIFICAR) run.act(...a)
    run.act('pb-local', 'start'); run.act('pb-local', 'stop')
    run.act('probador', 'medir', 'fuente')
    expect(run.state.probador).toEqual(['fuente:no'])
    const { result } = play(loto, feliz('probador-2'), { seed: SEED_DEAD })
    expect(result.score).toBe(100)
    expect(result.passed).toBe(true)
  })

  it('medir con el probador descargado sin verificarlo → error mayor y el paso no se completa', () => {
    const run = createRun(loto, { mode: 'evaluacion', seed: SEED_DEAD })
    for (const a of HASTA_VERIFICAR) run.act(...a)
    run.act('pb-local', 'start'); run.act('pb-local', 'stop')
    for (const a of verificar('probador').slice(2)) run.act(...a)
    expect(run.errors.map((e) => e.id)).toContain('probador-sin-verificar')
    expect(run.isDone('probar-medir-probar')).toBe(false)
  })

  it('variación: el orden del CCM se baraja con la semilla (y no en aprendizaje)', () => {
    const ap = createRun(loto, { mode: 'aprendizaje', seed: 5 }).variant.orden
    expect(ap[0]).toBe('ccm-p101')
    const ordenes = new Set([1, 2, 3, 4, 5, 6].map((s) => createRun(loto, { mode: 'practica', seed: s }).variant.orden.join()))
    expect(ordenes.size).toBeGreaterThan(1)
    expect(createRun(loto, { mode: 'practica', seed: 9 }).variant).toEqual(createRun(loto, { mode: 'practica', seed: 9 }).variant)
  })

  it('crítico: purgar con las válvulas abiertas → quemadura', () => {
    const { events, result } = play(loto, [...PREPARAR, ['pb-local', 'stop'], ['ccm-p101', 'off'], ['v-purga', 'open']], { seed: SEED_OK })
    const c = ofType(events, 'critical')
    expect(c[0].error.id).toBe('purga-con-valvulas-abiertas')
    expect(c[0].consequence).toBe('quemadura')
    expect(result.passed).toBe(false)
  })

  it('crítico: intervenir sin verificar energía cero → arranque inesperado', () => {
    const { events } = play(loto, [...HASTA_VERIFICAR, ['guarda', 'retirar']], { seed: SEED_OK })
    expect(ofType(events, 'critical')[0].error.id).toBe('trabajo-sin-verificar')
    expect(ofType(events, 'critical')[0].consequence).toBe('arranque-inesperado')
  })

  it('crítico: desmontar el sello con presión en la carcasa → fuga a presión', () => {
    /* en práctica el crítico no termina: se cierra la purga para dejar presión y se reintenta */
    const run = createRun(loto, { mode: 'practica', seed: SEED_OK })
    for (const a of [...HASTA_VERIFICAR, ...verificar('probador'), ['guarda', 'retirar'], ['v-purga', 'close']]) run.act(...a)
    const evs = []
    run.on('critical', (e) => evs.push(e))
    run.act('sello', 'desmontar')
    expect(evs[0]?.error.id).toBe('trabajo-con-presion')
    expect(evs[0]?.consequence).toBe('fuga-presion')
    expect(run.status).toBe('paused')
  })

  it('crítico: retirar el candado ajeno de la caja grupal', () => {
    const { events } = play(loto, [['caja-grupal', 'quitar', 'candado-electricista']], { seed: SEED_OK })
    expect(ofType(events, 'critical')[0].error.id).toBe('retirar-candado-ajeno')
  })

  it('errores mayores: sin permiso, sin notificar, interruptor bajo carga, candado prestado, tarjeta sin candado, punto equivocado', () => {
    const { result } = play(loto, [
      ['ccm-p101', 'off'],
      ['candado-amarillo', 'tomar'], ['tarjeta-2', 'tomar'], ['candado-1', 'tomar'],
      ['punto-p102', 'poner', 'candado-1'],
      ['punto-p101', 'poner', 'tarjeta-2'],
      ['punto-p101', 'poner', 'candado-amarillo'],
    ], { mode: 'practica', seed: SEED_OK })
    const ids = result.errors.map((e) => e.id)
    for (const id of ['sin-permiso', 'interruptor-bajo-carga', 'punto-equivocado', 'tarjeta-sin-candado', 'candado-prestado']) expect(ids).toContain(id)
    const r2 = play(loto, [['permiso', 'firmar'], ['pb-local', 'stop']], { seed: SEED_OK }).result
    expect(r2.errors.map((e) => e.id)).toContain('sin-notificar')
  })

  it('la verificación revela el interruptor equivocado: la bomba arranca al probar', () => {
    const { run, result } = play(loto, [...PREPARAR, ['pb-local', 'stop'], ['ccm-p102', 'off'], ['pb-local', 'start']], { mode: 'practica', seed: SEED_OK })
    expect(run.state.motor).toBe('running')
    expect(result.errors.map((e) => e.id)).toContain('equipo-equivocado')
  })

  it('quitar un candado mal puesto o reabrir una válvula no genera «fuera de orden» en los pasos de restauración', () => {
    const { result } = play(loto, [...PREPARAR, ['punto-p102', 'poner', 'candado-1'], ['punto-p102', 'quitar', 'candado-1'], ['v-succion', 'close'], ['v-succion', 'open']], { mode: 'practica', seed: SEED_OK })
    const orden = result.errors.filter((e) => e.id === 'fuera-de-orden').map((e) => e.message)
    expect(orden.some((m) => /Retirar SOLO|Cerrar la purga/.test(m))).toBe(false)
  })

  it('un equipo bloqueado no se puede operar hasta retirar el candado', () => {
    const run = createRun(loto, { mode: 'evaluacion', seed: SEED_OK })
    for (const a of [...PREPARAR, ...AISLAR, ...BLOQUEAR]) run.act(...a)
    expect(run.act('ccm-p101', 'on').reason).toBe('bloqueado')
    expect(run.act('v-succion', 'open').reason).toBe('bloqueado')
    run.act('punto-succion', 'quitar', 'candado-2')
    expect(run.act('v-succion', 'open').reason).toBe('bloqueado')       // aún tiene el cubre-volante
    run.act('punto-succion', 'quitar', 'cubre-1')
    expect(run.act('v-succion', 'open').ok).toBe(true)
  })

  it('energizar sin avisar al operador → error mayor', () => {
    const acts = feliz('probador').filter((a) => !(a[0] === 'radio' && a[2] === 'op-energizar'))
    const { result } = play(loto, acts, { mode: 'practica', seed: SEED_OK })
    expect(result.errors.map((e) => e.id)).toContain('energizar-sin-avisar')
    expect(result.completed).toBe(false)                                  // el paso de aviso quedó pendiente
  })

  it('en aprendizaje un crítico permite reintentar y terminar (−10 por reintento)', () => {
    const run = createRun(loto, { mode: 'aprendizaje', seed: 1 })
    for (const a of [...PREPARAR, ['pb-local', 'stop'], ['ccm-p101', 'off'], ['v-purga', 'open']]) run.act(...a)
    expect(run.status).toBe('paused')
    run.retry()
    expect(run.state['v-purga']).toBe('closed')
    for (const a of [['v-descarga', 'close'], ['v-succion', 'close'], ...BLOQUEAR, ...LIBERAR, ...verificar('probador'), ...TRABAJO, ...RESTAURAR]) run.act(...a)
    const r = run.result()
    expect(r.completed).toBe(true)
    expect(r.score).toBe(100 - SCORING.retry)
  })

  it('reproducción del intento desde la traza', () => {
    const run = createRun(loto, { mode: 'practica', seed: SEED_DEAD })
    for (const a of feliz('probador-2')) { run.tick(0.8); run.act(...a) }
    const rec = run.result()
    expect(replay(loto, rec).result().score).toBe(rec.score)
  })
})
