import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Collector } from '../../geometry/builder.js'
import { solidMaterial } from '../../geometry/materials.js'
import { resetWalk, setStart, addFlat, addHole, addRect, addSeg, addCircle, addClimb } from '../../walk/walk.js'
import { signAtlas } from '../common/signs.js'
import { useDisposable } from '../../geometry/dispose.js'
import VRWorld from '../../scene/VRWorld.jsx'
import { board, person, cone, gateValveBody } from '../../interact/parts.js'
import { Valve, Item, Pick, StateSwitch, FanBlades, Screen } from '../../interact/kit.jsx'
import { useRunState, useRun, useSnap } from '../../run/bridge.js'

/*
 * Entorno del escenario de espacios confinados (docs/05): explanada con la tapa del manhole de
 * 24", foso de concreto de 3 × 3 × 3,5 m (se puede bajar y caminar adentro), escalera fija,
 * válvula a inspeccionar, línea con dos válvulas de bloqueo y brida ciega, ventilador con ducto
 * flexible, trípode con winche, detector con sonda, mesa de herramientas, tablero de permisos,
 * vigía (Andrés) y supervisora (Laura).
 */
const D = 3.5                                   // profundidad del foso
const M = { x: 0, z: -2 }                       // centro del manhole
const PIT = { x0: -1.5, x1: 1.5, z0: -3.6, z1: -0.6 }
const W90 = Math.PI / 2

/* tapa del manhole: se corre a un lado al abrir */
function Lid() {
  const st = useRunState('manhole')
  return (
    <mesh position={st === 'abierta' ? [M.x + 0.75, 0.04, M.z + 0.35] : [M.x, 0.04, M.z]} material={solidMaterial('darksteel')} raycast={() => null}>
      <cylinderGeometry args={[0.36, 0.36, 0.05, 20]} />
    </mesh>
  )
}

/* ducto flexible: del ventilador al fondo del foso cuando está instalado */
function Duct() {
  const st = useRunState('ducto')
  const g = useMemo(() => {
    const c = new Collector()
    if (st === 'instalado') c.pipeline([[1.75, 0.35, -0.55], [0.6, 0.35, -1.3], [-0.15, 0.25, M.z - 0.15], [-0.15, -D + 0.4, M.z - 0.15]], 0.1, 'yellow')
    else c.pipeline([[1.75, 0.35, -0.55], [1.2, 0.1, -0.3], [1.0, 0.1, 0.3]], 0.1, 'yellow')
    return c.build('ducto')
  }, [st])
  useDisposable(g)
  return <primitive object={g} />
}

/* trípode con winche: armado sobre el manhole o plegado en el piso */
function Tripod() {
  const st = useRunState('tripode')
  const winch = useRunState('winche')
  const g = useMemo(() => {
    const c = new Collector()
    if (st === 'montado') {
      const top = [M.x, 2.3, M.z]
      for (let k = 0; k < 3; k++) { const a = k * (Math.PI * 2 / 3) + 0.3; c.pipe([M.x + Math.cos(a) * 1.1, 0, M.z + Math.sin(a) * 1.1], top, 0.03, 'orange') }
      c.box(0.2, 0.2, 0.2, 'red', { pos: [M.x + 0.25, 1.4, M.z + 0.3] })                                     // winche
      if (winch === 'conectado') c.pipe(top, [M.x, 0.9, M.z], 0.006, 'black')
    } else for (let k = 0; k < 3; k++) c.pipe([-1.9 + k * 0.08, 0.04, 0.0], [-1.9 + k * 0.08, 0.04, 1.9], 0.03, 'orange')
    return c.build('tripode')
  }, [st, winch])
  useDisposable(g)
  return <primitive object={g} />
}

