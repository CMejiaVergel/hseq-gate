import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useXR, XROrigin } from '@react-three/xr'
import { useApp } from './store.js'
import { headPose } from './scene/head.js'
import FirstPerson from './scene/FirstPerson.jsx'
import VRRig, { VRHands } from './scene/VRRig.jsx'
import ScreenFx from './scene/ScreenFx.jsx'
import { Splash, ControllerPrompt } from './ui/XrOverlays.jsx'
import TestWorld from './world/test/TestWorld.jsx'

/*
 * Escena: el entorno de la pantalla actual + el jugador (primera persona en PC o plataforma VR)
 * + las capas de interfaz del visor.
 */
export default function Scene() {
  const inSession = useXR((s) => s.session != null)
  const view = useApp((s) => s.view)
  const originRef = useRef()
  const fpsAcc = useRef({ t: 0, n: 0 })

  useEffect(() => {
    const st = useApp.getState()
    st.setInXR(inSession)
    if (inSession) st.setView('vr')
    else if (st.view === 'vr') st.setView(null)
  }, [inSession])

  useFrame((state, dt) => {
    headPose(state)
    const f = fpsAcc.current; f.t += dt; f.n++
    if (f.t >= 1) { useApp.getState().setFps(Math.round(f.n / f.t)); f.t = 0; f.n = 0 }
  })

  return (
    <>
      <XROrigin ref={originRef}>{inSession && <VRHands />}</XROrigin>
      <ambientLight intensity={0.3} />
      <TestWorld />
      {view === 'fp' && !inSession && <FirstPerson />}
      {inSession && <VRRig originRef={originRef} />}
      <ScreenFx />
      {inSession && <Splash />}
      {inSession && <ControllerPrompt />}
    </>
  )
}
