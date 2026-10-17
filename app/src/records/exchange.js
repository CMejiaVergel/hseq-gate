import { normCedula } from './records.js'

/*
 * Intercambio de datos (docs/07): importar aprendices desde CSV, exportar resultados a CSV y todo
 * (aprendices + intentos con su traza) a JSON, e importar ese JSON para juntar en el PC los
 * intentos hechos en varias gafas.  Funciones puras: se prueban sin navegador.
 */

/** separa una línea CSV respetando comillas ("a, b" y "" como comilla escapada) */
function splitLine(line, sep) {
  const out = []; let cur = '', q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++ } else q = false } else cur += ch }
    else if (ch === '"') q = true
    else if (ch === sep) { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

const HEAD = { cedula: ['cedula', 'cédula', 'documento', 'cc', 'identificacion', 'identificación'], nombre: ['nombre', 'nombres', 'nombre completo'], empresa: ['empresa', 'compañia', 'compañía', 'contratista'], cargo: ['cargo', 'rol', 'oficio'] }

/**
 * CSV de aprendices: columnas cedula,nombre,empresa,cargo (encabezado opcional; coma o punto y coma).
 * Devuelve { trainees, errors } — errores por línea sin detener la importación.
 */
export function parseTraineesCSV(text) {
  const lines = String(text).replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return { trainees: [], errors: ['Archivo vacío'] }
  const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ','
  let cols = ['cedula', 'nombre', 'empresa', 'cargo'], start = 0
  const first = splitLine(lines[0], sep).map((h) => h.toLowerCase())
  if (first.some((h) => Object.values(HEAD).flat().includes(h))) {
    cols = first.map((h) => Object.keys(HEAD).find((k) => HEAD[k].includes(h)) || null)
    start = 1
  }
  const trainees = [], errors = [], seen = new Set()
  for (let i = start; i < lines.length; i++) {
    const v = splitLine(lines[i], sep), t = {}
    cols.forEach((c, j) => { if (c) t[c] = v[j] ?? '' })
    const ced = normCedula(t.cedula)
    if (!ced) { errors.push(`Línea ${i + 1}: falta la cédula`); continue }
    if (!t.nombre) { errors.push(`Línea ${i + 1}: falta el nombre`); continue }
    if (seen.has(ced)) { errors.push(`Línea ${i + 1}: cédula repetida ${ced}`); continue }
    seen.add(ced)
    trainees.push({ cedula: ced, nombre: t.nombre, empresa: t.empresa || '', cargo: t.cargo || '' })
  }
  return { trainees, errors }
}

const csvCell = (v) => { const s = v == null ? '' : String(v); return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
const MODE = { aprendizaje: 'Aprendizaje', practica: 'Práctica', evaluacion: 'Evaluación' }

/** CSV de resultados (una fila por intento), separado por punto y coma para Excel en español */
export function resultsToCSV(attempts) {
  const head = ['codigo', 'fecha', 'cedula', 'nombre', 'empresa', 'escenario', 'modo', 'puntaje', 'aprobado', 'completo', 'criticos', 'errores', 'duracion_s', 'dispositivo']
  const rows = attempts.map((a) => [
    a.id, a.startedAt, a.trainee?.cedula, a.trainee?.nombre, a.trainee?.empresa, a.scenarioTitle || a.scenarioId, MODE[a.mode] || a.mode,
    a.score, a.passed ? 'SI' : 'NO', a.completed ? 'SI' : 'NO', a.criticos ?? (a.errors || []).filter((e) => e.severity === 'critico').length,
    (a.errors || []).length, a.durationSec, a.device,
  ])
  return '﻿' + [head, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n')
}

/** paquete JSON completo */
export function buildExport({ trainees, attempts, appVersion, now = new Date() }) {
  return { format: 'hseqgate', version: 1, appVersion, exportedAt: now.toISOString(), trainees, attempts }
}

/**
 * Une un paquete importado con lo existente: intentos por id (no se duplican), aprendices por
 * cédula (el importado completa los campos vacíos).  Devuelve lo que hay que guardar y un resumen.
 */
export function mergeImport(pkg, { trainees = [], attempts = [] }) {
  if (!pkg || pkg.format !== 'hseqgate' || !Array.isArray(pkg.attempts)) throw new Error('El archivo no es una exportación de HSEQ Gate')
  const haveA = new Set(attempts.map((a) => a.id))
  const haveT = new Map(trainees.map((t) => [t.cedula, t]))
  const newAttempts = pkg.attempts.filter((a) => a && a.id && !haveA.has(a.id))
  const upTrainees = []
  for (const t of pkg.trainees || []) {
    const c = normCedula(t.cedula)
    if (!c) continue
    const cur = haveT.get(c)
    if (!cur) upTrainees.push({ cedula: c, nombre: t.nombre || '', empresa: t.empresa || '', cargo: t.cargo || '' })
    else if ((!cur.nombre && t.nombre) || (!cur.empresa && t.empresa) || (!cur.cargo && t.cargo)) upTrainees.push({ ...cur, nombre: cur.nombre || t.nombre, empresa: cur.empresa || t.empresa || '', cargo: cur.cargo || t.cargo || '' })
  }
  return { attempts: newAttempts, trainees: upTrainees, summary: `${newAttempts.length} intentos nuevos (${pkg.attempts.length - newAttempts.length} ya existían), ${upTrainees.length} aprendices nuevos o completados` }
}

/** nombre de archivo de exportación (quest.ps1 -PullResults busca hseqgate-*.json) */
export const exportName = (ext, now = new Date()) => `hseqgate-resultados-${now.toISOString().slice(0, 16).replace(/[-:T]/g, '')}.${ext}`
