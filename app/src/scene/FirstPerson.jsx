import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useApp } from '../store.js'
import { PLAYER, EYE, moveStep, nearestFree, START } from '../walk/walk.js'
import { aimAt } from './interact.js'
import * as A from './actions.js'
import { FX } from './ScreenFx.jsx'
import { pressPanelAt } from '../ui/Panel3D.jsx'

/*
 * Primera persona en el PC (de Smart Plant 3D): WASD / flechas para caminar (Mayús corre), ratón
 * para mirar (arrastra, o captura el puntero con un clic).  Mismos controles que el visor (docs/06):
 *   clic = gatillo · E = grip (tomar/soltar) · F = botón A (usar / escaleras) · Q = B (inventario)
 *   R = X (repetir instrucción) · Tab = Y (tableta)
 * Misma física que el modo VR (walk/walk.js).
 */
const _c = new THREE.Vector2(0, 0)

export default function FirstPerson() {
  const { camera, gl, raycaster } = useThree()
  const keys = useRef({})
  const look = useRef({ yaw: PLAYER.yaw, pitch: 0 })
  const eye = useRef(PLAYER.y)
  const hoverT = useRef(0)
  const tp = useApp((s) => s.teleportReq)

  useEffect(() => {
    if (!PLAYER.started) { const f = nearestFree(START.x, START.z, START.y); Object.assign(PLAYER, { x: f.x, z: f.z, y: f.y, yaw: START.yaw, started: true }) }
    look.current.yaw = PLAYER.yaw; look.current.pitch = 0; eye.current = PLAYER.y
    camera.rotation.order = 'YXZ'
    const prevNear = camera.near; camera.near = 0.05; camera.updateProjectionMatrix()
    return () => { camera.near = prevNear; camera.updateProjectionMatrix() }
  }, [camera])

  useEffect(() => {
    if (!tp) return
    Object.assign(PLAYER, { x: tp.x, z: tp.z, y: tp.y ?? 0 })
    eye.current = PLAYER.y
    if (tp.yaw != null) look.current.yaw = tp.yaw
    look.current.pitch = 0
    FX.fade = 1
  }, [tp])

  useEffect(() => {
    const el = gl.domElement
    let drag = null, lockFailed = false
    const aim = () => aimAt(raycaster, camera, _c)
    /* clic con la mira: primero los paneles 3D (tableta, documentos), luego el mundo */
    const clickCenter = () => {
      raycaster.setFromCamera(_c, camera)
      if (pressPanelAt(raycaster)) return
      A.trigger(aim())
    }
    const down = (e) => {
      if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA') return
      keys.current[e.code] = true
      if (e.repeat) return
      if (e.code === 'KeyE') A.grip()
      if (e.code === 'KeyF') A.use()
      if (e.code === 'KeyQ') A.cycle()
      if (e.code === 'KeyR') A.repeat()
      if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); clickCenter() }
      if (e.code === 'Tab') { e.preventDefault(); useApp.getState().toggleTablet(); if (document.pointerLockElement) document.exitPointerLock() }
    }
    const up = (e) => { keys.current[e.code] = false }
    const mdown = (e) => { if (e.button === 0) drag = { moved: 0, t: performance.now() } }
    const mmove = (e) => {
      const lk = document.pointerLockElement === el
      const dx = lk ? e.movementX : drag && e.buttons & 1 ? e.movementX : 0, dy = lk ? e.movementY : drag && e.buttons & 1 ? e.movementY : 0
      if (!dx && !dy) return
      if (drag) drag.moved += Math.abs(dx) + Math.abs(dy)
      look.current.yaw -= dx * 0.0022; look.current.pitch = Math.max(-1.45, Math.min(1.45, look.current.pitch - dy * 0.0022))
    }
    const mup = (e) => {
      if (e.button !== 0 || !drag) return
      const click = drag.moved < 5 && performance.now() - drag.t < 400
      drag = null
      if (!click) return
      if (document.pointerLockElement !== el && !lockFailed) el.requestPointerLock?.()?.catch?.(() => { lockFailed = true })
      clickCenter()
    }
    const lockErr = () => { lockFailed = true }
    const blur = () => { keys.current = {} }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur)
    el.addEventListener('mousedown', mdown); window.addEventListener('mousemove', mmove); window.addEventListener('mouseup', mup)
    document.addEventListener('pointerlockerror', lockErr)
    if (import.meta.env.DEV) window.__fp = { keys, look, eye }
    return () => {
      window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur)
      el.removeEventListener('mousedown', mdown); window.removeEventListener('mousemove', mmove); window.removeEventListener('mouseup', mup)
      document.removeEventListener('pointerlockerror', lockErr)
      if (document.pointerLockElement === el) document.exitPointerLock()
    }
  }, [gl, camera, raycaster])

  useFrame((state, dt) => {
    dt = Math.min(dt, 0.1)
    const k = keys.current, st = useApp.getState()
    const f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0)
    const r = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0)
    const yaw = look.current.yaw
    let moving = false
    if ((f || r) && !PLAYER.frozen) {
      const len = Math.hypot(f, r), sp = st.walkSpeed * (k.ShiftLeft || k.ShiftRight ? 1.9 : 1) * dt / len
      moveStep(PLAYER, (-Math.sin(yaw) * f + Math.cos(yaw) * r) * sp, (-Math.cos(yaw) * f - Math.sin(yaw) * r) * sp)
      moving = true
    }
    PLAYER.yaw = yaw
    eye.current += (PLAYER.y + (PLAYER.dy || 0) - eye.current) * Math.min(1, dt * (PLAYER.dy ? 30 : 9))
    camera.position.set(PLAYER.x, eye.current + EYE, PLAYER.z)
    camera.rotation.set(look.current.pitch, yaw, 0, 'YXZ')
    FX.vig += (((moving && st.vignette) ? 0.25 : 0) - FX.vig) * Math.min(1, dt * 6)
    /* qué apunta la mira (≈ 7 veces por segundo) */
    hoverT.current += dt
    if (hoverT.current > 0.15) {
      hoverT.current = 0
      st.hover(aimAt(raycaster, camera, _c)?.obj ?? null)
    }
  })
  return null
}
