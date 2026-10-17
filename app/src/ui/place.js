import * as THREE from 'three'
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
