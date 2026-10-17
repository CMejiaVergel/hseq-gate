import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { XR } from '@react-three/xr'
import Scene from './Scene.jsx'
import { xrStore } from './xr/store.js'
import { useApp } from './store.js'
import { PICK_LAYER } from './scene/interact.js'
import { APP_VERSION } from './ui/XrOverlays.jsx'
import Hud from './ui/Hud.jsx'
import Instructor from './ui/Instructor.jsx'

/*
 * App = canvas 3D + capa DOM.  En el navegador 2D el DOM ofrece la portada, el panel del
 * instructor y la mira del modo PC.  Dentro de WebXR el DOM no existe: toda la interfaz del
 * visor vive en la escena (paneles 3D, ver ui/).
 *
 * App de Quest (APK inmersivo, start_url /hseq/?app=quest): entra sola a VR al abrir
 * (mismo patrón que Smart Plant 3D: tocar el icono cuenta como el gesto que exige requestSession).
 */
const QUEST_APP = new URLSearchParams(location.search).get('app') === 'quest'
let autoVRTried = false
function autoEnterVR() {
  if (autoVRTried) return
  autoVRTried = true
  const go = () => setTimeout(() => xrStore.enterVR().catch(() => { /* sin sesión: queda la portada */ }), 400)
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true })
}

export default function App() {
  const [vr, setVr] = useState(null)
  const [inSession, setInSession] = useState(false)
  const view = useApp((s) => s.view)
  const screen = useApp((s) => s.screen)
  const quality = useApp((s) => s.quality)

  useEffect(() => {
    const check = () => {
      if (!navigator.xr) { setVr(false); return }
      navigator.xr.isSessionSupported('immersive-vr').catch(() => false).then((ok) => {
        setVr(ok)
        if (QUEST_APP && ok) autoEnterVR()
      })
    }
    check()
    let hadEmulator = false
    return xrStore.subscribe((s) => {
      setInSession(s.session != null)
      if (s.emulator && !hadEmulator) { hadEmulator = true; check() }
    })
  }, [])

  const dpr = quality === 'high' ? [1, 2] : quality === 'medium' ? [1, 1.5] : [0.8, 1]
  const enterPC = () => { const st = useApp.getState(); st.setView('fp'); st.setScreen('lobby') }

  return (
    <>
      <Canvas
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 1.65, 6], fov: 65, near: 0.05, far: 600 }}
        dpr={dpr}
        onCreated={(state) => {
          state.raycaster.layers.enable(PICK_LAYER)   // clics y puntería sobre las mallas de selección
          if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) window.__r3f = state
        }}
      >
        <XR store={xrStore}>
          <Scene />
        </XR>
      </Canvas>

      {!inSession && view === 'fp' && <Hud />}

      {!inSession && screen === 'instructor' && <Instructor />}

      {!inSession && !view && screen !== 'instructor' && (
        <div className="overlay">
          <header>
            <span className="brand">HSEQ GATE</span>
            <span className="sub">Entrenamiento HSEQ en realidad virtual · v{APP_VERSION}</span>
          </header>
          <main>
            <h1>Cruza la puerta segura</h1>
            <p>Practica procedimientos críticos de seguridad —bloqueo y etiquetado (LOTO), trabajo en alturas y espacios confinados— a escala real, sin exponerte en campo. El sistema guía, detecta errores críticos y muestra su consecuencia simulada.</p>
            <button className="enter" onClick={() => xrStore.enterVR()} disabled={vr === false}>
              {vr === false ? 'Este navegador no soporta realidad virtual' : 'Entrar en realidad virtual'}
            </button>
            <button className="enter alt" onClick={enterPC}>Recorrer en el PC (primera persona)</button>
            <button className="enter alt" onClick={() => useApp.getState().setScreen('instructor')}>Panel del instructor · resultados y certificados</button>
            <p className="hint">PC: W A S D para caminar, ratón para mirar, clic para interactuar, E tomar/soltar, F usar objeto o escalera, Q siguiente objeto, Tab tableta. Visor: stick izquierdo camina, derecho gira (adelante y soltar = teletransporte), gatillo interactúa, grip toma, A usa, B inventario, Y tableta.</p>
          </main>
          <footer>
            <span>Material de entrenamiento: requiere validación de un profesional HSE.</span>
            <span>Voltac Systems</span>
          </footer>
        </div>
      )}
    </>
  )
}
