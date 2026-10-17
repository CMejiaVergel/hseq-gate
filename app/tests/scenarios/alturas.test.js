import { describe, it, expect } from 'vitest'
import alturas, { HARNESSES, SAFE_SPOT } from '../../src/scenarios/alturas.js'
import { validate } from '../../src/engine/validate.js'
import { createRun } from '../../src/engine/runner.js'
import { replay } from '../../src/engine/replay.js'
import { play, ofType } from '../helpers/play.js'

const PLATAFORMA = { x: -1.6, y: 6, z: -1.6 }
const BORDE = { x: 1.5, y: 6, z: -3.6 }
const SUELO = { x: -2.5, y: 0, z: -0.4 }
const at = (player) => ({ tick: 0.2, player })
const goodHarness = (seed, mode = 'evaluacion') => { const v = createRun(alturas, { mode, seed }).variant; return HARNESSES.find((h) => h !== v.arnesDefectuoso) }
const badHarness = (seed) => createRun(alturas, { mode: 'evaluacion', seed }).variant.arnesDefectuoso
const seedWith = (k, val) => { for (let s = 1; s < 200; s++) if (createRun(alturas, { seed: s }).variant[k] === val) return s }

const PLANEAR = [
  ['ats', 'marcar', 'caida-persona'], ['ats', 'marcar', 'caida-objetos'], ['ats', 'marcar', 'electrico'],
  ['permiso-alturas', 'leer'], ['permiso-alturas', 'firmar'],
  ['candado-alturas', 'tomar'], ['int-alumbrado', 'off'], ['punto-alumbrado', 'poner', 'candado-alturas'],
  ['barrera', 'colocar'],
]
const ponerArnes = (h) => [...['correas', 'costuras', 'argollas', 'hebillas', 'etiqueta'].map((p) => [h, 'inspeccionar', p]), [h, 'poner'], [h, 'ajustar']]
const EPP = [['casco-ok', 'tomar'], ['eslinga-abs', 'tomar'], ['bolso', 'tomar'], ['amarres', 'tomar']]
const hastaArriba = (h) => [...PLANEAR, ...ponerArnes(h), ...EPP, ['quiz-claridad', 'responder', 'apto'], ['jugador', 'mano', null], ['escalera', 'subir'], at(PLATAFORMA)]
export const feliz = (h) => [
  ...hastaArriba(h), ['anclaje-cert', 'conectar'],
  at(BORDE), ['luminaria', 'desmontar'], ['luminaria', 'instalar'],
  at(PLATAFORMA), ['anclaje-cert', 'desconectar'],
  ['escalera', 'bajar'], at(SUELO),
  ['barrera', 'retirar'], ['punto-alumbrado', 'quitar', 'candado-alturas'], ['int-alumbrado', 'on'], ['permiso-alturas', 'cerrar'],
  ['quiz-rescate', 'responder', 'activar-rescate'],
]
const sinBarreraNiAmarres = (acts) => acts.filter((a) => !(Array.isArray(a) && (a[0] === 'barrera' || a[0] === 'amarres')))

