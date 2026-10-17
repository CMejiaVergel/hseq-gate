import * as THREE from 'three'
import { quatFromUp } from '../geometry/builder.js'

/*
 * Piezas ESTÁTICAS de los objetos interactivos, para fusionarlas en el colector del entorno
 * (una llamada de dibujo para todo).  Los componentes del kit (kit.jsx) solo agregan lo que se
 * mueve o cambia de aspecto (volante, palanca, aguja, candados…) y la malla de selección.
 *
 * Convención: `rotY` gira la pieza alrededor de Y; el «frente» de los tableros mira a +Z local.
 */
const R = (rotY) => new THREE.Matrix4().makeRotationY(rotY || 0)
const at = (base, rotY, local) => { const v = new THREE.Vector3(...local).applyMatrix4(R(rotY)); return [base[0] + v.x, base[1] + v.y, base[2] + v.z] }

/** válvula de compuerta en línea horizontal (eje del tubo según `axis` 'x'|'z'), volante arriba en y + h */
export function gateValveBody(c, pos, { axis = 'x', D = 0.15, h = 0.55, mat = 'darksteel' } = {}) {
  const dir = axis === 'x' ? [1, 0, 0] : [0, 0, 1]
  c.cyl(D * 0.75, D * 1.6, mat, { pos, quat: quatFromUp(dir), seg: 14 })
  for (const s of [-1, 1]) c.flange([pos[0] + dir[0] * s * D * 0.85, pos[1], pos[2] + dir[2] * s * D * 0.85], dir, D / 2)
  c.box(D * 0.9, h * 0.55, D * 0.6, mat, { pos: [pos[0], pos[1] + h * 0.35, pos[2]] })            // bonete
  c.cyl(0.012, h * 0.5, 'silver', { pos: [pos[0], pos[1] + h * 0.75, pos[2]], seg: 6 })            // vástago
}

/** gabinete de CCM / tablero con `n` cubículos en columna doble; devuelve las posiciones de las palancas */
export function mccCabinet(c, pos, rotY, { n = 6, w = 1.6, h = 2.1, d = 0.5 } = {}) {
  c.box(w, h, d, 'panel', { pos: [pos[0], pos[1] + h / 2, pos[2]], rot: [0, rotY, 0] })
  c.box(w + 0.04, 0.1, d + 0.04, 'darksteel', { pos: [pos[0], pos[1] + 0.05, pos[2]], rot: [0, rotY, 0] })
  const slots = []
  const cols = 2, rows = Math.ceil(n / cols), cw = w / cols, rh = (h - 0.4) / rows
  for (let i = 0; i < n; i++) {
    const col = i % cols, row = Math.floor(i / cols)
    const lx = -w / 2 + cw * (col + 0.5), ly = h - 0.25 - rh * (row + 0.5)
    c.box(cw - 0.08, rh - 0.08, 0.02, 'wall2', { pos: at(pos, rotY, [lx, ly, d / 2 + 0.01]), rot: [0, rotY, 0] })   // puerta del cubículo
    c.box(0.16, 0.22, 0.04, 'black', { pos: at(pos, rotY, [lx + 0.18, ly, d / 2 + 0.03]), rot: [0, rotY, 0] })      // base del interruptor
    slots.push({ lever: at(pos, rotY, [lx + 0.18, ly, d / 2 + 0.06]), label: at(pos, rotY, [lx - 0.12, ly + 0.08, d / 2 + 0.025]), hasp: at(pos, rotY, [lx + 0.18, ly - 0.17, d / 2 + 0.05]) })
  }
  return slots
}

/** botonera local en pedestal (arranque verde / parada roja); devuelve posiciones de los botones */
export function pushStation(c, pos, rotY) {
  c.cyl(0.03, 1.1, 'galv', { pos: [pos[0], 0.55, pos[2]], seg: 8 })
  c.box(0.16, 0.26, 0.12, 'yellow', { pos: [pos[0], 1.2, pos[2]], rot: [0, rotY, 0] })
  const g = at(pos, rotY, [0, 1.26 - pos[1], 0.065]), r = at(pos, rotY, [0, 1.14 - pos[1], 0.065])
  g[1] = 1.26; r[1] = 1.14
  c.cyl(0.028, 0.025, 'green', { pos: g, quat: quatFromUp([Math.sin(rotY), 0, Math.cos(rotY)]), seg: 12 })
  c.cyl(0.032, 0.03, 'red', { pos: r, quat: quatFromUp([Math.sin(rotY), 0, Math.cos(rotY)]), seg: 12 })
  return { start: g, stop: r }
}

