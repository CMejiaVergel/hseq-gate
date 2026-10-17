import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useApp } from '../store.js'
import { placeInFront } from './place.js'
import { wrap, roundRect } from './Panel3D.jsx'

/*
 * Aviso (docs/06): franja frente a la vista durante ~2,5 s («✔ Paso completado», «⚠ error…»).
 * Una lámina de lienzo que sigue a la cabeza con suavizado; se redibuja solo al cambiar el aviso.
 * No recibe toques (raycast nulo) y se dibuja por encima de todo.
 */
const W = 1024, H = 256
const FONT = 'system-ui, "Segoe UI", Roboto, sans-serif'
const COLORS = { ok: '#1f8f4e', menor: '#b7791f', mayor: '#c0392b', critico: '#8e1b12', info: '#2a4f8f' }

export default function Toast() {
  const toast = useApp((s) => s.toast)
  const t = useRef(99)
  const { mesh, ctx, tex } = useMemo(() => {
    const canvas = Object.assign(document.createElement('canvas'), { width: W, height: H })
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62 * H / W), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }))
    mesh.renderOrder = 1500; mesh.frustumCulled = false; mesh.raycast = () => null; mesh.visible = false
    return { mesh, ctx: canvas.getContext('2d'), tex }
  }, [])
  useEffect(() => () => { tex.dispose(); mesh.geometry.dispose(); mesh.material.dispose() }, [mesh, tex])

  useEffect(() => {
    if (!toast) return
    ctx.clearRect(0, 0, W, H)
    ctx.font = `700 40px ${FONT}`
    const lines = wrap(ctx, toast.text, W - 90).slice(0, 4)
    const h = Math.min(H - 8, lines.length * 50 + 44)
    ctx.fillStyle = COLORS[toast.kind] || COLORS.info; ctx.globalAlpha = 0.94
    roundRect(ctx, 4, (H - h) / 2, W - 8, h, 28); ctx.fill(); ctx.globalAlpha = 1
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    lines.forEach((l, i) => { ctx.font = `${i === 0 ? 800 : 500} ${i === 0 ? 40 : 34}px ${FONT}`; ctx.fillText(l, W / 2, H / 2 - ((lines.length - 1) * 50) / 2 + i * 50) })
    tex.needsUpdate = true
    t.current = 0
  }, [toast, ctx, tex])

  useFrame((state, dt) => {
    t.current += Math.min(dt, 0.1)
    const dur = toast && toast.text.length > 60 ? 4.5 : 2.6
    const show = t.current < dur
    mesh.visible = show
    if (!show) return
    const vr = state.gl.xr.isPresenting
    placeInFront(mesh, vr ? 1.1 : 0.8, vr ? 0.2 : 0.2, 0, t.current < 0.05 ? 1 : Math.min(1, dt * 5))
    mesh.material.opacity = Math.min(1, (dur - t.current) * 3)
  })
  return <primitive object={mesh} />
}
