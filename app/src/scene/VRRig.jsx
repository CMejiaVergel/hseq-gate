import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { XRSpace, useXRInputSourceState } from '@react-three/xr'
import * as THREE from 'three'
import { useApp } from '../store.js'
import { PLAYER, moveStep, isFree, nearestFree, START, surfaceBelow } from '../walk/walk.js'
import { xrStore } from '../xr/store.js'
import { FX } from './ScreenFx.jsx'
import * as A from './actions.js'

/*
 * Plataforma del jugador en VR (de Smart Plant 3D).  Mueve el «origen» XR (los pies) por el mundo:
 *
 *   stick izquierdo   caminar hacia donde mira la cabeza (pulsarlo: correr)
 *   stick derecho     ← → giro a saltos de 30°   ↑ mantener = apuntar teletransporte, soltar = ir
 *   gatillo derecho   interactuar (lo resuelven los eventos de puntero del mundo y de los paneles)
 *   grip derecho      tomar / soltar          botón A   usar objeto en mano · escaleras
 *   botón B           siguiente del inventario   botón X   repetir instrucción   botón Y   tableta
 *
 * La colisión usa la posición REAL de la cabeza: si caminas de verdad por la habitación tampoco
 * atraviesas un equipo.  Giros alrededor de la cabeza, teletransporte con fundido breve y viñeta
 * suave al caminar (comodidad).
 */
export const HANDS = { left: null, right: null }
const Y = new THREE.Vector3(0, 1, 0)
const _head = new THREE.Vector3(), _q = new THREE.Quaternion(), _f = new THREE.Vector3(), _v = new THREE.Vector3(), _o = new THREE.Vector3(), _d = new THREE.Vector3(), _p = new THREE.Vector3()
const P = { x: 0, z: 0, y: 0 }

/** poses de los mandos (van DENTRO de XROrigin: sus matrices son relativas al origen) */
export function VRHands() {
  const left = useXRInputSourceState('controller', 'left')
  const right = useXRInputSourceState('controller', 'right')
  return (
    <>
      {right && <XRSpace space={right.inputSource.targetRaySpace} ref={(o) => { HANDS.right = o }} />}
      {left && <XRSpace space={left.inputSource.gripSpace ?? left.inputSource.targetRaySpace} ref={(o) => { HANDS.left = o }} />}
    </>
  )
}

/** primer punto donde el rayo cruza una superficie caminable */
export function marchRay(o, d) {
  const g = (t) => { _p.copy(d).multiplyScalar(t).add(o); return { y: _p.y, gy: surfaceBelow(_p.x, _p.z, _p.y + 0.05), x: _p.x, z: _p.z } }
  let prev = 0.3
  for (let t = 0.5; t < 25; t += 0.25) {
    const s = g(t)
    if (s.y <= s.gy) {
      let a = prev, b = t
      for (let i = 0; i < 6; i++) { const m = (a + b) / 2, sm = g(m); if (sm.y <= sm.gy) b = m; else a = m }
      const sb = g(b)
      const y = surfaceBelow(sb.x, sb.z, sb.y + 0.05)
      return { x: sb.x, z: sb.z, y, ok: y > -50 && isFree(sb.x, sb.z, y) }
    }
    prev = t
  }
  return null
}

const BTN = { a: 'a-button', b: 'b-button', x: 'x-button', y: 'y-button', grip: 'xr-standard-squeeze' }

