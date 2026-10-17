import { describe, it, expect, beforeEach } from 'vitest'
import { setAdapter, memoryAdapter } from '../../src/records/db.js'
import * as R from '../../src/records/records.js'
import { parseTraineesCSV, resultsToCSV, buildExport, mergeImport, exportName } from '../../src/records/exchange.js'
import { certificateHTML, canCertify } from '../../src/records/certificate.js'
import { createRun } from '../../src/engine/runner.js'
import { replay } from '../../src/engine/replay.js'
import demo from '../fixtures/demo.js'

const FELIZ = [
  ['permiso', 'leer'], ['permiso', 'firmar'], ['candado', 'tomar'],
  ['int-01', 'off'], ['v-01', 'close'], ['punto-int', 'poner', 'candado'],
  ['detector', 'encender'], ['detector', 'medir', 'zona'], ['tapa', 'abrir'],
]
const ana = { cedula: '1.234.567.890', nombre: 'Ana Pérez', empresa: 'Cliente S.A.', cargo: 'Mecánica' }

function attemptFrom(mode, acts, trainee = ana, seed = 9) {
  const run = createRun(demo, { mode, seed })
  for (const a of acts) { run.tick(1); run.act(...a) }
  return R.buildAttempt({ result: run.result(), scenario: demo, trainee, startedAt: new Date('2026-10-17T10:00:00Z'), endedAt: new Date('2026-10-17T10:05:00Z'), device: 'pc', appVersion: '1.0.0' })
}

beforeEach(() => setAdapter(memoryAdapter()))

describe('registros de aprendices e intentos', () => {
  it('guarda y busca aprendices por cédula normalizada; borra a la persona con sus intentos (habeas data)', async () => {
    await R.saveTrainee(ana)
    expect((await R.getTrainee('1234567890')).nombre).toBe('Ana Pérez')
    await R.saveAttempt(attemptFrom('evaluacion', FELIZ))
    await R.saveAttempt(attemptFrom('practica', FELIZ, { cedula: '999', nombre: 'Otro' }))
    expect(await R.listAttempts()).toHaveLength(2)
    await R.deletePerson('1234567890')
    expect(await R.getTrainee('1234567890')).toBe(null)
    const rest = await R.listAttempts()
    expect(rest).toHaveLength(1)
    expect(rest[0].trainee.cedula).toBe('999')
  })

  it('el registro del intento sigue el esquema de docs/07 y conserva la traza', () => {
    const a = attemptFrom('evaluacion', FELIZ)
    expect(a.id).toMatch(/^a-/)
    expect(a).toMatchObject({ appVersion: '1.0.0', scenarioId: 'demo', scenarioVersion: 1, mode: 'evaluacion', seed: 9, score: 100, passed: true, completed: true, durationSec: 9, device: 'pc' })
    expect(a.trainee.cedula).toBe('1234567890')
    expect(a.steps).toHaveLength(7)
    expect(a.actions.length).toBe(FELIZ.length)
  })

  it('un intento guardado se reproduce con el motor desde su traza', () => {
    const a = attemptFrom('practica', [['tapa', 'abrir'], ...FELIZ])
    const again = replay(demo, a).result()
    expect(again.score).toBe(a.score)
    expect(again.errors.map((e) => e.id)).toEqual(a.errors.map((e) => e.id))
  })

  it('mejor puntaje por escenario', async () => {
    await R.saveAttempt(attemptFrom('practica', FELIZ.slice(0, 5)))
    await R.saveAttempt(attemptFrom('evaluacion', FELIZ))
    const best = await R.bestScores('1234567890')
    expect(best.demo.score).toBe(100)
    expect(best.demo.passed).toBe(true)
  })
})

describe('CSV, JSON y certificado', () => {
  it('importa aprendices CSV con encabezado, punto y coma, comillas, BOM y errores por línea', () => {
    const csv = '﻿Cédula;Nombre;Empresa;Cargo\n1.111.222;"Pérez, Ana";Cliente S.A.;Mecánica\n;Sin cédula;X;Y\n333;Luis Gómez;"Contratista ""Uno""";Eléctrico\n333;Repetido;Z;Z\n'
    const { trainees, errors } = parseTraineesCSV(csv)
    expect(trainees).toEqual([
      { cedula: '1111222', nombre: 'Pérez, Ana', empresa: 'Cliente S.A.', cargo: 'Mecánica' },
      { cedula: '333', nombre: 'Luis Gómez', empresa: 'Contratista "Uno"', cargo: 'Eléctrico' },
    ])
    expect(errors).toHaveLength(2)
    expect(parseTraineesCSV('10,Ana,ACME,Op').trainees[0]).toEqual({ cedula: '10', nombre: 'Ana', empresa: 'ACME', cargo: 'Op' })
  })

  it('exporta resultados a CSV escapando campos', () => {
    const a = attemptFrom('evaluacion', FELIZ, { cedula: '5', nombre: 'Ana; "la jefa"', empresa: 'X' })
    const csv = resultsToCSV([a])
    expect(csv.startsWith('﻿codigo;fecha;cedula')).toBe(true)
    expect(csv).toContain('"Ana; ""la jefa"""')
    expect(csv).toContain(';Evaluación;100;SI;SI;0;0;')
  })

  it('exporta e importa JSON sin duplicar intentos y completando aprendices', () => {
    const a1 = attemptFrom('evaluacion', FELIZ), a2 = attemptFrom('practica', FELIZ)
    const pkg = buildExport({ trainees: [{ cedula: '1234567890', nombre: 'Ana Pérez', empresa: 'Cliente S.A.', cargo: '' }, { cedula: '77', nombre: 'Nuevo' }], attempts: [a1, a2], appVersion: '1.0.0' })
    const m = mergeImport(JSON.parse(JSON.stringify(pkg)), { trainees: [{ cedula: '1234567890', nombre: 'Ana Pérez', empresa: '', cargo: '' }], attempts: [a1] })
    expect(m.attempts.map((x) => x.id)).toEqual([a2.id])
    expect(m.trainees.map((t) => t.cedula).sort()).toEqual(['1234567890', '77'])
    expect(m.trainees.find((t) => t.cedula === '1234567890').empresa).toBe('Cliente S.A.')
    expect(() => mergeImport({ foo: 1 }, {})).toThrow()
    expect(exportName('json', new Date('2026-10-17T15:04:00Z'))).toBe('hseqgate-resultados-202610171504.json')
  })

  it('certificado solo para aprobados en evaluación, con datos y código, y texto escapado', () => {
    const ok = attemptFrom('evaluacion', FELIZ, { cedula: '1234567890', nombre: 'Ana <b>Pérez</b>', empresa: 'Cliente' })
    const html = certificateHTML(ok, demo, { logoUrl: '/hseq/icons/logo-voltac.png', appVersion: '1.0.0' })
    expect(html).toContain('C.C. 1.234.567.890')
    expect(html).toContain('Ana &lt;b&gt;Pérez&lt;/b&gt;')
    expect(html).toContain(ok.id)
    expect(html).toContain('100 / 100')
    expect(html).toContain('17 de octubre de 2026')
    expect(html).toContain('simulador')
    expect(canCertify(attemptFrom('practica', FELIZ))).toBe(false)
    expect(() => certificateHTML(attemptFrom('evaluacion', [['tapa', 'abrir']]), demo)).toThrow()
  })
})
