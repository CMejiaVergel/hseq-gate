import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Collector } from '../../geometry/builder.js'
import { solidMaterial } from '../../geometry/materials.js'
import { resetWalk, setStart, addRect, addSeg, addCircle } from '../../walk/walk.js'
import { room, wall, ceilingLight } from '../common/room.js'
import { signAtlas } from '../common/signs.js'
import VRWorld from '../../scene/VRWorld.jsx'
import { gateValveBody, mccCabinet, pushStation, gaugeFace, board, lockStation, person } from '../../interact/parts.js'
import { Valve, Breaker, Item, LockPoint, Pick, PushButtons, Gauge, StateSwitch } from '../../interact/kit.jsx'
import { useRunState, useRun, getRun } from '../../run/bridge.js'
import Spray from '../effects/Spray.jsx'
import { BREAKERS } from '../../scenarios/loto.js'

/*
 * Entorno del escenario LOTO (docs/03): casa de bombas (14 × 10 m) con la bomba P-101 en su
 * patín, líneas de succión y descarga con sus válvulas, purga con balde, manómetro, botonera
 * local, estación de bloqueo y tablero de permisos; cuarto eléctrico contiguo con el CCM-03 y la
 * caja de bloqueo grupal; la operadora en la puerta del cuarto de control.
 */
const PY = 0.65              // altura del eje de la bomba
const W90 = Math.PI / 2

/* acople y ventilador del motor: giran con el motor en marcha (o en el arranque inesperado) */
function Rotor() {
  const motor = useRunState('motor')
  const surprise = useRun((s) => s.consequence?.name === 'arranque-inesperado')
  const ref = useRef()
  useFrame((_, dt) => { if (ref.current && (motor === 'running' || surprise)) ref.current.rotation.x += dt * 30 })
  return (
    <group ref={ref} position={[0.22, PY, -1]}>
      <mesh rotation={[0, 0, W90]} material={solidMaterial('darksteel')} raycast={() => null}><cylinderGeometry args={[0.09, 0.09, 0.16, 12]} /></mesh>
      <mesh position={[0, 0.07, 0]} material={solidMaterial('orange')} raycast={() => null}><boxGeometry args={[0.17, 0.03, 0.03]} /></mesh>
    </group>
  )
}