/** carátula de manómetro (la aguja la pone el kit) */
export function gaugeFace(c, pos, rotY, r = 0.06) {
  const n = [Math.sin(rotY), 0, Math.cos(rotY)]
  c.cyl(r, 0.03, 'darksteel', { pos, quat: quatFromUp(n), seg: 18 })
  c.cyl(r * 0.88, 0.032, 'dial', { pos: [pos[0] + n[0] * 0.002, pos[1], pos[2] + n[2] * 0.002], quat: quatFromUp(n), seg: 18 })
  c.cyl(0.008, 0.08, 'silver', { pos: [pos[0] - n[0] * 0.05, pos[1], pos[2] - n[2] * 0.05], quat: quatFromUp(n), seg: 6 })
}

/** tablero de pared con hojas (documentos); el texto lo pone un letrero */
export function board(c, pos, rotY, w = 0.9, h = 0.7) {
  c.box(w, h, 0.03, 'wood', { pos, rot: [0, rotY, 0] })
}

/** estación de bloqueo: tablero perforado con ganchos */
export function lockStation(c, pos, rotY, w = 1.4, h = 1.0) {
  c.box(w, h, 0.03, 'red', { pos, rot: [0, rotY, 0] })
  c.box(w - 0.08, h - 0.08, 0.035, 'white', { pos: at(pos, rotY, [0, 0, 0.004]), rot: [0, rotY, 0] })
  for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) c.cyl(0.006, 0.06, 'silver', { pos: at(pos, rotY, [-w / 2 + 0.15 + i * (w - 0.3) / 5, h / 2 - 0.25 - j * 0.28, 0.04]), quat: quatFromUp([Math.sin(rotY), 0, Math.cos(rotY)]), seg: 5 })
}

/** persona low-poly (NPC): botas, pantalón, camisa, chaleco, cabeza, casco */
export function person(c, pos, rotY, { shirt = 'shirt', vest = 'vest', helmet = 'helmet' } = {}) {
  const [x, , z] = pos
  for (const s of [-0.1, 0.1]) {
    const p = at([x, 0, z], rotY, [s, 0, 0])
    c.box(0.12, 0.1, 0.24, 'black', { pos: [p[0], 0.05, p[2]], rot: [0, rotY, 0] })
    c.cyl(0.07, 0.8, 'pants', { pos: [p[0], 0.5, p[2]], seg: 8 })
  }
  c.box(0.42, 0.62, 0.24, shirt, { pos: [x, 1.2, z], rot: [0, rotY, 0] })
  c.box(0.44, 0.45, 0.26, vest, { pos: [x, 1.26, z], rot: [0, rotY, 0] })
  for (const s of [-0.27, 0.27]) { const p = at([x, 0, z], rotY, [s, 0, 0]); c.cyl(0.055, 0.6, shirt, { pos: [p[0], 1.18, p[2]], seg: 8 }) }
  c.cyl(0.05, 0.08, 'skin', { pos: [x, 1.55, z], seg: 8 })
  c.sphere(0.11, 'skin', { pos: [x, 1.68, z], seg: 12, rings: 8 })
  c.sphere(0.125, helmet, { pos: [x, 1.73, z], seg: 12, rings: 6 })
  c.cyl(0.15, 0.015, helmet, { pos: [x, 1.71, z], seg: 14 })
}

/** cono de tránsito */
export function cone(c, x, z) { c.cone(0.14, 0.5, 'orange', { pos: [x, 0.27, z], seg: 10 }); c.box(0.3, 0.03, 0.3, 'black', { pos: [x, 0.015, z] }) }
