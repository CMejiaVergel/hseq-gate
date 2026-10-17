/*
 * Física de caminar (versión genérica de plant/walk.js de Smart Plant 3D).
 *
 * Cada entorno registra, al construirse, su mundo caminable:
 *
 *  Límites        rectángulo [x0, z0, x1, z1] del que no se sale.
 *  Superficies    planos (plataformas, rellanos) y rampas (escaleras).  El suelo (y = 0) sostiene
 *                 salvo dentro de los «huecos» (foso, manhole).  Sobre una superficie elevada solo
 *                 se pasa a otra a menos de STEP de altura: no hay forma de caerse de una
 *                 plataforma caminando (la caída del escenario de alturas la decide el motor).
 *  Obstáculos     círculos, rectángulos y segmentos con rango vertical [y0, y1].
 *  Ascensos       escaleras verticales: pie y llegada (teletransporte con el botón A / tecla F).
 *
 * Los mundos son pequeños (decenas de obstáculos): se recorren en lista, sin grilla.
 * Coordenadas del escenario en metros, origen en su centro, Y arriba.
 */

export const STEP = 0.55, DROP = 0.6, PR = 0.28, EYE = 1.65, HEAD_H = 1.75

const fresh = () => ({ bounds: [-15, -15, 15, 15], flats: [], ramps: [], holes: [], obst: [], climbs: [], floor: 0 })
let W = fresh()

export function resetWalk(bounds) { W = fresh(); if (bounds) W.bounds = bounds }
export const walkWorld = () => W

/* ---------- registro ---------- */
/** rectángulo plano centrado en (cx, cz) con semiejes hx, hz a altura y */
export function addFlat(cx, cz, hx, hz, y) { W.flats.push({ cx, cz, hx, hz, y }) }
/** rampa (escalera inclinada) de a = [x, y, z] a b, ancho w */
export function addRamp(a, b, w) {
  const dx = b[0] - a[0], dz = b[2] - a[2], len = Math.hypot(dx, dz)
  if (len > 0.05) W.ramps.push({ ax: a[0], az: a[2], ay: a[1], by: b[1], len, ux: dx / len, uz: dz / len, hw: w / 2 + 0.05 })
}
/** hueco en el suelo (y = 0 no sostiene dentro): rectángulo */
export function addHole(cx, cz, hx, hz) { W.holes.push({ cx, cz, hx, hz }) }
export const addCircle = (cx, cz, r, y0 = 0, y1 = 3) => W.obst.push({ k: 0, cx, cz, r, y0, y1 })
export const addRect = (cx, cz, hx, hz, y0 = 0, y1 = 3) => W.obst.push({ k: 1, cx, cz, hx, hz, y0, y1 })
export const addSeg = (ax, az, bx, bz, r = 0.1, y0 = 0, y1 = 3) => W.obst.push({ k: 2, ax, az, bx, bz, r, y0, y1 })
/** escalera vertical: { id, foot: [x, z, y], top: [x, z, y], yaw (al llegar arriba) } */
export function addClimb(c) { W.climbs.push(c) }
export const climbs = () => W.climbs

/* ---------- altura del suelo ---------- */
const inRect = (s, x, z) => Math.abs(x - s.cx) <= s.hx && Math.abs(z - s.cz) <= s.hz
function rampY(s, x, z) {
  const dx = x - s.ax, dz = z - s.az, along = dx * s.ux + dz * s.uz, across = -dx * s.uz + dz * s.ux
  if (along < -0.12 || along > s.len + 0.12 || Math.abs(across) > s.hw) return null
  return s.ay + (s.by - s.ay) * Math.min(1, Math.max(0, along / s.len))
}

/** altura del suelo en (x, z) para alguien que está a `fromY`; null = sin apoyo */
export function heightAt(x, z, fromY) {
  let best = null
  const groundOk = !W.holes.some((h) => inRect(h, x, z))
  if (groundOk && 0 >= fromY - DROP && 0 <= fromY + STEP) best = 0
  for (const s of W.flats) {
    if (!inRect(s, x, z) || s.y > fromY + STEP || s.y < fromY - DROP) continue
    if (best === null || s.y > best) best = s.y
  }
  for (const s of W.ramps) {
    const y = rampY(s, x, z)
    if (y === null || y > fromY + STEP || y < fromY - DROP) continue
    if (best === null || y > best) best = y
  }
  return best
}

/** superficie más alta por debajo de maxY (para apuntar el teletransporte) */
export function surfaceBelow(x, z, maxY) {
  let best = W.holes.some((h) => inRect(h, x, z)) ? -99 : 0
  for (const s of W.flats) if (inRect(s, x, z) && s.y <= maxY && s.y > best) best = s.y
  for (const s of W.ramps) { const y = rampY(s, x, z); if (y !== null && y <= maxY && y > best) best = y }
  return best
}

/* ---------- colisión ---------- */
const active = (o, y) => o.y1 > y + 0.3 && o.y0 < y + HEAD_H
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

