import * as THREE from 'three'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { HEAD } from '../scene/head.js'

/* Colocación de paneles respecto a la cabeza (comunes a PC y visor). */
const _f = new THREE.Vector3(), _r = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _t = new THREE.Vector3()

/** pone `obj` a `dist` m delante de la vista (en horizontal), desplazado `dx` a la derecha y `dy` arriba, mirando a la cabeza */
export function placeInFront(obj, dist = 0.9, dy = -0.05, dx = 0, k = 1) {
  _f.copy(HEAD.fwd); _f.y = 0
  if (_f.lengthSq() < 1e-4) _f.set(0, 0, -1); else _f.normalize()
  _r.crossVectors(_f, _up).normalize()
  _t.copy(HEAD.pos).addScaledVector(_f, dist).addScaledVector(_r, dx); _t.y += dy
  if (k >= 1) obj.position.copy(_t); else obj.position.lerp(_t, k)
  _q.setFromRotationMatrix(_m.lookAt(HEAD.pos, obj.position, _up))
  if (k >= 1) obj.quaternion.copy(_q); else obj.quaternion.slerp(_q, k)
}

/** orienta `obj` hacia la cabeza sin moverlo */
export function faceHead(obj, k = 1) {
  _q.setFromRotationMatrix(_m.lookAt(HEAD.pos, obj.position, _up))
  if (k >= 1) obj.quaternion.copy(_q); else obj.quaternion.slerp(_q, k)
}

/*
 * Mantiene un panel importante (debrief, consecuencia) a la vista: si el aprendiz se aleja o se
 * gira y el panel queda fuera del campo visual, vuelve suavemente frente a él.  Así nunca queda
 * «perdido» detrás en VR.
 */
const _d = new THREE.Vector3(), _h = new THREE.Vector3()
export function useKeepInView(ref, dist = 1.0, dy = -0.08) {
  const moving = useRef(false)
  useFrame((state, dt) => {
    const g = ref.current
    if (!g) return
    _d.copy(g.position).sub(HEAD.pos)
    const far = _d.length() > dist * 2.2
    _d.y = 0; _h.copy(HEAD.fwd); _h.y = 0
    const off = _d.lengthSq() > 1e-4 && _h.lengthSq() > 1e-4 ? _h.normalize().angleTo(_d.normalize()) > 1.0 : false
    if (far || off) moving.current = true
    if (!moving.current) return
    placeInFront(g, dist, dy, 0, Math.min(1, dt * 3))
    _d.copy(g.position).sub(HEAD.pos); _d.y = 0
    if (Math.abs(_d.length() - dist) < 0.05 && _h.angleTo(_d.normalize()) < 0.15) moving.current = false
  })
}
