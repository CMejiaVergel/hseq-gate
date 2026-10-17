import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { FAMILY_OF, familyMaterial, isSpecial, specialMaterial, paletteRGB } from './materials.js'

/*
 * Colector de geometría (adaptado de Smart Plant 3D).
 *
 * Las piezas se acumulan con su transformación ya aplicada y al final se fusionan en UNA malla
 * por material (los colores con nombre van en los vértices de su familia).  Todo un entorno
 * estático queda en un puñado de llamadas de dibujo: es lo que mantiene los 72 Hz del visor.
 * Lo que se mueve o se selecciona por separado se construye en su propio colector.
 */

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _e = new THREE.Euler()
const Y = new THREE.Vector3(0, 1, 0)

export const DIRS = {
  up: new THREE.Vector3(0, 1, 0), down: new THREE.Vector3(0, -1, 0),
  x: new THREE.Vector3(1, 0, 0), '-x': new THREE.Vector3(-1, 0, 0),
  z: new THREE.Vector3(0, 0, 1), '-z': new THREE.Vector3(0, 0, -1),
}
export const dirVec = (d) => (d instanceof THREE.Vector3 ? d : Array.isArray(d) ? new THREE.Vector3(d[0], d[1], d[2]) : DIRS[d] || DIRS.up)
/** cuaternión que lleva +Y a `dir` */
export const quatFromUp = (dir) => new THREE.Quaternion().setFromUnitVectors(Y, dirVec(dir).clone().normalize())

export class Collector {
  constructor() { this.groups = new Map() }

