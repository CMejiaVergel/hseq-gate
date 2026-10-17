import * as THREE from 'three'

/* última pose de la cabeza, accesible fuera del bucle de render (de ui/ControlPanel de Smart Plant 3D) */
const _pos = new THREE.Vector3(), _q = new THREE.Quaternion()
export const HEAD = { pos: new THREE.Vector3(0, 1.6, 0), quat: new THREE.Quaternion(), fwd: new THREE.Vector3(0, 0, -1) }
export function headPose(state) {
  const cam = state.gl.xr.isPresenting ? state.gl.xr.getCamera() : state.camera
  cam.getWorldPosition(_pos); cam.getWorldQuaternion(_q)
  HEAD.pos.copy(_pos); HEAD.quat.copy(_q); HEAD.fwd.set(0, 0, -1).applyQuaternion(_q)
  return { pos: _pos, quat: _q }
}