/** empuja (x, z) fuera de los obstáculos; devuelve [x, z, huboContacto] */
export function resolve(x, z, y, r = PR) {
  let hit = false
  for (let it = 0; it < 4; it++) {
    let moved = false
    for (const o of W.obst) {
      if (!active(o, y)) continue
      let nx, nz, d, need
      if (o.k === 0) { nx = x - o.cx; nz = z - o.cz; d = Math.hypot(nx, nz); need = o.r + r }
      else if (o.k === 1) {
        const px = clamp(x, o.cx - o.hx, o.cx + o.hx), pz = clamp(z, o.cz - o.hz, o.cz + o.hz)
        nx = x - px; nz = z - pz; d = Math.hypot(nx, nz); need = r
        if (d < 1e-6) {
          const l = x - (o.cx - o.hx), rr = o.cx + o.hx - x, u = z - (o.cz - o.hz), dd = o.cz + o.hz - z, m = Math.min(l, rr, u, dd)
          if (m === l) x = o.cx - o.hx - r; else if (m === rr) x = o.cx + o.hx + r; else if (m === u) z = o.cz - o.hz - r; else z = o.cz + o.hz + r
          moved = hit = true; continue
        }
      } else {
        const vx = o.bx - o.ax, vz = o.bz - o.az, l2 = vx * vx + vz * vz
        const t = l2 < 1e-9 ? 0 : clamp(((x - o.ax) * vx + (z - o.az) * vz) / l2, 0, 1)
        nx = x - (o.ax + vx * t); nz = z - (o.az + vz * t); d = Math.hypot(nx, nz); need = o.r + r
        if (d < 1e-6) { const l = Math.sqrt(l2) || 1; nx = -vz / l; nz = vx / l; d = 1 }
      }
      if (d < need) { x += (nx / d) * (need - d); z += (nz / d) * (need - d); moved = hit = true }
    }
    const [x0, z0, x1, z1] = W.bounds
    if (x < x0 + r) { x = x0 + r; moved = hit = true } else if (x > x1 - r) { x = x1 - r; moved = hit = true }
    if (z < z0 + r) { z = z0 + r; moved = hit = true } else if (z > z1 - r) { z = z1 - r; moved = hit = true }
    if (!moved) break
  }
  return [x, z, hit]
}

/** mueve al jugador p = { x, z, y } por (dx, dz) con deslizamiento; y sigue el suelo */
export function moveStep(p, dx, dz) {
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.12)), sx = dx / n, sz = dz / n
  const to = (nx, nz) => {
    const [rx, rz] = resolve(nx, nz, p.y)
    const gy = heightAt(rx, rz, p.y)
    if (gy === null) return false
    p.x = rx; p.z = rz; p.y = gy
    return true
  }
  for (let i = 0; i < n; i++) if (!to(p.x + sx, p.z + sz) && !to(p.x + sx, p.z)) to(p.x, p.z + sz)
  return p
}

/** ¿se puede estar de pie en (x, z, y)? */
export function isFree(x, z, y) {
  if (heightAt(x, z, y) === null) return false
  const [rx, rz, hit] = resolve(x, z, y)
  return !hit && rx === x && rz === z
}

/** punto libre más cercano a (x, z) a la altura y */
export function nearestFree(x, z, y = 0, maxR = 8) {
  if (isFree(x, z, y)) return { x, z, y: heightAt(x, z, y) }
  for (let r = 0.25; r <= maxR; r += 0.25) {
    const n = Math.max(8, Math.round(r * 12))
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r
      if (isFree(px, pz, y)) return { x: px, z: pz, y: heightAt(px, pz, y) }
    }
  }
  return { x, z, y }
}

/** convención: adelante = (−sen yaw, −cos yaw) */
export const yawToward = (fx, fz, tx, tz) => Math.atan2(-(tx - fx), -(tz - fz))

/** estado del jugador (lo comparten FirstPerson, VRRig y el motor vía tick) */
export const PLAYER = { x: 0, z: 0, y: 0, yaw: 0, started: false }
export const START = { x: 0, z: 4, y: 0, yaw: 0 }
export function setStart(s) { Object.assign(START, { y: 0, yaw: 0, ...s }); PLAYER.started = false }

/** escalera vertical más cercana a (x, z) a la altura y (arriba o abajo) */
export function nearestClimb(x, z, y, maxD = 2) {
  let best = null, bd = maxD
  for (const c of W.climbs) {
    const atFoot = Math.abs(y - c.foot[2]) < 0.8, atTop = Math.abs(y - c.top[2]) < 1.2
    if (atFoot) { const d = Math.hypot(c.foot[0] - x, c.foot[1] - z); if (d < bd) { bd = d; best = { c, up: c.top[2] > c.foot[2] } } }
    if (atTop) { const d = Math.hypot(c.top[0] - x, c.top[1] - z); if (d < bd) { bd = d; best = { c, up: c.top[2] < c.foot[2] } } }
  }
  if (best) best.toTop = Math.abs(y - best.c.foot[2]) < 0.8
  return best
}

if (import.meta.env?.DEV) globalThis.__walk = { get W() { return W }, heightAt, moveStep, resolve, isFree, nearestFree, PLAYER }