export default function VRRig({ originRef }) {
  const gl = useThree((s) => s.gl)
  const S = useRef({ init: false, canTurn: true, aiming: false, target: null, physY: 0, lastF: new THREE.Vector3(0, 0, -1), prev: {} })
  const pending = useRef(null)
  const marker = useRef(), beam = useRef()
  const tp = useApp((s) => s.teleportReq)
  const lastN = useRef(tp?.n)
  useEffect(() => { if (tp && tp.n !== lastN.current) { lastN.current = tp.n; pending.current = tp } }, [tp])
  useEffect(() => () => { const o = originRef.current; if (o) { o.position.set(0, 0, 0); o.rotation.set(0, 0, 0) } FX.vig = 0 }, [originRef])

  const beamGeo = useMemo(() => new THREE.CylinderGeometry(0.006, 0.006, 1, 6), [])

  useFrame((state, dtRaw) => {
    const org = originRef.current
    if (!org || !gl.xr.isPresenting) return
    const dt = Math.min(dtRaw, 0.1), s = S.current, st = useApp.getState()
    const cam = gl.xr.getCamera()
    cam.getWorldPosition(_head); cam.getWorldQuaternion(_q)
    _f.set(0, 0, -1).applyQuaternion(_q); _f.y = 0
    if (_f.lengthSq() > 0.01) { _f.normalize(); s.lastF.copy(_f) } else _f.copy(s.lastF)

    const turnAbout = (hx, hz, dy) => {
      org.rotation.y += dy
      _v.set(org.position.x - hx, 0, org.position.z - hz).applyAxisAngle(Y, dy)
      org.position.x = hx + _v.x; org.position.z = hz + _v.z
    }
    /* coloca la cabeza en (x, z) a altura de suelo y, mirando a `yaw` (opcional) */
    const place = (x, z, y, yaw) => {
      org.position.x += x - _head.x; org.position.z += z - _head.z
      org.position.y = y; s.physY = y
      _head.x = x; _head.z = z
      if (yaw != null) turnAbout(x, z, yaw - Math.atan2(-_f.x, -_f.z))
      PLAYER.x = x; PLAYER.z = z; PLAYER.y = y
      FX.fade = 1
    }

    if (!s.init) {
      s.init = true
      const p = PLAYER.started ? { x: PLAYER.x, z: PLAYER.z, y: PLAYER.y, yaw: PLAYER.yaw } : { ...nearestFree(START.x, START.z, START.y), yaw: START.yaw }
      PLAYER.started = true
      place(p.x, p.z, p.y, p.yaw)
      return
    }
    if (pending.current) { const t = pending.current; pending.current = null; place(t.x, t.z, t.y ?? 0, t.yaw); return }

    /* ---- mandos ---- */
    let L, R
    for (const x of xrStore.getState().inputSourceStates) if (x.type === 'controller') { if (x.inputSource.handedness === 'left') L = x; else if (x.inputSource.handedness === 'right') R = x }
    const ls = L?.gamepad['xr-standard-thumbstick'], rs = R?.gamepad['xr-standard-thumbstick']
    const lx = ls?.xAxis ?? 0, ly = ls?.yAxis ?? 0, rx = rs?.xAxis ?? 0, ry = rs?.yAxis ?? 0
    const pressed = (src, k) => src?.gamepad[BTN[k]]?.state === 'pressed'
    const edge = (key, now) => { const was = s.prev[key]; s.prev[key] = now; return now && !was }
    P.x = _head.x; P.z = _head.z; P.y = s.physY
    PLAYER.x = P.x; PLAYER.z = P.z; PLAYER.y = s.physY
    if (edge('y', pressed(L, 'y'))) st.toggleTablet()
    if (edge('x', pressed(L, 'x'))) A.repeat()
    if (edge('a', pressed(R, 'a'))) A.use()
    if (edge('b', pressed(R, 'b'))) A.cycle()
    if (edge('grip', pressed(R, 'grip'))) A.grip()

    /* ---- caminar ---- */
    const mag = Math.hypot(lx, ly)
    let moving = false
    if (mag > 0.15 && !PLAYER.frozen) {
      const run = ls?.state === 'pressed' ? 1.9 : 1
      const k = (Math.min(1, (mag - 0.15) / 0.8) * st.walkSpeed * run * dt) / mag
      const fwd = -ly * k, rgt = lx * k
      moveStep(P, _f.x * fwd + -_f.z * rgt, _f.z * fwd + _f.x * rgt)
      org.position.x += P.x - _head.x; org.position.z += P.z - _head.z
      s.physY = P.y
      moving = true
    }

    /* ---- girar ---- */
    if (st.turnMode === 'smooth') {
      if (Math.abs(rx) > 0.25) { turnAbout(_head.x, _head.z, -rx * 1.9 * dt); moving = true }
    } else if (Math.abs(rx) < 0.45) s.canTurn = true
    else if (s.canTurn) { s.canTurn = false; turnAbout(_head.x, _head.z, (rx > 0 ? -1 : 1) * (Math.PI / 6)) }

    /* ---- teletransporte: empujar el stick derecho hacia delante ---- */
    const aiming = ry < -0.75 && Math.abs(rx) < 0.6 && !!HANDS.right && !PLAYER.frozen
    if (aiming) {
      HANDS.right.updateWorldMatrix(true, false)
      _o.setFromMatrixPosition(HANDS.right.matrixWorld)
      _d.set(0, 0, -1).transformDirection(HANDS.right.matrixWorld)
      s.target = marchRay(_o, _d)
      const t = s.target
      if (marker.current) { marker.current.visible = !!t; if (t) { marker.current.position.set(t.x, t.y + 0.03, t.z); marker.current.material.color.set(t.ok ? '#3ddc84' : '#ff5a4d') } }
      if (beam.current) {
        beam.current.visible = true
        const end = t ? _p.set(t.x, t.y, t.z) : _p.copy(_d).multiplyScalar(10).add(_o)
        _v.copy(end).sub(_o)
        beam.current.position.copy(_o).addScaledVector(_v, 0.5)
        beam.current.scale.set(1, _v.length(), 1)
        beam.current.quaternion.setFromUnitVectors(Y, _v.normalize())
        beam.current.material.color.set(t?.ok ? '#3ddc84' : '#ff5a4d')
      }
    } else {
      if (s.aiming && s.target?.ok) place(s.target.x, s.target.z, s.target.y)
      s.target = null
      if (marker.current) marker.current.visible = false
      if (beam.current) beam.current.visible = false
    }
    s.aiming = aiming

    /* ---- altura suave (más el desplazamiento visual de los efectos), estado compartido y comodidad ---- */
    const ty = s.physY + (PLAYER.dy || 0)
    org.position.y += (ty - org.position.y) * Math.min(1, dt * (PLAYER.dy ? 30 : 10))
    PLAYER.x = P.x; PLAYER.z = P.z; PLAYER.y = s.physY; PLAYER.yaw = Math.atan2(-_f.x, -_f.z)
    FX.vig += (((moving && st.vignette) ? 0.7 : 0) - FX.vig) * Math.min(1, dt * 6)
  })

  return (
    <>
      <mesh ref={marker} rotation-x={-Math.PI / 2} visible={false} renderOrder={40} raycast={() => null}>
        <ringGeometry args={[0.22, 0.32, 36]} />
        <meshBasicMaterial color="#3ddc84" transparent opacity={0.9} depthTest={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={beam} geometry={beamGeo} visible={false} renderOrder={40} raycast={() => null}>
        <meshBasicMaterial color="#3ddc84" transparent opacity={0.65} depthTest={false} />
      </mesh>
    </>
  )
}