export default function LotoWorld({ scenario }) {
  const variant = getRun()?.variant
  const orden = variant?.orden || BREAKERS.map(([id]) => id)

  const { group, slots, ps } = useMemo(() => {
    resetWalk([-7, -5, 12, 5])
    setStart(scenario.spawn)
    const c = new Collector()
    /* casa de bombas + cuarto eléctrico */
    room(c, -7, -5, 7, 5, { h: 4.5, wallMat: 'wall2', floorMat: 'concrete', ceilMat: 'roof', doors: { e: [[1.4, 2.6, 2.2]] } })
    c.box(5, 0.1, 5, 'slab', { pos: [9.5, -0.04, -2.5] })
    c.box(5, 0.08, 5, 'white', { pos: [9.5, 3.24, -2.5] })
    wall(c, 7, -5, 12, -5, 3.2, 'cream'); wall(c, 7, 0, 12, 0, 3.2, 'cream'); wall(c, 12, -5, 12, 0, 3.2, 'cream')
    c.box(0.2, 1.3, 5, 'cream', { pos: [7, 3.85, -2.5] })                                        // remate sobre el cuarto eléctrico
    addRect(9.5, 2.5, 2.5, 2.5, 0, 4)                                                             // fuera del cuarto eléctrico: no transitable
    for (const x of [-4, 0, 4]) for (const z of [-2.5, 2]) ceilingLight(c, x, z, 4.45, 1.4, 0.35)
    ceilingLight(c, 9.5, -2.5, 3.18)
    /* puerta (cerrada) del cuarto de control al sur-este */
    c.box(1.0, 2.1, 0.06, 'navy', { pos: [6.9, 1.05, 3.6], rot: [0, W90, 0] })

    /* patín, bomba, motor */
    c.box(3.0, 0.22, 1.1, 'concrete', { pos: [0.2, 0.11, -1] })
    c.box(2.8, 0.06, 0.9, 'darksteel', { pos: [0.2, 0.25, -1] })
    c.cyl(0.34, 0.26, 'blue', { pos: [-0.55, PY, -1], rot: [0, 0, W90], seg: 24 })                    // voluta
    c.box(0.3, 0.32, 0.3, 'blue', { pos: [-0.55, 0.42, -1] })                                       // pedestal
    c.cyl(0.12, 0.45, 'blue', { pos: [-0.2, PY, -1], rot: [0, 0, W90], seg: 14 })                   // soporte de cojinetes
    c.cyl(0.035, 0.3, 'silver', { pos: [0.1, PY, -1], rot: [0, 0, W90], seg: 8 })                  // eje
    c.cyl(0.29, 0.8, 'motor', { pos: [0.75, PY, -1], rot: [0, 0, W90], seg: 20 })                   // motor
    for (let k = 0; k < 8; k++) c.box(0.78, 0.03, 0.03, 'motor', { pos: [0.75, PY + Math.sin(k * Math.PI / 4) * 0.3, -1 + Math.cos(k * Math.PI / 4) * 0.3] })
    c.cyl(0.24, 0.12, 'darksteel', { pos: [1.2, PY, -1], rot: [0, 0, W90], seg: 18 })               // tapa del ventilador
    c.box(0.22, 0.16, 0.22, 'motor', { pos: [0.75, PY + 0.36, -1] })                                // caja de bornes
    c.box(0.3, 0.3, 0.2, 'motor', { pos: [0.75, 0.42, -1] })
    addRect(0.2, -1, 1.55, 0.6, 0, 1.4)

    /* succión: de la bomba hacia el oeste y luego al muro norte */
    c.pipeline([[-0.7, PY, -1], [-3.6, PY, -1], [-3.6, PY, -4.9]], 0.085, 'steel')
    gateValveBody(c, [-2.6, PY, -1], { axis: 'x', D: 0.17, h: 0.5 })
    addSeg(-0.7, -1, -3.6, -1, 0.12, 0.3, 1.0); addSeg(-3.6, -1, -3.6, -4.9, 0.12, 0.3, 1.0)
    /* descarga: sube de la voluta y va al muro norte */
    c.pipeline([[-0.55, PY + 0.3, -1], [-0.55, 1.05, -1], [-0.55, 1.05, -4.9]], 0.07, 'steel')
    gateValveBody(c, [-0.55, 1.05, -3.0], { axis: 'z', D: 0.14, h: 0.5 })
    c.cyl(0.12, 0.3, 'darksteel', { pos: [-0.55, 1.05, -2.1], rot: [W90, 0, 0], seg: 12 })           // cheque
    c.flange([-0.55, 1.05, -1.95], [0, 0, 1], 0.07); c.flange([-0.55, 1.05, -2.25], [0, 0, 1], 0.07)
    addSeg(-0.55, -1.4, -0.55, -4.9, 0.1, 0.6, 1.3)
    /* purga al drenaje con balde */
    c.pipeline([[-0.55, 0.38, -1], [-0.3, 0.38, -1], [-0.3, 0.38, -0.55]], 0.02, 'steel')
    c.cyl(0.03, 0.08, 'darksteel', { pos: [-0.3, 0.38, -0.55], rot: [W90, 0, 0], seg: 8 })
    c.cyl(0.008, 0.2, 'silver', { pos: [-0.3, 0.5, -0.55], seg: 5 })
    c.pipe([-0.3, 0.38, -0.5], [-0.3, 0.2, -0.3], 0.018, 'steel')
    c.cyl(0.13, 0.25, 'galv', { pos: [-0.3, 0.125, -0.25], r2: 0.15, seg: 14 })                      // balde
    /* manómetro de carcasa */
    c.pipe([-0.4, PY + 0.2, -1], [-0.3, 0.95, -0.85], 0.012, 'silver')
    gaugeFace(c, [-0.3, 0.95, -0.76], 0, 0.06)

    /* botonera local y carro de herramientas */
    const ps = pushStation(c, [1.9, 0, 0.3], 0)
    addCircle(1.9, 0.3, 0.15, 0, 1.4)
    c.box(1.0, 0.04, 0.6, 'red', { pos: [2.6, 0.88, -2.5] }); c.box(1.0, 0.04, 0.6, 'red', { pos: [2.6, 0.35, -2.5] })
    for (const dx of [-0.45, 0.45]) for (const dz of [-0.25, 0.25]) c.cyl(0.015, 0.9, 'darksteel', { pos: [2.6 + dx, 0.45, -2.5 + dz], seg: 6 })
    c.box(0.12, 0.12, 0.06, 'yellow', { pos: [3.0, 0.96, -2.5] })                                    // toma de prueba (fuente conocida)
    addRect(2.6, -2.5, 0.55, 0.35, 0, 1)

    /* pared oeste: estación de bloqueo y tablero de permisos */
    lockStation(c, [-6.87, 1.3, 1.3], W90, 1.6, 1.1)
    board(c, [-6.87, 1.45, 3.2], W90, 1.9, 0.9)
    c.box(0.6, 0.75, 0.01, 'white', { pos: [-6.85, 1.45, 2.6], rot: [0, W90, 0] })
    c.box(0.6, 0.75, 0.01, 'white', { pos: [-6.85, 1.45, 3.8], rot: [0, W90, 0] })
    /* operadora */
    person(c, [5.6, 0, 3.6], -W90)
    addCircle(5.6, 3.6, 0.35, 0, 2)

    /* cuarto eléctrico: CCM-03 y caja de bloqueo grupal */
    const slots = mccCabinet(c, [9.5, 0, -4.7], 0, { n: 6, w: 1.8, h: 2.1, d: 0.5 })
    addRect(9.5, -4.7, 0.95, 0.3, 0, 2.2)
    c.box(0.35, 0.45, 0.15, 'red', { pos: [11.4, 1.3, -4.88] })
    c.box(0.3, 0.3, 0.01, 'glass', { pos: [11.4, 1.35, -4.8] })

    const g = c.build('loto')
    return { group: g, slots, ps }
  }, [scenario])

  /* rótulos (dependen de la variante: posición de cada interruptor en el CCM) */
  const signs = useMemo(() => {
    const tagOf = Object.fromEntries(BREAKERS)
    const items = [
      { text: 'P-101', kind: 'rotulo', w: 0.32, h: 0.12, pos: [-0.55, PY + 0.42, -0.86] },
      { text: 'SUCCIÓN', kind: 'rotulo', w: 0.3, h: 0.1, pos: [-1.6, PY + 0.2, -0.9] },
      { text: 'DESCARGA', kind: 'rotulo', w: 0.32, h: 0.1, pos: [-0.42, 1.25, -3.6], rotY: W90 },
      { text: 'PURGA', kind: 'advertencia', title: '', w: 0.2, h: 0.08, pos: [-0.15, 0.38, -0.5] },
      { text: 'PI-101', kind: 'rotulo', w: 0.14, h: 0.05, pos: [-0.3, 1.04, -0.74] },
      { text: 'Arranque  ·  Parada', kind: 'rotulo', w: 0.2, h: 0.06, pos: [1.9, 1.38, 0.37] },
      { text: 'Estación de bloqueo LOTO', kind: 'peligro', title: 'LOTO', w: 0.9, h: 0.3, pos: [-6.86, 2.05, 1.3], rotY: W90 },
      { text: 'Tablero de permisos', kind: 'info', w: 0.9, h: 0.22, pos: [-6.86, 2.05, 3.2], rotY: W90 },
      { text: 'ORDEN DE TRABAJO\nOT-0412\nP-101 · cambio de sello', kind: 'rotulo', w: 0.55, h: 0.55, pos: [-6.84, 1.5, 2.6], rotY: W90 },
      { text: 'PERMISO DE TRABAJO\nPT-2291\nFirma del ejecutante', kind: 'rotulo', w: 0.55, h: 0.55, pos: [-6.84, 1.5, 3.8], rotY: W90 },
      { text: 'Cuarto eléctrico\nSolo personal autorizado', kind: 'peligro', w: 0.7, h: 0.45, pos: [6.88, 2.6, -2.0], rotY: -W90 },
      { text: 'Cuarto de control', kind: 'info', w: 0.7, h: 0.22, pos: [6.85, 2.35, 3.6], rotY: -W90 },
      { text: 'CCM-03', kind: 'oscuro', w: 0.5, h: 0.16, pos: [9.5, 2.22, -4.44] },
      { text: 'Caja de bloqueo grupal', kind: 'peligro', title: 'LOTO', w: 0.4, h: 0.2, pos: [11.4, 1.7, -4.8] },
      { text: 'Probadores de tensión · Toma de prueba', kind: 'rotulo', w: 0.6, h: 0.1, pos: [2.6, 0.82, -2.19] },
    ]
    orden.forEach((id, i) => items.push({ text: tagOf[id], kind: 'rotulo', w: 0.26, h: 0.1, pos: slots[i].label }))
    return signAtlas(items, 320)
  }, [orden, slots])

  const slotOf = (id) => slots[orden.indexOf(id)]
  return (
    <>
      <VRWorld sky={false} background="#232a36" />
      <hemisphereLight args={['#f4f1ea', '#6f6a60', 1.05]} />
      <directionalLight position={[-3, 8, 4]} intensity={0.8} />
      <primitive object={group} />
      <primitive object={signs} />
      <Rotor />
      {/* guarda del acople y sello */}
      <StateSwitch id="guarda" render={(st) => (
        <mesh position={st === 'instalada' ? [0.22, PY + 0.02, -1] : [0.5, 0.33, -0.25]} rotation={st === 'instalada' ? [0, 0, 0] : [0, 0.6, 0]} material={solidMaterial('yellow')} raycast={() => null}>
          <boxGeometry args={[0.32, 0.3, 0.3]} />
        </mesh>
      )} />
      <Pick id="guarda" box={[0.36, 0.34, 0.36]} position={[0.22, PY + 0.02, -1]} />
      <StateSwitch id="sello" render={(st) => st === 'desmontado' ? null : (
        <mesh position={[-0.04, PY, -1]} rotation={[0, 0, W90]} material={solidMaterial(st === 'nuevo' ? 'green' : 'black')} raycast={() => null}>
          <torusGeometry args={[0.065, 0.018, 6, 14]} />
        </mesh>
      )} />
      <Pick id="sello" box={[0.14, 0.2, 0.2]} position={[-0.04, PY, -1.18]} />
      {/* válvulas, purga, manómetro, botonera */}
      <Valve id="v-succion" position={[-2.6, PY + 0.5, -1]} />
      <LockPoint id="punto-succion" position={[-2.6, PY + 0.25, -1]} box={[0.2, 0.18, 0.2]} device={[0, 0.25, 0]} />
      <Valve id="v-descarga" position={[-0.55, 1.55, -3.0]} />
      <LockPoint id="punto-descarga" position={[-0.55, 1.3, -3.0]} box={[0.2, 0.18, 0.2]} device={[0, 0.25, 0]} />
      <Valve id="v-purga" position={[-0.3, 0.62, -0.55]} scale={0.4} />
      <Gauge id="pi-carcasa" position={[-0.3, 0.95, -0.74]} max={100} />
      <PushButtons id="pb-local" start={ps.start} stop={ps.stop} lampObj="motor" />
      <Spray when={['quemadura']} position={[-0.3, 0.25, -0.3]} dir={[0, 0.6, 1]} speed={3} />
      <Spray when={['fuga-presion']} position={[-0.05, PY, -0.85]} dir={[0, 0.3, 1]} speed={5} />
      {/* probadores en el carro */}
      <TesterModel id="probador" position={[2.35, 0.9, -2.5]} />
      <TesterModel id="probador-2" position={[2.75, 0.9, -2.5]} />
      {/* documentos, operadora, estación de bloqueo */}
      <Pick id="ot" box={[0.08, 0.75, 0.6]} position={[-6.82, 1.45, 2.6]} />
      <Pick id="permiso" box={[0.08, 0.75, 0.6]} position={[-6.82, 1.45, 3.8]} />
      <Pick id="operador" box={[0.6, 1.8, 0.6]} position={[5.6, 0.9, 3.6]} />
      {['candado-1', 'candado-2', 'candado-3', 'candado-amarillo'].map((id) => <Item key={id} id={id} position={[-6.82, 1.5, scenario.objects[id].pos[2]]} rotation={[0, W90, 0]} />)}
      {['tarjeta-1', 'tarjeta-2', 'tarjeta-3'].map((id) => <Item key={id} id={id} position={[-6.83, 1.05, scenario.objects[id].pos[2]]} rotation={[0, W90, 0]} />)}
      {['cubre-1', 'cubre-2'].map((id) => <Item key={id} id={id} position={[-6.75, 0.95, scenario.objects[id].pos[2]]} rotation={[0, 0, W90]} box={[0.1, 0.36, 0.36]} />)}
      {/* CCM-03: interruptores y sus puntos de bloqueo */}
      {BREAKERS.map(([id]) => <Breaker key={id} id={id} position={slotOf(id).lever} />)}
      {BREAKERS.map(([id]) => <LockPoint key={'p' + id} id={'punto-' + id.slice(4)} position={slotOf(id).hasp} box={[0.16, 0.1, 0.1]} />)}
      <LockPoint id="caja-grupal" position={[11.4, 1.3, -4.78]} box={[0.36, 0.46, 0.12]} />
    </>
  )
}

/* probador de tensión (fijo en el carro; sus acciones están en su panel) */
function TesterModel({ id, position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.08, 0]} material={solidMaterial('yellow')} raycast={() => null}><boxGeometry args={[0.07, 0.16, 0.035]} /></mesh>
      <mesh position={[0, 0.12, 0.018]} material={solidMaterial('black')} raycast={() => null}><boxGeometry args={[0.05, 0.04, 0.003]} /></mesh>
      <Pick id={id} box={[0.12, 0.2, 0.1]} offset={[0, 0.08, 0]} />
    </group>
  )
}

