import * as THREE from 'three'

/*
 * Registro de materiales (versión reducida del de Smart Plant 3D).
 *
 * Los colores con nombre se agrupan en FAMILIAS que comparten un único material con el color
 * en los vértices: así un entorno entero (muros, equipos, señalética pintada) se dibuja en
 * 4–6 llamadas.  Los materiales especiales (vidrio, emisivos, líquidos) van aparte.
 */

export const PALETTE = {
  /* metales */
  steel: '#8d959c', darksteel: '#4b5259', galv: '#a9b0b5', bolt: '#3a3f44', silver: '#c7ccd1', brass: '#c9a24a', grating: '#5c6368',
  /* pinturas */
  yellow: '#e4b400', red: '#b8322a', blue: '#2f5f9e', green: '#2f7a46', black: '#1f2226', orange: '#d9742a', white: '#eeeeee',
  motor: '#2b3a5c', navy: '#23405f', cream: '#e3dccb', wall: '#cfcac0', wall2: '#b9b3a6', roof: '#8e969c', rubber: '#2a2a2a',
  dial: '#f2f2f2', panel: '#c8ccc8', skin: '#c99a76', shirt: '#2d5aa0', vest: '#ff8a1f', pants: '#2c3440', helmet: '#f2f2f2', wood: '#8a6a45',
  /* concretos y suelos */
  concrete: '#9a9691', slab: '#a39f98', asphalt: '#3a3c3f', soil: '#8a7454', gravel: '#6f6a63', mud: '#4a3b2a', floor: '#8f8b84',
}

const FAMILIES = {
  metal:    { props: { metalness: 0.75, roughness: 0.4 }, members: ['steel', 'darksteel', 'galv', 'bolt', 'silver', 'brass', 'grating'] },
  paint:    { props: { metalness: 0.2, roughness: 0.6 }, members: ['yellow', 'red', 'blue', 'green', 'black', 'orange', 'white', 'motor', 'navy', 'cream', 'wall', 'wall2', 'roof', 'rubber', 'dial', 'panel', 'skin', 'shirt', 'vest', 'pants', 'helmet', 'wood'] },
  concrete: { props: { metalness: 0.0, roughness: 0.95 }, members: ['concrete', 'slab', 'asphalt', 'soil', 'gravel', 'mud', 'floor'] },
}
export const FAMILY_OF = {}
for (const [f, d] of Object.entries(FAMILIES)) for (const m of d.members) FAMILY_OF[m] = f

const _c = new THREE.Color()
export function paletteRGB(name) { _c.set(PALETTE[name] || name); return [_c.r, _c.g, _c.b] }

const cache = new Map()
/** material compartido de una familia (color por vértice) */
export function familyMaterial(f) {
  const k = 'fam:' + f
  if (!cache.has(k)) {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, ...FAMILIES[f].props })
    m.name = k
    cache.set(k, m)
  }
  return cache.get(k)
}

/* materiales especiales (no se fusionan con las familias) */
const SPECIAL = {
  glass:   () => new THREE.MeshStandardMaterial({ color: '#9fd3e8', metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.4, depthWrite: false }),
  water:   () => new THREE.MeshStandardMaterial({ color: '#2b6f8f', metalness: 0.1, roughness: 0.2, transparent: true, opacity: 0.85 }),
  lamp:    () => new THREE.MeshBasicMaterial({ color: '#fff6d8' }),
  lampoff: () => new THREE.MeshStandardMaterial({ color: '#6d6a60', roughness: 0.5 }),
  tape:    () => new THREE.MeshStandardMaterial({ color: '#e4b400', roughness: 0.7, side: THREE.DoubleSide }),
  green:   () => new THREE.MeshBasicMaterial({ color: '#2ecc71' }),
  redlit:  () => new THREE.MeshBasicMaterial({ color: '#ff3b30' }),
}
export function specialMaterial(name) {
  const k = 'sp:' + name
  if (!cache.has(k)) { const m = SPECIAL[name](); m.name = k; cache.set(k, m) }
  return cache.get(k)
}
export const isSpecial = (name) => name in SPECIAL

/** material sólido de un color con nombre, para piezas móviles que no se fusionan */
export function solidMaterial(name, extra = {}) {
  const k = 'so:' + name + JSON.stringify(extra)
  if (!cache.has(k)) {
    const f = FAMILY_OF[name] || 'paint'
    const m = new THREE.MeshStandardMaterial({ color: PALETTE[name] || name, ...FAMILIES[f].props, ...extra })
    m.name = k
    cache.set(k, m)
  }
  return cache.get(k)
}

/** contorno por expansión de normales (copiado de Smart Plant 3D): resaltado de los objetos del paso */
export function makeOutlineMaterial(color = '#4da3ff') {
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide, transparent: true, opacity: 0.95, depthWrite: false })
  mat.userData.width = { value: 0.025 }
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWidth = mat.userData.width
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWidth;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(normal) * uWidth;')
  }
  mat.customProgramCacheKey = () => 'outline'
  return mat
}
