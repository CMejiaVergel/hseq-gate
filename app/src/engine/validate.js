import { walkCond, isOp } from './conditions.js'
import { KINDS, verbsOf } from './kinds.js'
import { totalPoints } from './scoring.js'

/*
 * Validador de escenarios (docs/02): ids únicos, referencias existentes, verbos válidos para el
 * kind, condiciones bien formadas, puntos que suman 100 y todo paso con forma de completarse.
 * Devuelve la lista de problemas (vacía = válido).  Se ejecuta en las pruebas y en DEV al cargar.
 */
const SEVERITIES = ['menor', 'mayor', 'critico']
const LEAVES = ['state', 'count', 'reading', 'flag', 'stepDone', 'phaseDone', 'has', 'hand', 'near', 'timer', 'elapsed', 'complete', 'sequence', 'mode', 'variant']

export function validate(sc) {
  const P = []
  const err = (m) => P.push(m)
  if (!sc || typeof sc !== 'object') return ['El escenario no es un objeto']
  for (const k of ['id', 'title', 'objects', 'phases']) if (!sc[k]) err(`Falta «${k}»`)
  if (P.length) return P

  const objects = { jugador: { kind: 'player' }, ...sc.objects }
  const groups = new Set(Object.values(objects).map((o) => o.group).filter(Boolean))
  for (const [id, def] of Object.entries(sc.objects)) {
    if (!KINDS[def.kind]) err(`Objeto ${id}: kind desconocido «${def.kind}»`)
    if (!def.label) err(`Objeto ${id}: falta label`)
    if (def.kind === 'gauge' && !(def.reading in (sc.readings || {}))) err(`Objeto ${id}: lectura «${def.reading}» inexistente`)
    if (def.kind === 'tester') for (const r of Object.values(def.reads || {})) if (!(r in (sc.readings || {}))) err(`Objeto ${id}: lectura «${r}» inexistente`)
    if (def.kind === 'gasdetector' && def.reading && !(def.reading in (sc.readings || {}))) err(`Objeto ${id}: lectura «${def.reading}» inexistente`)
    if (['radio', 'person', 'quiz'].includes(def.kind) && !def.options?.length) err(`Objeto ${id}: faltan options`)
    if (def.kind === 'checklist' && !def.items?.length) err(`Objeto ${id}: faltan items`)
    if (def.kind === 'lockpoint') for (const it of def.preset || []) if (!objects[it]) err(`Objeto ${id}: preset «${it}» inexistente`)
  }

  const stepIds = new Set(), phaseIds = new Set(), errorIds = new Set()
  for (const ph of sc.phases) {
    if (phaseIds.has(ph.id)) err(`Fase repetida: ${ph.id}`)
    phaseIds.add(ph.id)
    if (!['strict', 'any'].includes(ph.order)) err(`Fase ${ph.id}: order debe ser 'strict' o 'any'`)
    if (!ph.steps?.length) err(`Fase ${ph.id}: sin pasos`)
    for (const s of ph.steps || []) {
      if (stepIds.has(s.id)) err(`Paso repetido: ${s.id}`)
      stepIds.add(s.id)
      if (!s.title) err(`Paso ${s.id}: falta title`)
      if (!s.done && !s.on) err(`Paso ${s.id}: no tiene forma de completarse (done u on)`)
      for (const t of s.targets || []) if (!objects[t]) err(`Paso ${s.id}: objetivo «${t}» inexistente`)
    }
  }
  if (totalPoints(sc) !== 100) err(`Los pasos suman ${totalPoints(sc)} puntos (deben sumar 100)`)

  const checkAct = (where, pat) => {
    if (!Array.isArray(pat)) { err(`${where}: patrón de acción inválido`); return }
    if (pat.every(Array.isArray)) { pat.forEach((p) => checkAct(where, p)); return }
    const [o, v] = pat
    const objs = o === '*' ? [] : Array.isArray(o) ? o : [o]
    for (const id of objs) {
      if (!objects[id]) { err(`${where}: objeto «${id}» inexistente`); continue }
      if (v !== '*' && !verbsOf(objects[id]).includes(v)) err(`${where}: verbo «${v}» no válido para ${id} (${objects[id].kind})`)
    }
  }
  const checkCond = (where, c) => walkCond(c, (leaf) => {
    if (leaf === true || leaf === false) return
    const k = Object.keys(leaf)[0]
    if (!LEAVES.includes(k)) { err(`${where}: condición desconocida «${k}»`); return }
    const v = leaf[k]
    if (k === 'state' || k === 'count' || k === 'elapsed' || k === 'sequence') {
      const id = String(v[0]).split('.')[0]
      if (!objects[id]) err(`${where}: objeto «${id}» inexistente`)
      if ((k === 'state' && v.length === 3) || k === 'count' || k === 'elapsed') if (!isOp(v[1])) err(`${where}: operador «${v[1]}» desconocido`)
    }
    if (k === 'reading' && !(v[0] in (sc.readings || {}))) err(`${where}: lectura «${v[0]}» inexistente`)
    if (k === 'stepDone' && !stepIds.has(v)) err(`${where}: paso «${v}» inexistente`)
    if (k === 'phaseDone' && !phaseIds.has(v)) err(`${where}: fase «${v}» inexistente`)
    if ((k === 'has' || (k === 'hand' && v !== null)) && !objects[v] && !groups.has(v)) err(`${where}: item o grupo «${v}» inexistente`)
    if (k === 'near') { const d = objects[v[0]]; if (!d) err(`${where}: objeto «${v[0]}» inexistente`); else if (!d.pos && !d.segment) err(`${where}: «${v[0]}» no tiene pos ni segment`) }
    if (k === 'timer' && !(v[0] in (sc.timers || {}))) err(`${where}: temporizador «${v[0]}» inexistente`)
    if (k === 'complete' && objects[v]?.kind !== 'checklist') err(`${where}: «${v}» no es un checklist`)
  })

  for (const ph of sc.phases) for (const s of ph.steps || []) {
    if (s.done) checkCond(`Paso ${s.id}`, s.done)
    if (s.on) checkAct(`Paso ${s.id}`, s.on.act)
    if (s.when) checkCond(`Paso ${s.id}`, s.when)
  }
  for (const e of sc.errors || []) {
    if (errorIds.has(e.id)) err(`Error repetido: ${e.id}`)
    errorIds.add(e.id)
    if (!SEVERITIES.includes(e.severity)) err(`Error ${e.id}: severidad «${e.severity}» inválida`)
    if (!e.message) err(`Error ${e.id}: falta message`)
    if (e.on !== 'tick') { if (!e.on?.act) err(`Error ${e.id}: on debe ser 'tick' o { act }`); else checkAct(`Error ${e.id}`, e.on.act) }
    if (e.when) checkCond(`Error ${e.id}`, e.when)
    if (e.severity === 'critico' && !e.explain) err(`Error ${e.id}: un crítico necesita explain`)
  }
  for (const [i, ef] of (sc.effects || []).entries()) {
    if (!ef.on?.act) err(`Efecto ${i}: falta on.act`); else checkAct(`Efecto ${i}`, ef.on.act)
    if (ef.when) checkCond(`Efecto ${i}`, ef.when)
    for (const id of Object.keys(ef.set || {})) if (!objects[id]) err(`Efecto ${i}: objeto «${id}» inexistente`)
  }
  for (const [k, t] of Object.entries(sc.timers || {})) if (t.while) checkCond(`Temporizador ${k}`, t.while)
  for (const tr of sc.triggers || []) {
    if (!tr.id) err('Disparador sin id')
    if (tr.when) checkCond(`Disparador ${tr.id}`, tr.when)
    for (const id of Object.keys(tr.set || {})) if (!objects[id]) err(`Disparador ${tr.id}: objeto «${id}» inexistente`)
  }
  return P
}
