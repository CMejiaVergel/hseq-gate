import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useXR } from '@react-three/xr'
import * as THREE from 'three'
import { headPose } from '../scene/head.js'

/*
 * Capas por encima de todo dentro del visor (de Smart Plant 3D):
 *
 *   Splash            al entrar a la sesión: logo, nombre, versión y créditos sobre un velo oscuro.
 *   ControllerPrompt  sin mandos (manos o nada) no se puede entrenar: se pide tomarlos.
 *
 * Una lámina con textura de Canvas 2D que sigue a la cabeza; depthTest apagado para que nada la tape.
 */
export const APP_VERSION = __APP_VERSION__
const FONT = 'system-ui, "Segoe UI", Roboto, sans-serif'
const W = 1024, H = 640
const _fwd = new THREE.Vector3(), _target = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _m = new THREE.Matrix4(), _q = new THREE.Quaternion()

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}
function card(ctx) {
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(11,18,32,0.97)'; roundRect(ctx, 4, 4, W - 8, H - 8, 40); ctx.fill()
  ctx.strokeStyle = 'rgba(120,170,255,0.45)'; ctx.lineWidth = 4; roundRect(ctx, 4, 4, W - 8, H - 8, 40); ctx.stroke()
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
}

function drawSplash(ctx, logo) {
  card(ctx)
  if (logo) { const lw = 300, lh = lw * logo.height / logo.width; ctx.drawImage(logo, (W - lw) / 2, 46, lw, lh) }
  ctx.fillStyle = '#ffffff'; ctx.font = `800 64px ${FONT}`; ctx.fillText('HSEQ Gate', W / 2, 330)
  ctx.fillStyle = '#9fb0c8'; ctx.font = `500 30px ${FONT}`; ctx.fillText('Entrenamiento HSEQ en realidad virtual', W / 2, 376)
  ctx.fillStyle = '#3a7bff'; ctx.font = `700 26px ${FONT}`; ctx.fillText(`Versión ${APP_VERSION}`, W / 2, 424)
  ctx.strokeStyle = 'rgba(120,170,255,0.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(160, 462); ctx.lineTo(W - 160, 462); ctx.stroke()
  ctx.fillStyle = '#cfd8e6'; ctx.font = `500 25px ${FONT}`; ctx.fillText('Desarrollado por Voltac Systems S.A.S. · Cartagena, Colombia', W / 2, 508)
  ctx.fillStyle = '#9fb0c8'; ctx.font = `400 23px ${FONT}`; ctx.fillText('Desarrollo: Carlos Mejía', W / 2, 546)
  ctx.fillStyle = '#6f84a6'; ctx.font = `400 21px ${FONT}`; ctx.fillText('Material de entrenamiento en simulador · Preparando la sala de inducción…', W / 2, 598)
}

function drawPrompt(ctx) {
  card(ctx)
  ctx.strokeStyle = '#ff9f43'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(W / 2, 150, 62, 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = '#ff9f43'; ctx.font = `800 84px ${FONT}`; ctx.fillText('!', W / 2, 180)
  ctx.fillStyle = '#ffffff'; ctx.font = `800 58px ${FONT}`; ctx.fillText('Toma los mandos', W / 2, 300)
  ctx.fillStyle = '#cfd8e6'; ctx.font = `500 30px ${FONT}`
  ctx.fillText('El entrenamiento se hace con los mandos', W / 2, 372)
  ctx.fillText('de Meta Quest: caminar, tomar objetos,', W / 2, 414)
  ctx.fillText('operar equipos y usar la tableta.', W / 2, 456)
  ctx.fillStyle = '#6f84a6'; ctx.font = `400 24px ${FONT}`; ctx.fillText('El seguimiento de manos no está disponible en esta app.', W / 2, 560)
}

/** lámina con lienzo que flota frente a la cabeza; draw(ctx, ready) la pinta */
export function useCard(draw, width) {
  return useMemo(() => {
    const canvas = Object.assign(document.createElement('canvas'), { width: W, height: H })
    const ctx = canvas.getContext('2d')
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4
    draw(ctx, () => { tex.needsUpdate = true })
    tex.needsUpdate = true
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width * H / W), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }))
    mesh.renderOrder = 2001; mesh.frustumCulled = false; mesh.raycast = () => null
    return mesh
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps
}

/** coloca la lámina a `dist` m delante de la cabeza, en horizontal, mirando al usuario */
export function follow(mesh, state, dist, k, dy = 0) {
  const { pos, quat } = headPose(state)
  _fwd.set(0, 0, -1).applyQuaternion(quat); _fwd.y = 0
  if (_fwd.lengthSq() < 1e-4) _fwd.set(0, 0, -1); else _fwd.normalize()
  _target.copy(pos).addScaledVector(_fwd, dist); _target.y += dy
  if (k >= 1) mesh.position.copy(_target); else mesh.position.lerp(_target, k)
  _q.setFromRotationMatrix(_m.lookAt(pos, mesh.position, _up))
  if (k >= 1) mesh.quaternion.copy(_q); else mesh.quaternion.slerp(_q, k)
}

const SHOW = 3.5, FADE = 0.8

export function Splash() {
  const [done, setDone] = useState(false)
  const t = useRef(0)
  const mesh = useCard((ctx, ready) => {
    drawSplash(ctx, null)
    const img = new Image()
    img.onload = () => { drawSplash(ctx, img); ready() }
    img.src = import.meta.env.BASE_URL + 'icons/logo-voltac.png'
  }, 1.0)
  const veil = useMemo(() => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1.5, 24, 12), new THREE.MeshBasicMaterial({ color: '#05080f', side: THREE.BackSide, transparent: true, depthTest: false, depthWrite: false, fog: false }))
    m.renderOrder = 2000; m.frustumCulled = false; m.raycast = () => null
    return m
  }, [])
  useEffect(() => () => { mesh.material.map.dispose(); mesh.material.dispose(); mesh.geometry.dispose(); veil.material.dispose(); veil.geometry.dispose() }, [mesh, veil])

  useFrame((state, dt) => {
    if (done) return
    t.current += Math.min(dt, 0.1)
    follow(mesh, state, 1.5, t.current < 0.05 ? 1 : Math.min(1, dt * 3))
    veil.position.copy(headPose(state).pos)
    const a = t.current < SHOW ? 1 : Math.max(0, 1 - (t.current - SHOW) / FADE)
    mesh.material.opacity = a; veil.material.opacity = a
    if (a <= 0) setDone(true)
  })

  if (done) return null
  return <><primitive object={veil} /><primitive object={mesh} /></>
}

/* aviso cuando no hay ningún mando conectado (tras un instante, para no parpadear al iniciar) */
export function ControllerPrompt() {
  const hasController = useXR((s) => s.inputSourceStates.some((x) => x.type === 'controller'))
  const missing = useRef(0)
  const mesh = useCard((ctx) => drawPrompt(ctx), 0.8)
  useEffect(() => () => { mesh.material.map.dispose(); mesh.material.dispose(); mesh.geometry.dispose() }, [mesh])

  useFrame((state, dt) => {
    missing.current = hasController ? 0 : missing.current + dt
    const show = missing.current > 1.2
    mesh.visible = show
    if (show) follow(mesh, state, 1.1, Math.min(1, dt * 4))
  })
  return <primitive object={mesh} />
}
