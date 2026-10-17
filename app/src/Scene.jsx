import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useXR, XROrigin } from '@react-three/xr'
import { useApp } from './store.js'
import { headPose } from './scene/head.js'
import FirstPerson from './scene/FirstPerson.jsx'
import VRRig, { VRHands } from './scene/VRRig.jsx'
import ScreenFx, { FX } from './scene/ScreenFx.jsx'
import { WORLD, findObj } from './scene/interact.js'
import * as A from './scene/actions.js'
import './interact/handlers.js'
import { Splash, ControllerPrompt } from './ui/XrOverlays.jsx'
import Toast from './ui/Toast.jsx'
import Tablet from './ui/Tablet.jsx'
import Modal from './ui/Modal.jsx'
import Consequence from './ui/Consequence.jsx'
import Debrief from './ui/Debrief.jsx'
import GuideArrow from './ui/GuideArrow.jsx'
import LobbyWorld from './world/lobby/LobbyWorld.jsx'
import { WORLDS } from './world/index.js'
import { useRun, frameTick, getRun, spawnOf } from './run/bridge.js'
import { SCENARIO_INDEX } from './scenarios/index.js'
import { HIGHLIGHT_MAT } from './interact/kit.jsx'

/*
 * Escena: el entorno de la pantalla actual (lobby o escenario) + el jugador (primera persona en
 * PC o plataforma VR) + la interfaz espacial (tableta, avisos, paneles, consecuencia, debrief).
 */

/* entorno del escenario: se monta de nuevo en cada intento (runId) y lleva al jugador a su punto de aparición */
function ScenarioStage({ scenario }) {
  const World = WORLDS[scenario.world]
  useEffect(() => { useApp.getState().requestTeleport(spawnOf(scenario)) }, [scenario])
  return World ? <World scenario={scenario} /> : null
}

export default function Scene() {
  const inSession = useXR((s) => s.session != null)
  const view = useApp((s) => s.view)
  const screen = useApp((s) => s.screen)
  const scenarioId = useApp((s) => s.scenarioId)
  const runId = useRun((s) => s.runId)
  const originRef = useRef()
  const worldRef = useRef()
  const fpsAcc = useRef({ t: 0, n: 0 })
  const fade = useApp((s) => s.fadeReq)

  useEffect(() => {
    const st = useApp.getState()
    st.setInXR(inSession)
    if (inSession) { st.setView('vr'); if (st.screen === 'portada') st.setScreen('lobby') }
    else if (st.view === 'vr') { st.setView(null); st.setScreen('portada') }
  }, [inSession])
  useEffect(() => { if (fade) FX.fade = 1 }, [fade])

  useFrame((state, dt) => {
    headPose(state)
    frameTick(Math.min(dt, 0.1))
    HIGHLIGHT_MAT.opacity = 0.45 + 0.45 * Math.sin(state.clock.elapsedTime * 5)
    const f = fpsAcc.current; f.t += dt; f.n++
    if (f.t >= 1) { useApp.getState().setFps(Math.round(f.n / f.t)); f.t = 0; f.n = 0 }
  })

  /* en VR el gatillo llega como evento de puntero del rayo del mando sobre las mallas de selección */
  const onClick = (e) => {
    if (useApp.getState().view !== 'vr') return
    const hit = findObj(e.object)
    if (!hit) return
    e.stopPropagation()
    A.trigger({ obj: hit.obj, verb: hit.object.userData.verb })
  }
  const onOver = (e) => { if (useApp.getState().view !== 'vr') return; const hit = findObj(e.object); if (hit) { e.stopPropagation(); useApp.getState().hover(hit.obj) } }
  const onOut = () => { if (useApp.getState().view === 'vr') useApp.getState().hover(null) }

  const scenario = SCENARIO_INDEX[scenarioId]
  const inScenario = (screen === 'escenario' || screen === 'debrief') && scenario && getRun()

  return (
    <>
      <XROrigin ref={originRef}>{inSession && <VRHands />}</XROrigin>
      <ambientLight intensity={0.25} />
      <group ref={(g) => { worldRef.current = g; WORLD.root = g }} onClick={onClick} onPointerOver={onOver} onPointerOut={onOut}>
        {inScenario ? <ScenarioStage key={runId} scenario={scenario} /> : <LobbyWorld />}
      </group>
      {view === 'fp' && !inSession && <FirstPerson />}
      {inSession && <VRRig originRef={originRef} />}
      <ScreenFx />
      <Toast />
      {screen === 'escenario' && <Tablet />}
      {screen === 'escenario' && <Modal />}
      {screen === 'escenario' && <Consequence />}
      {screen === 'escenario' && <GuideArrow />}
      {screen === 'debrief' && <Debrief />}
      {inSession && <Splash />}
      {inSession && <ControllerPrompt />}
    </>
  )
}
