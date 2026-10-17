import { describe, it, expect } from 'vitest'
import confinados, { atmosfera } from '../../src/scenarios/confinados.js'
import { validate } from '../../src/engine/validate.js'
import { createRun } from '../../src/engine/runner.js'
import { replay } from '../../src/engine/replay.js'
import { CONFINADOS } from '../../src/scenarios/limits.js'

const T = { tick: 2.5 }
const PLANEAR = [
  ...['deficiencia-o2', 'toxicos', 'inflamables', 'atrapamiento', 'energias', 'caidas'].map((i) => ['peligros', 'marcar', i]),
  ['supervisora', 'hablar', 'revisar-permiso'], ['permiso-entrada', 'leer'], ['permiso-entrada', 'firmar'], ['vigia', 'hablar', 'confirmar-roles'],
]
const AISLAR = [['v-entrada-1', 'close'], ['v-entrada-2', 'close'], ['brida', 'instalar']]
const tresNiveles = [['detector', 'medir', 'arriba'], T, ['detector', 'medir', 'medio'], T, ['detector', 'medir', 'fondo'], T]
const MEDIR = [['detector', 'encender'], ['detector', 'bump'], T, ...tresNiveles]
const VENTILAR = [['llave-manhole', 'tomar'], ['manhole', 'abrir'], ['barrera-pozo', 'colocar'], ['ducto', 'instalar'], ['ventilador', 'on'], { tick: 21 }, ...tresNiveles]
const RESCATE = [['tripode', 'montar'], ['arnes-c', 'poner'], ['winche', 'conectar'], ['vigia', 'hablar', 'prueba-radio'], ['detector-personal', 'encender']]
const ENTRAR = [['escalera-foso', 'bajar'], ['valvula-foso', 'inspeccionar'], 'esperar-alarma', ['escalera-foso', 'subir'], ['vigia', 'hablar', 'aviso-salida']]
const CIERRE = [['ducto', 'retirar'], ['ventilador', 'off'], ['tripode', 'desmontar'], ['manhole', 'cerrar'], ['permiso-entrada', 'cerrar'], ['quiz-rescate-c', 'responder', 'rescate-afuera']]
const FELIZ = [...PLANEAR, ...AISLAR, ...MEDIR, ...VENTILAR, ...RESCATE, ...ENTRAR, ...CIERRE]

function run(acts, { mode = 'evaluacion', seed = 1 } = {}) {
  const r = createRun(confinados, { mode, seed })
  const crit = []
  r.on('critical', (e) => crit.push(e))
  for (const a of acts) {
    if (a === 'esperar-alarma') { let n = 0; while (!r.flags.has('alarma') && n++ < 100) r.tick(0.1) }
    else if (Array.isArray(a)) r.act(...a)
    else r.tick(a.tick)
  }
  return { r, crit, result: r.result() }
}