/* detector de la sonda: pantalla con la última lectura (se redibuja solo al medir) */
function DetectorStand() {
  const st = useRunState('detector')
  const lv = st?.hist?.[st.hist.length - 1]
  const r = lv && st.lecturas[lv]
  const text = !st?.on ? 'APAGADO' : !r ? (st.bump ? 'BUMP OK\nLISTO' : 'SIN BUMP') : `${lv.toUpperCase()}\nO2 ${r.o2.toFixed(1)} LEL ${r.lel}\nH2S ${r.h2s} CO ${r.co}\n${r.ok ? 'OK' : 'ALARMA'}`
  return (
    <group position={[1.0, 0.6, -1.1]}>
      <mesh position={[0, 0.08, 0]} material={solidMaterial('yellow')} raycast={() => null}><boxGeometry args={[0.12, 0.2, 0.06]} /></mesh>
      <Screen text={text} w={0.1} h={0.08} position={[0, 0.11, 0.032]} color={r && !r.ok ? '#ff8080' : '#9fffb0'} />
      <Pick id="detector" box={[0.16, 0.26, 0.12]} offset={[0, 0.08, 0]} />
    </group>
  )
}

/* detector personal: parpadea en rojo con la alarma */
function PersonalDetector() {
  const st = useRunState('detector-personal')
  const alarm = useSnap((s) => s.flags.includes('alarma'))
  const ref = useRef()
  useFrame((state) => { if (ref.current) ref.current.visible = alarm && st?.on && Math.sin(state.clock.elapsedTime * 18) > 0 })
  return (
    <group position={[-2.8, 0.95, -0.4]}>
      <mesh position={[0, 0.06, 0]} material={solidMaterial(st?.on ? 'green' : 'yellow')} raycast={() => null}><boxGeometry args={[0.07, 0.12, 0.04]} /></mesh>
      <mesh ref={ref} position={[0, 0.14, 0]} raycast={() => null}><sphereGeometry args={[0.03, 8, 6]} /><meshBasicMaterial color="#ff2020" /></mesh>
      <Pick id="detector-personal" box={[0.12, 0.16, 0.1]} offset={[0, 0.06, 0]} />
    </group>
  )
}