  add(geo, matName, { pos, quat, rot, scale } = {}) {
    _p.set(0, 0, 0); _q.identity(); _s.set(1, 1, 1)
    if (pos) _p.set(pos[0], pos[1], pos[2])
    if (quat) _q.copy(quat)
    else if (rot) _q.setFromEuler(_e.set(rot[0], rot[1], rot[2]))
    if (scale) _s.set(scale[0], scale[1], scale[2])
    _m.compose(_p, _q, _s)
    let g = geo.clone().applyMatrix4(_m)
    if (g.index) g = g.toNonIndexed()
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2))
    let key = matName
    const fam = FAMILY_OF[matName]
    if (fam) {
      key = 'fam:' + fam
      const col = paletteRGB(matName), n = g.attributes.position.count, arr = new Float32Array(n * 3)
      for (let i = 0; i < n; i++) { arr[i * 3] = col[0]; arr[i * 3 + 1] = col[1]; arr[i * 3 + 2] = col[2] }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
    } else if (!isSpecial(matName)) throw new Error('Material desconocido: ' + matName)
    if (!this.groups.has(key)) this.groups.set(key, [])
    this.groups.get(key).push(g)
    return this
  }

  /* --- primitivas (eje en +Y salvo indicación) --- */
  box(w, h, d, mat, o = {}) { return this.add(new THREE.BoxGeometry(w, h, d), mat, o) }
  cyl(r, h, mat, o = {}) { return this.add(new THREE.CylinderGeometry(o.r2 ?? r, r, h, o.seg ?? 16, 1, o.open ?? false), mat, o) }
  sphere(r, mat, o = {}) { return this.add(new THREE.SphereGeometry(r, o.seg ?? 14, o.rings ?? 10), mat, o) }
  torus(R, r, mat, o = {}) { return this.add(new THREE.TorusGeometry(R, r, o.tseg ?? 8, o.seg ?? 24, o.arc ?? Math.PI * 2), mat, o) }
  cone(r, h, mat, o = {}) { return this.add(new THREE.ConeGeometry(r, h, o.seg ?? 16), mat, o) }
  plane(w, h, mat, o = {}) { return this.add(new THREE.PlaneGeometry(w, h), mat, o) }

  /** tubo recto entre dos puntos */
  pipe(a, b, r, mat = 'steel', o = {}) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va), len = d.length()
    if (len < 1e-4) return this
    const mid = va.clone().addScaledVector(d, 0.5)
    return this.cyl(r, len, mat, { ...o, pos: mid.toArray(), quat: quatFromUp(d) })
  }
  /** tubería por una lista de puntos, con codos simples (esfera) en los quiebres */
  pipeline(points, r, mat = 'steel') {
    for (let i = 1; i < points.length; i++) this.pipe(points[i - 1], points[i], r, mat)
    for (let i = 1; i < points.length - 1; i++) this.sphere(r * 1.02, mat, { pos: points[i], seg: 10, rings: 8 })
    return this
  }
  /** brida simple (disco) */
  flange(pos, dir, r, mat = 'darksteel') { return this.cyl(r * 1.9, 0.03, mat, { pos, quat: quatFromUp(dir), seg: 14 }) }

  /** baranda recta de a → b (pasamanos, intermedio, rodapié y parales) a la altura de suelo y */
  rail(a, b, y, mat = 'yellow') {
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz)
    this.pipe([a[0], y + 1.07, a[1]], [b[0], y + 1.07, b[1]], 0.022, mat)
    this.pipe([a[0], y + 0.55, a[1]], [b[0], y + 0.55, b[1]], 0.018, mat)
    const n = Math.max(1, Math.ceil(len / 1.8))
    for (let i = 0; i <= n; i++) { const t = i / n; this.pipe([a[0] + dx * t, y, a[1] + dz * t], [a[0] + dx * t, y + 1.07, a[1] + dz * t], 0.022, mat) }
    const ang = Math.atan2(dz, dx)
    this.box(len, 0.1, 0.01, mat, { pos: [a[0] + dx / 2, y + 0.05, a[1] + dz / 2], rot: [0, -ang, 0] })
    return this
  }

  /**
   * Escalera vertical con jaula de y0 a y1 (como en Smart Plant 3D).  `pos` = [x, z] del eje;
   * `facing` = ángulo (rad) hacia donde queda el escalador (sale de la estructura).
   */
  ladder(pos, y0, y1, facing = 0, mat = 'yellow') {
    const fx = Math.sin(facing), fz = Math.cos(facing), rx = Math.cos(facing), rz = -Math.sin(facing)
    const [x, z] = pos, top = y1 + 1.0
    for (const s of [-0.22, 0.22]) this.pipe([x + rx * s, y0, z + rz * s], [x + rx * s, top, z + rz * s], 0.022, mat)
    for (let y = y0 + 0.3; y < y1 + 0.05; y += 0.3) this.pipe([x - rx * 0.22, y, z - rz * 0.22], [x + rx * 0.22, y, z + rz * 0.22], 0.014, mat)
    /* jaula desde 2,2 m */
    if (y1 - y0 > 3) {
      for (let y = y0 + 2.2; y <= top; y += 0.9) this.torus(0.36, 0.012, mat, { pos: [x + fx * 0.36, y, z + fz * 0.36], rot: [Math.PI / 2, 0, 0], arc: Math.PI * 2, seg: 18, tseg: 4 })
      for (let k = 0; k < 5; k++) {
        const a = facing + Math.PI / 2 + (k / 4) * Math.PI
        const px = x + fx * 0.36 + Math.sin(a) * 0.36, pz = z + fz * 0.36 + Math.cos(a) * 0.36
        this.pipe([px, y0 + 2.2, pz], [px, top, pz], 0.01, mat)
      }
    }
    return this
  }

  /** fusiona todo en un grupo estático (una malla por material) */
  build(name = 'static') {
    const group = new THREE.Group()
    group.name = name
    for (const [key, geos] of this.groups) {
      const geo = mergeGeometries(geos, false)
      geos.forEach((g) => g.dispose())
      geo.computeBoundingSphere(); geo.computeBoundingBox()
      const mat = key.startsWith('fam:') ? familyMaterial(key.slice(4)) : specialMaterial(key)
      const mesh = new THREE.Mesh(geo, mat)
      mesh.name = name + ':' + key
      mesh.matrixAutoUpdate = false
      mesh.raycast = () => null        // la selección va por las mallas de PICK_LAYER, nunca por lo visible
      group.add(mesh)
    }
    group.matrixAutoUpdate = false
    this.groups.clear()
    return group
  }
}
