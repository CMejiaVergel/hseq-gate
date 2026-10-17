import { useMemo } from 'react'
import { Collector } from '../../geometry/builder.js'
import { resetWalk, setStart, addRect } from '../../walk/walk.js'
import { room, ceilingLight } from '../common/room.js'
import { signAtlas } from '../common/signs.js'
import VRWorld from '../../scene/VRWorld.jsx'
import { gateValveBody, board, lockStation } from '../../interact/parts.js'
import { Valve, Breaker, Item, LockPoint, Pick, StateSwitch, Screen } from '../../interact/kit.jsx'
import { useRunState } from '../../run/bridge.js'
import { solidMaterial } from '../../geometry/materials.js'

/*
 * Entorno del escenario de demostración: un cuarto de 8 × 8 m con un tablero de permisos, la
 * estación de bloqueo, un interruptor, una válvula en una línea, un detector y una tapa.
 */
function DetectorView({ id, position }) {
  const st = useRunState(id)
  const r = st?.lecturas?.zona
  const text = !st?.on ? 'APAGADO' : r ? `O2 ${r.o2.toFixed(1)}%\nLEL ${r.lel}%\nH2S ${r.h2s} CO ${r.co}` : 'LISTO\nMEDIR'
  return (
    <group position={position}>
      <mesh material={solidMaterial('yellow')} position={[0, 0.07, 0]} raycast={() => null}><boxGeometry args={[0.09, 0.15, 0.05]} /></mesh>
      <Screen text={text} w={0.07} h={0.06} position={[0, 0.1, 0.026]} />
      <Pick id={id} box={[0.12, 0.18, 0.1]} offset={[0, 0.08, 0]} />
    </group>
  )
}

export default function DemoWorld({ scenario }) {
  const group = useMemo(() => {
    resetWalk([-4, -4, 4, 4])
    setStart(scenario.spawn)
    const c = new Collector()
    room(c, -4, -2.2, 4, 4, { h: 3, wallMat: 'wall', floorMat: 'floor' })
    ceilingLight(c, -1.5, 0.5); ceilingLight(c, 1.5, 0.5); ceilingLight(c, 0, 2.8)
    board(c, [-2.5, 1.4, -2.08], 0, 0.8, 0.6)
    lockStation(c, [-1.05, 1.35, -2.08], 0, 0.9, 0.7)
    c.box(0.5, 0.7, 0.25, 'panel', { pos: [0.6, 1.4, -1.97] })             // caja del interruptor
    c.box(0.12, 0.2, 0.04, 'black', { pos: [0.6, 1.45, -1.83] })
    c.pipeline([[1.0, 1.0, -2.1], [2.2, 1.0, -2.1], [2.2, 1.0, -1.2], [3.9, 1.0, -1.2]], 0.07, 'steel')
    gateValveBody(c, [2.9, 1.0, -1.2], { axis: 'x', D: 0.14, h: 0.5 })
    c.box(1.0, 0.05, 0.6, 'wood', { pos: [-2.2, 0.85, 0.5] })                // mesa del detector
    for (const dx of [-0.45, 0.45]) for (const dz of [-0.25, 0.25]) c.box(0.04, 0.85, 0.04, 'darksteel', { pos: [-2.2 + dx, 0.425, 0.5 + dz] })
    c.box(0.8, 0.6, 0.6, 'galv', { pos: [2.6, 0.3, 0.6] })                   // caja con tapa de inspección
    addRect(-2.2, 0.5, 0.55, 0.35, 0, 1); addRect(2.6, 0.6, 0.45, 0.35, 0, 1)
    const g = c.build('demo')
    g.add(signAtlas([
      { text: 'PERMISO DE TRABAJO\n\nDemostración', kind: 'rotulo', w: 0.7, h: 0.5, pos: [-2.5, 1.4, -2.06] },
      { text: 'Estación de bloqueo', kind: 'peligro', title: 'LOTO', w: 0.5, h: 0.22, pos: [-1.05, 1.82, -2.06] },
      { text: 'INT-01', kind: 'rotulo', w: 0.2, h: 0.08, pos: [0.6, 1.66, -1.84] },
      { text: 'V-01', kind: 'rotulo', w: 0.16, h: 0.07, pos: [2.9, 1.25, -1.12] },
      { text: 'Tapa de inspección', kind: 'advertencia', w: 0.5, h: 0.3, pos: [2.6, 0.45, 0.91] },
    ]))
    return g
  }, [scenario])

  return (
    <>
      <VRWorld sky={false} background="#1b2232" />
      <hemisphereLight args={['#ffffff', '#7a756a', 1.0]} />
      <directionalLight position={[2, 6, 3]} intensity={0.9} />
      <primitive object={group} />
      <Pick id="permiso" box={[0.8, 0.6, 0.06]} position={[-2.5, 1.4, -2.04]} />
      <Item id="candado" position={[-1.25, 1.3, -2.02]} />
      <Item id="candado-x" position={[-0.85, 1.3, -2.02]} />
      <Breaker id="int-01" position={[0.6, 1.42, -1.8]} />
      <LockPoint id="punto-int" position={[0.6, 1.25, -1.8]} />
      <Valve id="v-01" position={[2.9, 1.52, -1.2]} />
      <DetectorView id="detector" position={[-2.2, 0.875, 0.5]} />
      <StateSwitch id="tapa" render={(st) => (
        <mesh position={st === 'abierta' ? [2.6, 0.62, 0.25] : [2.6, 0.62, 0.6]} rotation={st === 'abierta' ? [-1.2, 0, 0] : [0, 0, 0]} material={solidMaterial('yellow')} raycast={() => null}>
          <boxGeometry args={[0.7, 0.03, 0.5]} />
        </mesh>
      )} />
      <Pick id="tapa" box={[0.8, 0.2, 0.6]} position={[2.6, 0.62, 0.6]} />
    </>
  )
}