describe('escenario Alturas — luminaria en plataforma', () => {
  it('es válido y suma 100 puntos', () => expect(validate(alturas)).toEqual([]))

  for (const seed of [3, 8]) {
    it(`camino feliz en evaluación (semilla ${seed}): aprobado con 100`, () => {
      const { result, run } = play(alturas, feliz(goodHarness(seed)), { seed })
      expect(result.errors).toEqual([])
      expect(run.status).toBe('finished')
      expect(result.score).toBe(100)
      expect(result.passed).toBe(true)
    })
  }

  it('crítico: entrar a la zona de borde sin conexión → caída (y el reintento lleva a zona segura)', () => {
    const run = createRun(alturas, { mode: 'practica', seed: 3 })
    const evs = []
    run.on('critical', (e) => evs.push(e))
    for (const a of hastaArriba(goodHarness(3, 'practica'))) Array.isArray(a) ? run.act(...a) : run.tick(a.tick, { player: a.player })
    run.tick(0.2, { player: BORDE })
    expect(evs[0].error.id).toBe('borde-sin-conexion')
    expect(evs[0].consequence).toBe('caida')
    expect(run.retry().retry.spawn).toEqual(SAFE_SPOT)
  })

  it('crítico: conectado a la tubería (no certificada) y en el borde → caída; conectar ahí ya es mayor', () => {
    const { events, result } = play(alturas, [...hastaArriba(goodHarness(3)), ['anclaje-tubo', 'conectar'], at(BORDE)], { seed: 3 })
    expect(ofType(events, 'critical')[0].error.id).toBe('borde-anclaje-no-certificado')
    expect(result.errors.map((e) => e.id)).toContain('anclaje-no-certificado')
  })

  it('crítico: arnés defectuoso puesto → mayor al ponérselo y se rompe en el borde', () => {
    const seed = 5
    const { events, result } = play(alturas, [...hastaArriba(badHarness(seed)), ['anclaje-cert', 'conectar'], at(BORDE)], { seed })
    expect(result.errors.map((e) => e.id)).toContain('arnes-defectuoso')
    expect(ofType(events, 'critical')[0].error.id).toBe('borde-arnes-defectuoso')
  })

  it('crítico (según semilla): herramienta que cae sobre el compañero sin acordonar ni amarres', () => {
    const seed = seedWith('caeHerramienta', true)
    const { events } = play(alturas, sinBarreraNiAmarres(feliz(goodHarness(seed))), { seed })
    expect(ofType(events, 'critical')[0].error.id).toBe('herramienta-cae')
    expect(ofType(events, 'critical')[0].consequence).toBe('objeto-cae')
    const seed2 = seedWith('caeHerramienta', false)
    const r2 = play(alturas, sinBarreraNiAmarres(feliz(goodHarness(seed2, 'practica'))), { seed: seed2, mode: 'practica' }).result
    expect(r2.errors.map((e) => e.id)).toEqual(expect.arrayContaining(['sin-acordonar', 'herramienta-sin-amarre']))
  })

  it('errores mayores al subir: sin permiso, arnés sin ajustar, herramienta en la mano', () => {
    const { result } = play(alturas, [['bolso', 'tomar'], ['escalera', 'subir']], { mode: 'practica', seed: 3 })
    expect(result.errors.map((e) => e.id)).toEqual(expect.arrayContaining(['sin-permiso-alturas', 'arnes-sin-ajustar', 'subir-con-herramienta-en-mano']))
  })

  it('la luminaria solo se alcanza cerca del borde; conectar exige llevar eslinga', () => {
    const run = createRun(alturas, { mode: 'evaluacion', seed: 3 })
    run.tick(0.1, { player: PLATAFORMA })
    expect(run.act('luminaria', 'desmontar').reason).toBe('requisito')
    expect(run.act('anclaje-cert', 'conectar').reason).toBe('requisito')
  })

  it('eslinga sin absorbedor y casco sin barbuquejo → errores', () => {
    const { result } = play(alturas, [['casco-sin', 'tomar'], ['eslinga-sin', 'tomar'], ['anclaje-cert', 'conectar']], { mode: 'practica', seed: 3 })
    expect(result.errors.map((e) => e.id)).toEqual(expect.arrayContaining(['casco-sin-barbuquejo', 'eslinga-sin-absorbedor']))
  })

  it('preguntas incorrectas → errores; el arnés defectuoso depende de la semilla', () => {
    const { result } = play(alturas, [['quiz-claridad', 'responder', 'no-aplica'], ['quiz-rescate', 'responder', 'subir-ayudar']], { mode: 'practica', seed: 3 })
    expect(result.errors.map((e) => e.id)).toEqual(expect.arrayContaining(['claridad-incorrecta', 'rescate-incorrecto']))
    const defs = new Set([1, 2, 3, 4, 5, 6, 7].map((s) => createRun(alturas, { seed: s }).variant.arnesDefectuoso))
    expect(defs.size).toBeGreaterThan(1)
  })

  it('reproducción desde la traza (incluye posiciones del jugador)', () => {
    const run = createRun(alturas, { mode: 'practica', seed: 3 })
    for (const a of feliz(goodHarness(3, 'practica'))) Array.isArray(a) ? run.act(...a) : run.tick(a.tick, { player: a.player })
    const rec = run.result()
    expect(replay(alturas, rec).result().score).toBe(rec.score)
  })
})
