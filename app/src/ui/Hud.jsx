import { useApp, MODES } from '../store.js'
import { useRun, getRun } from '../run/bridge.js'

/*
 * HUD del modo PC (DOM, fuera de WebXR): mira, nombre de lo apuntado, objeto en la mano y
 * recordatorio de teclas.  En el visor no existe: allí todo es espacial.
 */
export default function Hud() {
  const hovered = useApp((s) => s.hovered)
  const screen = useApp((s) => s.screen)
  const hand = useRun((s) => s.snap?.hand)
  const mode = useRun((s) => s.snap?.mode)
  const run = getRun()
  const label = hovered && run?.objects[hovered]?.label
  const handLabel = hand && run?.objects[hand]?.label
  return (
    <>
      <div className={'crosshair' + (label ? ' on' : '')} />
      {label && <div className="hud-aim">{label}</div>}
      <div className="hud-keys">
        {screen === 'escenario' && <div className="hud-hand">{MODES[mode]} · En la mano: <b>{handLabel || '—'}</b></div>}
        <span>Clic / Espacio: interactuar</span><span>E: tomar/soltar</span><span>F: usar · escalera</span><span>Q: inventario</span><span>Tab: tableta</span>{mode === 'aprendizaje' && <span>R: repetir instrucción</span>}
      </div>
    </>
  )
}
