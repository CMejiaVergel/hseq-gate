/*
 * Lenguaje de condiciones (docs/02).  Objetos JSON evaluados contra el contexto del intento:
 *
 *   ctx = { state, flags:Set, readings, done:Set, inventory:[], hand, player:{x,y,z}, objects,
 *           timers, time, mode, variant, phasesDone:Set }
 *
 *   { state: [ruta, valor] }              igual (ruta = 'obj' o 'obj.campo.sub')
 *   { state: [ruta, op, valor] }          op ∈ 'in' 'has' 'lacks' '<' '<=' '>' '>=' '==' '!='
 *                                         ('has'/'lacks' sobre listas: id del objeto o su `group`)
 *   { count: [ruta, op, n] }              tamaño de una lista
 *   { reading: [nombre, op, n] }          valor derivado (readings del escenario)
 *   { flag: nombre }                      bandera puesta
 *   { stepDone: id }  { phaseDone: id }   paso / fase completados
 *   { has: itemOGrupo }                   el aprendiz lo lleva en el inventario
 *   { hand: itemOGrupo | null }           lo que tiene en la mano (null = mano vacía)
 *   { near: [objId, metros] }             el jugador está a menos de N m (pos o segmento del objeto)
 *   { timer: [nombre, op, s] }            temporizador del escenario
 *   { elapsed: [ruta, op, s] }            segundos desde el instante guardado en la ruta
 *   { complete: checklistId }             checklist con todos los correctos y ningún distractor
 *   { sequence: [ruta, [a, b, c]] }       la lista contiene a, b, c consecutivos
 *   { mode: 'evaluacion' | [..] }         modo del intento
 *   { variant: [clave, valor] }           variación sorteada con la semilla
 *   { all: [c…] }  { any: [c…] }  { not: c }   true · false
 *
 * Sin funciones dentro de las condiciones: así son serializables y revisables por un experto HSE.
 */

export function getPath(state, path) {
  const parts = String(path).split('.')
  let v = state[parts[0]]
  for (let i = 1; i < parts.length && v != null; i++) v = v[parts[i]]
  return v
}

/** ¿el id (o su grupo) está en la lista? */
export function listHas(list, v, objects) {
  if (!Array.isArray(list)) return false
  return list.some((id) => id === v || objects?.[id]?.group === v)
}

const OPS = {
  '<': (a, b) => a < b, '<=': (a, b) => a <= b, '>': (a, b) => a > b, '>=': (a, b) => a >= b,
  '==': (a, b) => a === b, '!=': (a, b) => a !== b,
}
export const isOp = (op) => op in OPS || op === 'in' || op === 'has' || op === 'lacks'

function compare(v, op, b, objects) {
  if (op === 'in') return Array.isArray(b) && b.includes(v)
  if (op === 'has') return listHas(v, b, objects)
  if (op === 'lacks') return !listHas(v, b, objects)
  const f = OPS[op]
  if (!f) throw new Error('Operador desconocido: ' + op)
  if ((op !== '==' && op !== '!=') && (typeof v !== 'number' || Number.isNaN(v))) return false
  return f(v, b)
}

/** distancia horizontal del jugador al objeto (punto o segmento); Infinity si no aplica */
export function distanceTo(def, player) {
  if (!def || !player) return Infinity
  if (def.y != null && Math.abs((player.y ?? 0) - def.y) > (def.dy ?? 1.5)) return Infinity
  if (def.segment) {
    const [[ax, az], [bx, bz]] = def.segment
    const vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz
    const t = l2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((player.x - ax) * vx + (player.z - az) * vz) / l2))
    return Math.hypot(player.x - (ax + vx * t), player.z - (az + vz * t))
  }
  if (def.pos) {
    if (def.pos.length === 3 && def.y == null && Math.abs((player.y ?? 0) - def.pos[1]) > (def.dy ?? 2.5)) return Infinity
    const x = def.pos[0], z = def.pos.length === 3 ? def.pos[2] : def.pos[1]
    return Math.hypot(player.x - x, player.z - z)
  }
  return Infinity
}

export function checklistComplete(def, marked) {
  if (!def?.items || !Array.isArray(marked)) return false
  for (const it of def.items) {
    const on = marked.includes(it.id)
    if (it.correct !== false && !on) return false
    if (it.correct === false && on) return false
  }
  return true
}

export function evalCond(c, ctx) {
  if (c === true || c == null) return true
  if (c === false) return false
  if (Array.isArray(c)) return c.every((x) => evalCond(x, ctx))
  if ('all' in c) return c.all.every((x) => evalCond(x, ctx))
  if ('any' in c) return c.any.some((x) => evalCond(x, ctx))
  if ('not' in c) return !evalCond(c.not, ctx)
  if ('state' in c) {
    const [path, a, b] = c.state
    const v = getPath(ctx.state, path)
    if (c.state.length === 2) return v === a || (v != null && a != null && typeof v === 'object' && JSON.stringify(v) === JSON.stringify(a))
    return compare(v, a, b, ctx.objects)
  }
  if ('count' in c) { const [path, op, n] = c.count; const v = getPath(ctx.state, path); return compare(Array.isArray(v) ? v.length : 0, op, n) }
  if ('reading' in c) { const [name, op, n] = c.reading; return compare(ctx.readings?.[name], op, n) }
  if ('flag' in c) return ctx.flags.has(c.flag)
  if ('stepDone' in c) return ctx.done.has(c.stepDone)
  if ('phaseDone' in c) return ctx.phasesDone?.has(c.phaseDone) ?? false
  if ('has' in c) return listHas(ctx.inventory, c.has, ctx.objects)
  if ('hand' in c) return c.hand === null ? ctx.hand == null : (ctx.hand != null && (ctx.hand === c.hand || ctx.objects?.[ctx.hand]?.group === c.hand))
  if ('near' in c) { const [id, m] = c.near; return distanceTo(ctx.objects?.[id], ctx.player) < m }
  if ('timer' in c) { const [name, op, s] = c.timer; return compare(ctx.timers?.[name] ?? 0, op, s) }
  if ('elapsed' in c) { const [path, op, s] = c.elapsed; const t0 = getPath(ctx.state, path); return typeof t0 === 'number' && compare(ctx.time - t0, op, s) }
  if ('complete' in c) return checklistComplete(ctx.objects?.[c.complete], ctx.state[c.complete])
  if ('sequence' in c) {
    const [path, seq] = c.sequence
    const list = getPath(ctx.state, path)
    if (!Array.isArray(list)) return false
    for (let i = 0; i + seq.length <= list.length; i++) if (seq.every((s, k) => list[i + k] === s)) return true
    return false
  }
  if ('mode' in c) return Array.isArray(c.mode) ? c.mode.includes(ctx.mode) : ctx.mode === c.mode
  if ('variant' in c) { const [k, v] = c.variant; return ctx.variant?.[k] === v }
  throw new Error('Condición desconocida: ' + JSON.stringify(c))
}

/** recorre una condición y llama fn(nodo) en cada hoja (para el validador) */
export function walkCond(c, fn) {
  if (c == null || typeof c !== 'object') return
  if (Array.isArray(c)) { c.forEach((x) => walkCond(x, fn)); return }
  if ('all' in c) { c.all.forEach((x) => walkCond(x, fn)); return }
  if ('any' in c) { c.any.forEach((x) => walkCond(x, fn)); return }
  if ('not' in c) { walkCond(c.not, fn); return }
  fn(c)
}