describe('escenario Espacios confinados — cámara CV-07', () => {
  it('es válido y suma 100 puntos', () => expect(validate(confinados)).toEqual([]))

  it('modelo de atmósfera: fondo fuera de rango al inicio; limpio tras ventilar; la fuga sube el H₂S', () => {
    const a0 = atmosfera({ ventilacion: 0 }, new Set())
    expect(a0.fondo.h2s).toBe(CONFINADOS.inicial.fondo.h2s)
    const a1 = atmosfera({ ventilacion: 999 }, new Set())
    expect(a1.fondo).toEqual(CONFINADOS.aireLimpio)
    expect(atmosfera({ ventilacion: 999 }, new Set(['alarma'])).fondo.h2s).toBe(CONFINADOS.fugaH2S.fondo)
  })

  for (const seed of [1, 7]) {
    it(`camino feliz en evaluación (semilla ${seed}): aprobado con 100`, () => {
      const { r, result } = run(FELIZ, { seed })
      expect(result.errors).toEqual([])
      expect(r.status).toBe('finished')
      expect(result.score).toBe(100)
      expect(result.passed).toBe(true)
    })
  }

  it('crítico: bajar sin medir → desvanecimiento', () => {
    const { crit } = run([...PLANEAR, ['escalera-foso', 'bajar']])
    expect(crit[0].error.id).toBe('entrar-sin-medir')
    expect(crit[0].consequence).toBe('desvanecimiento')
  })

  it('crítico: bajar con la atmósfera fuera de rango (medido pero sin ventilar)', () => {
    const { crit } = run([...PLANEAR, ...AISLAR, ...MEDIR, ['escalera-foso', 'bajar']])
    expect(crit[0].error.id).toBe('entrar-fuera-de-rango')
  })

  it('crítico: bajar sin vigía confirmado ni prueba de radio', () => {
    const acts = [...PLANEAR, ...AISLAR, ...MEDIR, ...VENTILAR, ['tripode', 'montar'], ['arnes-c', 'poner'], ['winche', 'conectar'], ['escalera-foso', 'bajar']]
    expect(run(acts).crit[0].error.id).toBe('entrar-sin-vigia')
  })

  it('crítico: seguir dentro tras la alarma; el reintento te deja afuera', () => {
    const acts = [...PLANEAR, ...AISLAR, ...MEDIR, ...VENTILAR, ...RESCATE, ['escalera-foso', 'bajar'], ['valvula-foso', 'inspeccionar'], 'esperar-alarma', { tick: 6 }]
    const { r, crit } = run(acts, { mode: 'practica' })
    expect(crit[0].error.id).toBe('ignorar-alarma')
    r.retry()
    expect(r.state['escalera-foso']).toBe('arriba')
    r.tick(10)
    expect(r.status).toBe('running')
  })

  it('crítico: en la pregunta de rescate, bajar a ayudar', () => {
    expect(run([['quiz-rescate-c', 'responder', 'bajar-ayudar']]).crit[0].error.id).toBe('rescate-entrando')
  })

  it('errores mayores y menores: sin bump, no esperar lectura, abrir sin medir fondo, sin aislar, sin línea de vida', () => {
    const { result } = run([
      ...PLANEAR, ['detector', 'encender'], ['detector', 'medir', 'arriba'], ['detector', 'medir', 'medio'],
      ['llave-manhole', 'tomar'], ['manhole', 'abrir'],
    ], { mode: 'practica' })
    const ids = result.errors.map((e) => e.id)
    expect(ids).toEqual(expect.arrayContaining(['sin-bump-test', 'no-esperar-lectura', 'medir-solo-arriba']))
    const r2 = run([...PLANEAR, ...MEDIR, ...VENTILAR, ['vigia', 'hablar', 'prueba-radio'], ['escalera-foso', 'bajar']], { mode: 'practica' }).result
    expect(r2.errors.map((e) => e.id)).toEqual(expect.arrayContaining(['sin-aislar', 'entrar-sin-linea-de-vida']))
  })

  it('requisitos físicos: tapa con la llave, ducto con el manhole abierto, brida con las válvulas cerradas', () => {
    const r = createRun(confinados, { mode: 'evaluacion' })
    expect(r.act('manhole', 'abrir').reason).toBe('requisito')
    expect(r.act('ducto', 'instalar').reason).toBe('requisito')
    expect(r.act('brida', 'instalar').reason).toBe('requisito')
    expect(r.act('valvula-foso', 'inspeccionar').reason).toBe('requisito')
  })

  it('la alarma llega con un retardo que depende de la semilla', () => {
    const delays = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((s) => createRun(confinados, { mode: 'practica', seed: s }).variant.alarmaDelay))
    expect(delays.size).toBeGreaterThan(1)
    expect(createRun(confinados, { mode: 'aprendizaje', seed: 5 }).variant.alarmaDelay).toBe(3)
  })

  it('reproducción desde la traza', () => {
    const { r } = run(FELIZ, { mode: 'practica', seed: 4 })
    const rec = r.result()
    expect(replay(confinados, rec).result().score).toBe(rec.score)
  })
})
