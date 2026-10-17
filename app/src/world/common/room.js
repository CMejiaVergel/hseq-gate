import { addSeg } from '../../walk/walk.js'

/*
 * Habitaciones y muros (piezas comunes de los entornos).  Cada muro se agrega al colector y
 * registra su obstáculo de caminar.  Huecos de puerta: [desde, hasta] a lo largo del muro.
 */
const T = 0.2

/** muro de (ax, az) a (bx, bz), alto h, con huecos [[d0, d1, altoHueco]] medidos desde a */
export function wall(c, ax, az, bx, bz, h = 3, mat = 'wall', gaps = []) {
  const len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len, ang = Math.atan2(-uz, ux)
  const cuts = [[0, 0], ...gaps.slice().sort((a, b) => a[0] - b[0]), [len, len]]
  for (let i = 0; i < cuts.length - 1; i++) {
    const s0 = cuts[i][1], s1 = cuts[i + 1][0]
    if (s1 - s0 > 0.01) {
      const m = (s0 + s1) / 2
      c.box(s1 - s0, h, T, mat, { pos: [ax + ux * m, h / 2, az + uz * m], rot: [0, ang, 0] })
      addSeg(ax + ux * s0, az + uz * s0, ax + ux * s1, az + uz * s1, T / 2 + 0.02, 0, h)
    }
    const g = gaps[i]
    if (g && g[2] != null && g[2] < h) {          // dintel sobre el hueco
      const m = (g[0] + g[1]) / 2
      c.box(g[1] - g[0], h - g[2], T, mat, { pos: [ax + ux * m, g[2] + (h - g[2]) / 2, az + uz * m], rot: [0, ang, 0] })
    }
  }
}

/** sala rectangular [x0, z0, x1, z1] con piso, cielo raso y muros; doors = { n|s|e|w: [[d0, d1, h]] } */
export function room(c, x0, z0, x1, z1, { h = 3, wallMat = 'wall', floorMat = 'floor', ceiling = true, ceilMat = 'white', doors = {} } = {}) {
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
  c.box(w, 0.1, d, floorMat, { pos: [cx, -0.05, cz] })
  if (ceiling) c.box(w, 0.08, d, ceilMat, { pos: [cx, h + 0.04, cz] })
  wall(c, x0, z0, x1, z0, h, wallMat, doors.n || [])   // norte (z0)
  wall(c, x0, z1, x1, z1, h, wallMat, doors.s || [])   // sur (z1)
  wall(c, x0, z0, x0, z1, h, wallMat, doors.w || [])   // oeste (x0)
  wall(c, x1, z0, x1, z1, h, wallMat, doors.e || [])   // este (x1)
}

/** luminaria de techo (caja emisiva) */
export function ceilingLight(c, x, z, y = 2.95, w = 1.2, d = 0.3) {
  c.box(w + 0.06, 0.06, d + 0.06, 'galv', { pos: [x, y, z] })
  c.box(w, 0.02, d, 'lamp', { pos: [x, y - 0.035, z] })
}