export default function ConfinadosWorld({ scenario }) {
  const group = useMemo(() => {
    resetWalk([-8, -8, 8, 8])
    setStart(scenario.spawn)
    const c = new Collector()
    /* explanada con el hueco del manhole (0,7 × 0,7 m) */
    const h = 0.35
    const zs = M.z + h, zn = M.z - h
    c.box(16, 0.1, 8 - zs, 'concrete', { pos: [0, -0.05, (zs + 8) / 2] })
    c.box(16, 0.1, zn + 8, 'concrete', { pos: [0, -0.05, (zn - 8) / 2] })
    c.box(8 - h, 0.1, 2 * h, 'concrete', { pos: [-(8 + h) / 2, -0.05, M.z] })
    c.box(8 - h, 0.1, 2 * h, 'concrete', { pos: [(8 + h) / 2, -0.05, M.z] })
    c.torus(0.38, 0.04, 'darksteel', { pos: [M.x, 0.02, M.z], rot: [W90, 0, 0], seg: 24, tseg: 5 })   // marco
    addHole(M.x, M.z, h, h)
    /* foso: paredes, piso con lodo, válvula y su línea */
    const wl = (ax, az, bx, bz) => { const len = Math.hypot(bx - ax, bz - az); c.box(len + 0.2, D, 0.2, 'slab', { pos: [(ax + bx) / 2, -D / 2, (az + bz) / 2], rot: [0, Math.atan2(-(bz - az), bx - ax), 0] }); addSeg(ax, az, bx, bz, 0.12, -D, 0) }
    wl(PIT.x0, PIT.z0, PIT.x1, PIT.z0); wl(PIT.x0, PIT.z1, PIT.x1, PIT.z1); wl(PIT.x0, PIT.z0, PIT.x0, PIT.z1); wl(PIT.x1, PIT.z0, PIT.x1, PIT.z1)
    c.box(3, 0.1, 3, 'concrete', { pos: [0, -D - 0.05, M.z] })
    c.box(1.2, 0.02, 0.9, 'mud', { pos: [-0.5, -D + 0.01, M.z - 0.6] })
    addFlat(0, M.z, 1.45, 1.45, -D)
    c.pipeline([[PIT.x1 + 0.2, -2.6, -3.0], [-0.4, -2.6, -3.0]], 0.08, 'steel')
    gateValveBody(c, [0.7, -2.6, -3.0], { axis: 'x', D: 0.16, h: 0.45 })
    c.cyl(0.13, 0.03, 'red', { pos: [0.7, -2.12, -3.0], seg: 16 })
    for (let y = -D + 0.3; y < 0; y += 0.3) c.pipe([-0.22, y, M.z + 0.4], [0.22, y, M.z + 0.4], 0.014, 'galv')   // escalera fija
    for (const s of [-0.22, 0.22]) c.pipe([s, -D, M.z + 0.42], [s, 0.6, M.z + 0.42], 0.02, 'galv')
    addClimb({ obj: 'escalera-foso', foot: [0, M.z + 0.05, -D], top: [0, M.z + 0.95, 0], yaw: 0 })
    /* línea que entra a la cámara: tramo en superficie con dos válvulas y la brida */
    c.pipeline([[3.5, -1.2, -3.0], [3.5, 0.7, -3.0], [3.5, 0.7, 0.0], [3.5, -1.2, 0.0]], 0.07, 'steel')
    gateValveBody(c, [3.5, 0.7, -2.4], { axis: 'z', D: 0.14, h: 0.45 })
    gateValveBody(c, [3.5, 0.7, -1.0], { axis: 'z', D: 0.14, h: 0.45 })
    c.flange([3.5, 0.7, -1.7], [0, 0, 1], 0.07)
    addSeg(3.5, -3.1, 3.5, 0.1, 0.12, 0, 1.2)
    /* ventilador */
    c.box(0.5, 0.5, 0.4, 'blue', { pos: [2.2, 0.3, -0.4] }); c.cyl(0.26, 0.12, 'darksteel', { pos: [2.0, 0.35, -0.5], rot: [0, 0, W90], seg: 16 })
    addRect(2.2, -0.4, 0.35, 0.3, 0, 0.8)
    /* mesa de herramientas y EPP */
    c.box(0.7, 0.05, 2.6, 'wood', { pos: [-2.8, 0.9, -0.6] })
    for (const z of [-1.8, 0.6]) c.box(0.6, 0.9, 0.05, 'darksteel', { pos: [-2.8, 0.45, z] })
    addRect(-2.8, -0.6, 0.4, 1.35, 0, 1)
    c.box(0.06, 1.6, 0.06, 'darksteel', { pos: [-2.8, 0.8, 0.3] })                                            // perchero del arnés
    /* tablero de permisos */
    board(c, [-3.6, 1.45, 2.0], 0, 1.0, 0.75)
    for (const x of [-4.05, -3.15]) c.box(0.06, 1.8, 0.06, 'darksteel', { pos: [x, 0.9, 1.97] })
    addSeg(-4.1, 1.97, -3.1, 1.97, 0.08, 0, 2)
    /* NPCs */
    person(c, [-3.6, 0, 3.2], Math.PI)
    addCircle(-3.6, 3.2, 0.35, 0, 2)
    person(c, [-1.3, 0, -0.9], -W90 + 0.6, { vest: 'yellow' })
    addCircle(-1.3, -0.9, 0.35, 0, 2)
    return c.build('confinados')
  }, [scenario])

  const signs = useMemo(() => signAtlas([
    { text: 'Espacio confinado\nNo entrar sin permiso', kind: 'peligro', w: 0.7, h: 0.5, pos: [2.0, 1.2, 0.6], rotY: 0 },
    { text: 'PERMISO DE ENTRADA\nCV-07', kind: 'rotulo', w: 0.8, h: 0.55, pos: [-3.6, 1.45, 2.025] },
    { text: 'V-71', kind: 'rotulo', w: 0.16, h: 0.07, pos: [3.4, 1.0, -2.4], rotY: -W90 },
    { text: 'V-72', kind: 'rotulo', w: 0.16, h: 0.07, pos: [3.4, 1.0, -1.0], rotY: -W90 },
    { text: 'Brida ciega', kind: 'advertencia', title: '', w: 0.3, h: 0.1, pos: [3.4, 1.0, -1.7], rotY: -W90 },
    { text: 'Cámara de válvulas CV-07', kind: 'oscuro', w: 0.7, h: 0.18, pos: [M.x, -0.6, PIT.z0 + 0.12] },
  ], 320), [])

  useDisposable(group); useDisposable(signs)
  const alarm = useRun((s) => !!s.snap?.flags?.includes('alarma'))
  return (
    <>
      <VRWorld />
      <primitive object={group} />
      <primitive object={signs} />
      {/* luz portátil dentro del foso (tenue) */}
      <pointLight position={[0, -1.2, M.z]} intensity={alarm ? 3 : 4} distance={5} color={alarm ? '#ffb0a0' : '#fff2d8'} />
      <Lid />
      <Pick id="manhole" box={[0.8, 0.12, 0.8]} position={[M.x, 0.05, M.z]} />
      <Duct />
      <Pick id="ducto" box={[0.4, 0.4, 0.4]} position={[1.75, 0.35, -0.55]} />
      <FanBlades id="ventilador" position={[1.93, 0.35, -0.5]} rotation={[0, -W90, 0]} r={0.22} />
      <Pick id="ventilador" box={[0.5, 0.5, 0.4]} position={[2.3, 0.3, -0.4]} />
      <Tripod />
      <Pick id="tripode" box={[0.6, 0.4, 2.0]} position={[-1.8, 0.2, 1.0]} />
      <Pick id="winche" box={[0.3, 0.3, 0.3]} position={[M.x + 0.25, 1.4, M.z + 0.3]} />
      <StateSwitch id="barrera-pozo" render={(st) => <PitCones placed={st === 'colocada'} />} />
      <Pick id="barrera-pozo" box={[0.6, 0.9, 0.6]} position={[2.6, 0.45, 1.2]} />
      <DetectorStand />
      <PersonalDetector />
      <Valve id="v-entrada-1" position={[3.5, 1.15, -2.4]} />
      <Valve id="v-entrada-2" position={[3.5, 1.15, -1.0]} />
      <StateSwitch id="brida" render={(st) => st === 'instalada'
        ? <mesh position={[3.5, 0.7, -1.7]} rotation={[W90, 0, 0]} material={solidMaterial('red')} raycast={() => null}><cylinderGeometry args={[0.15, 0.15, 0.03, 16]} /></mesh>
        : <mesh position={[3.1, 0.15, -1.7]} rotation={[0.3, 0, 0]} material={solidMaterial('red')} raycast={() => null}><cylinderGeometry args={[0.15, 0.15, 0.03, 16]} /></mesh>} />
      <Pick id="brida" box={[0.4, 0.4, 0.3]} position={[3.4, 0.6, -1.7]} />
      <Pick id="valvula-foso" box={[0.6, 0.7, 0.4]} position={[0.7, -2.4, -3.0]} />
      <Item id="llave-manhole" position={[-2.75, 0.93, -1.2]} rotation={[0, 0, W90]} box={[0.4, 0.12, 0.12]} />
      <Item id="barra" position={[-2.75, 0.93, -1.7]} rotation={[0, 0, W90]} box={[0.3, 0.12, 0.12]} />
      <StateSwitch id="arnes-c" render={(st) => st?.puesto ? null : (
        <mesh position={[-2.75, 1.25, 0.3]} material={solidMaterial('orange')} raycast={() => null}><boxGeometry args={[0.06, 0.6, 0.3]} /></mesh>
      )} />
      <Pick id="arnes-c" box={[0.2, 0.7, 0.4]} position={[-2.75, 1.25, 0.3]} />
      <Pick id="permiso-entrada" box={[1.0, 0.75, 0.08]} position={[-3.6, 1.45, 2.05]} />
      <Pick id="supervisora" box={[0.6, 1.8, 0.6]} position={[-3.6, 0.9, 3.2]} />
      <Pick id="vigia" box={[0.6, 1.8, 0.6]} position={[-1.3, 0.9, -0.9]} />
    </>
  )
}

/* conos alrededor del manhole, o apilados junto al letrero */
function PitCones({ placed }) {
  const g = useMemo(() => {
    const c = new Collector()
    if (placed) {
      const pts = [[-1.9, -4.0], [1.9, -4.0], [1.9, -0.1], [-1.9, -0.1]]
      pts.forEach(([x, z]) => cone(c, x, z))
      for (let i = 0; i < 4; i++) { const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % 4]; c.pipe([ax, 0.45, az], [bx, 0.45, bz], 0.012, 'red') }
    } else for (let i = 0; i < 4; i++) c.cone(0.14, 0.5, 'orange', { pos: [2.6, 0.27 + i * 0.08, 1.2], seg: 10 })
    return c.build('conos')
  }, [placed])
  useDisposable(g)
  return <primitive object={g} />
}
