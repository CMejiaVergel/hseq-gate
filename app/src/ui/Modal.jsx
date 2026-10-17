import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import Panel3D from './Panel3D.jsx'
import { useApp } from '../store.js'
import { useRun, getRun, act } from '../run/bridge.js'
import { objectPanel } from './objectPanels.js'
import { placeInFront } from './place.js'
import { PLAYER } from '../walk/walk.js'
import * as S from '../world/effects/sound.js'

/*
 * Panel de detalle del objeto apuntado (documento, diálogo, inspección…).  Aparece fijo delante
 * de la vista al abrirse (para poder apuntarlo con la mira en el PC o el rayo en el visor) y se
 * cierra solo si el jugador se aleja más de 3,5 m.
 */
export default function Modal() {
  const modal = useApp((s) => s.modal)
  const snap = useRun((s) => s.snap)
  const ref = useRef()
  const at = useRef({ x: 0, z: 0 })
  const gl = useThree((s) => s.gl)

  const panel = useMemo(() => {
    const run = getRun()
    if (!modal || !run || !snap || !run.objects[modal.objId]) return null
    return objectPanel(modal.objId, run, snap)
  }, [modal, snap])

  useEffect(() => {
    if (!modal || !ref.current) return
    const vr = gl.xr.isPresenting
    placeInFront(ref.current, vr ? 0.75 : 0.85, vr ? -0.12 : -0.08)
    at.current = { x: PLAYER.x, z: PLAYER.z }
  }, [modal, gl, panel != null])  // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    if (!modal) return
    if (Math.hypot(PLAYER.x - at.current.x, PLAYER.z - at.current.z) > 3.5) useApp.getState().openModal(null)
  })

  if (!panel) return null
  const onAction = (id) => {
    if (id === 'cerrar') { useApp.getState().openModal(null); S.click(); return }
    const a = panel.actions[id]
    if (!a) return
    const r = act(a[0], a[1], a[2])
    if (r.ok) S.click(); else S.beep(220, 0.08, 0.15)
  }
  return <Panel3D ref={ref} widgets={panel.widgets} width={0.5} onAction={onAction} renderOrder={10} />
}
