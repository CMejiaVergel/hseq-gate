import * as THREE from 'three'
import { xrStore } from '../xr/store.js'

/*
 * Base de la interacción (de scene/interact.js de Smart Plant 3D): qué apunta el jugador.
 *
 * Cada objeto interactivo pone una malla de selección invisible en PICK_LAYER con
 * userData.obj = id del objeto del escenario.  La cámara no dibuja esa capa (ni sube sus
 * geometrías a la GPU); los raycasters sí la ven.  No usar 1 ni 2: three las reserva para
 * los ojos izquierdo y derecho en XR.
 */
export const PICK_LAYER = 5
export const WORLD = { root: null }          // grupo raíz del entorno actual (lo fija Scene)

const pickMat = new THREE.MeshBasicMaterial({ visible: false })
/** malla de selección: caja invisible en PICK_LAYER para el objeto `obj` */
export function pickBox(w, h, d, obj, extra = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), pickMat)
  m.layers.set(PICK_LAYER)
  m.userData = { obj, ...extra }
  return m
}

/** id del objeto tocado (sube por los padres); ignora lo oculto */
export function findObj(object) {
  for (let p = object; p; p = p.parent) if (p.visible === false) return null
  for (let o = object; o; o = o.parent) if (o.userData?.obj) return { obj: o.userData.obj, object: o }
  return null
}

/** primer objeto que cruza el rayo del centro de la cámara (NDC) o un rayo ya puesto en el raycaster */
export function aimAt(raycaster, camera, ndc, far = 6) {
  const root = WORLD.root
  if (!root) return null
  if (ndc) raycaster.setFromCamera(ndc, camera)
  const prev = raycaster.far
  raycaster.far = far
  const hits = raycaster.intersectObject(root, true)
  raycaster.far = prev
  for (const h of hits) {
    const t = findObj(h.object)
    if (t) return { obj: t.obj, verb: t.object.userData.verb, point: h.point, distance: h.distance }
  }
  return null
}

export function haptic(hand = 'right', strength = 0.5, ms = 45) {
  try {
    const st = xrStore.getState().inputSourceStates.find((s) => s.type === 'controller' && s.inputSource.handedness === hand)
    st?.inputSource.gamepad?.hapticActuators?.[0]?.pulse?.(strength, ms)
  } catch { /* sin vibración */ }
}
