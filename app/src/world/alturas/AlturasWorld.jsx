import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Collector } from '../../geometry/builder.js'
import { solidMaterial, specialMaterial } from '../../geometry/materials.js'
import { resetWalk, setStart, addFlat, addRect, addSeg, addCircle, addClimb } from '../../walk/walk.js'
import { signAtlas } from '../common/signs.js'
import { useDisposable } from '../../geometry/dispose.js'
import VRWorld from '../../scene/VRWorld.jsx'
import { board, person, cone } from '../../interact/parts.js'
import { Breaker, Item, LockPoint, Pick, StateSwitch } from '../../interact/kit.jsx'
import { useRun } from '../../run/bridge.js'
import { HARNESSES } from '../../scenarios/alturas.js'

/*
 * Entorno del escenario de alturas (docs/04): rack metálico con plataforma de rejilla a 6 m,
 * baranda perimetral salvo un tramo de 3 m sin protección (marcado con cinta), escalera vertical
 * con jaula, punto de anclaje certificado en la viga (y distractores: tubería de 2", baranda,
 * bandeja portacables), luminaria junto al borde, caseta de EPP, tablero de permisos, tablero de
 * alumbrado, acordonamiento y el compañero que pasa por debajo.
 */
const H = 6
const W90 = Math.PI / 2
const P = { x0: -3.1, x1: 3.1, z0: -4.1, z1: -1.0 }      // plataforma

/* arnés colgado (forma simple: correas cruzadas y argolla) */
function harnessGeo(c, x, y, z) {
  c.box(0.04, 0.55, 0.05, 'orange', { pos: [x, y, z - 0.09] }); c.box(0.04, 0.55, 0.05, 'orange', { pos: [x, y, z + 0.09] })
  c.box(0.04, 0.05, 0.3, 'black', { pos: [x, y + 0.12, z] }); c.box(0.04, 0.05, 0.34, 'black', { pos: [x, y - 0.25, z] })
  c.torus(0.035, 0.008, 'galv', { pos: [x + 0.02, y + 0.26, z], rot: [0, W90, 0], seg: 10, tseg: 4 })
}

/* herramienta que cae (consecuencia «objeto-cae») */
function FallingTool() {
  const on = useRun((s) => s.consequence?.name === 'objeto-cae')
  const ref = useRef(), t = useRef(0)
  useFrame((_, dt) => {
    if (!ref.current) return
    if (!on) { t.current = 0; ref.current.visible = false; return }
    t.current += dt
    ref.current.visible = true
    const y = Math.max(1.7, H + 0.4 - 4.9 * t.current * t.current)
    ref.current.position.set(1.5, y, -4.4 - Math.min(1.2, t.current * 1.6))
    ref.current.rotation.z += dt * 12
  })
  return <mesh ref={ref} visible={false} material={solidMaterial('red')} raycast={() => null}><boxGeometry args={[0.04, 0.25, 0.04]} /></mesh>
}

export default function AlturasWorld({ scenario }) {
  const group = useMemo(() => {
    resetWalk([-9, -8, 9, 9])
    setStart(scenario.spawn)
    const c = new Collector()
    c.box(20, 0.1, 18, 'concrete', { pos: [0, -0.05, 0.5] })

    /* rack: columnas, vigas, plataforma */
    for (const x of [P.x0, P.x1, 0]) for (const z of [P.z0, P.z1]) {
      c.box(0.2, H + 2.6, 0.2, 'yellow', { pos: [x, (H + 2.6) / 2, z] })
      addCircle(x, z, 0.16, 0, 9)
    }
    for (const z of [P.z0, P.z1]) { c.box(6.4, 0.25, 0.15, 'yellow', { pos: [0, H - 0.15, z] }); c.box(6.4, 0.2, 0.15, 'yellow', { pos: [0, H + 2.1, z] }) }
    for (const x of [P.x0, P.x1]) c.box(0.15, 0.25, 3.2, 'yellow', { pos: [x, H - 0.15, -2.55] })
    c.box(6.4, 0.2, 0.15, 'yellow', { pos: [0, H + 2.1, -2.6] })                                    // viga del anclaje
    c.box(6.2, 0.06, 3.1, 'grating', { pos: [0, H - 0.03, -2.55] })
    addFlat(0, -2.55, 3.05, 1.52, H)
    /* tuberías del rack bajo la plataforma */
    for (const [y, r, m] of [[4.6, 0.12, 'steel'], [4.9, 0.08, 'green'], [4.3, 0.1, 'galv']]) c.pipe([-9, y, -2.0 - r * 3], [9, y, -2.0 - r * 3], r, m)
    /* barandas (salvo el tramo norte x ∈ [0, 3.1] y el hueco de la escalera) */
    c.rail([P.x0, P.z0], [0, P.z0], H); addSeg(P.x0, P.z0, 0, P.z0, 0.06, H, H + 1.1)
    c.rail([P.x0, P.z0], [P.x0, P.z1], H); addSeg(P.x0, P.z0, P.x0, P.z1, 0.06, H, H + 1.1)
    c.rail([P.x1, P.z0], [P.x1, P.z1], H); addSeg(P.x1, P.z0, P.x1, P.z1, 0.06, H, H + 1.1)
    c.rail([-2.05, P.z1], [P.x1, P.z1], H); addSeg(-2.05, P.z1, P.x1, P.z1, 0.06, H, H + 1.1)
    c.rail([P.x0, P.z1], [-2.95, P.z1], H); addSeg(P.x0, P.z1, -2.95, P.z1, 0.06, H, H + 1.1)
    for (let x = 0.15; x < 3.1; x += 0.4) c.box(0.2, 0.05, 0.02, x % 0.8 < 0.4 ? 'yellow' : 'black', { pos: [x, H + 1.0, P.z0] })   // cinta de advertencia
    c.box(3.1, 0.1, 0.02, 'yellow', { pos: [1.55, H + 0.05, P.z0 - 0.02] })                                                          // borde pintado
    /* tubería de 2" y bandeja portacables sobre la plataforma (distractores) */
    c.pipe([-3.3, H + 1.4, -1.2], [3.3, H + 1.4, -1.2], 0.03, 'galv')
    c.box(6.4, 0.08, 0.4, 'galv', { pos: [0, H + 1.9, -1.6] })
    /* punto de anclaje certificado */
    c.box(0.18, 0.12, 0.02, 'yellow', { pos: [-0.5, H + 1.95, -2.52] })
    c.torus(0.05, 0.012, 'silver', { pos: [-0.5, H + 1.92, -2.6], rot: [0, 0, 0], seg: 12, tseg: 5 })
    /* luminaria junto al borde: brazo desde la viga norte */
    c.pipe([1.5, H + 2.1, P.z0], [1.5, H + 2.1, -4.6], 0.03, 'galv'); c.pipe([1.5, H + 2.1, -4.6], [1.5, H + 1.75, -4.6], 0.02, 'galv')
    /* escalera con jaula */
    c.ladder([-2.5, -0.8], 0, H, 0, 'yellow')
    addClimb({ obj: 'escalera', foot: [-2.5, -0.35, 0], top: [-2.5, -1.45, H], yaw: 0 })
    addSeg(-2.95, -0.8, -2.05, -0.8, 0.05, 0, 0.3)

    /* caseta de EPP */
    c.box(0.1, 2.6, 5.2, 'wall2', { pos: [-7.4, 1.3, 1.1] })
    c.box(1.7, 0.1, 5.4, 'roof', { pos: [-6.6, 2.65, 1.1] })
    for (const z of [-1.5, 3.7]) c.box(1.6, 2.6, 0.1, 'wall2', { pos: [-6.6, 1.3, z] })
    c.box(0.7, 0.05, 4.8, 'wood', { pos: [-6.4, 0.95, 1.1] })
    for (const z of [-1.1, 3.3]) c.box(0.6, 0.95, 0.05, 'darksteel', { pos: [-6.4, 0.47, z] })
    HARNESSES.forEach((h, i) => harnessGeo(c, -7.25, 1.55, scenario.objects[h].pos[2]))
    addRect(-6.6, 1.1, 0.85, 2.7, 0, 2.6)
    /* tablero de permisos y tablero de alumbrado */
    board(c, [-4.9, 1.45, 4.0], 0, 1.0, 0.75)
    for (const x of [-5.35, -4.45]) c.box(0.06, 1.8, 0.06, 'darksteel', { pos: [x, 0.9, 3.97] })
    addSeg(-5.4, 3.97, -4.4, 3.97, 0.08, 0, 2)
    c.box(0.06, 1.7, 0.06, 'galv', { pos: [5.4, 0.85, 2.9] }); c.box(0.4, 0.55, 0.15, 'panel', { pos: [5.4, 1.4, 2.95] })
    addCircle(5.4, 2.9, 0.2, 0, 2)
    /* compañero bajo el borde */
    person(c, [1.5, 0, -5.6], -W90)
    addCircle(1.5, -5.6, 0.35, 0, 2)
    return c.build('alturas')
  }, [scenario])

  const signs = useMemo(() => signAtlas([
    { text: 'Borde sin baranda\nEn reparación', kind: 'peligro', w: 0.6, h: 0.4, pos: [1.5, H + 1.45, P.z0 + 0.05], rotY: 0 },
    { text: 'Uso obligatorio de arnés en altura', kind: 'obligacion', w: 0.6, h: 0.4, pos: [-2.5, 2.2, -0.68] },
    { text: 'Caseta de EPP\nTrabajo en alturas', kind: 'info', w: 0.8, h: 0.3, pos: [-5.82, 2.35, 1.1], rotY: W90 },
    { text: 'PERMISO DE TRABAJO EN ALTURAS\nL-07 · 6 m', kind: 'rotulo', w: 0.8, h: 0.55, pos: [-4.9, 1.45, 4.025] },
    { text: 'ALUM-07', kind: 'rotulo', w: 0.2, h: 0.08, pos: [5.4, 1.62, 3.03] },
    { text: 'Punto de anclaje 22,2 kN', kind: 'advertencia', title: '', w: 0.28, h: 0.1, pos: [-0.5, H + 1.78, -2.52] },
    { text: 'Acordonamiento', kind: 'advertencia', title: '', w: 0.5, h: 0.16, pos: [4.0, 1.1, 0.42] },
  ], 320), [])
  useDisposable(group); useDisposable(signs)

  return (
    <>
      <VRWorld />
      <primitive object={group} />
      <primitive object={signs} />
      {/* luminaria */}
      <StateSwitch id="luminaria" render={(st) => st === 'desmontada' ? null : (
        <mesh position={[1.5, H + 1.7, -4.6]} material={st === 'nueva' ? specialMaterial('lamp') : specialMaterial('lampoff')} raycast={() => null}>
          <boxGeometry args={[0.6, 0.1, 0.25]} />
        </mesh>
      )} />
      <Pick id="luminaria" box={[0.7, 0.3, 0.4]} position={[1.5, H + 1.7, -4.6]} />
      {/* anclajes */}
      <Pick id="anclaje-cert" box={[0.3, 0.3, 0.3]} position={[-0.5, H + 1.9, -2.6]} />
      <Pick id="anclaje-tubo" box={[1.2, 0.15, 0.15]} position={[1.0, H + 1.4, -1.2]} />
      <Pick id="anclaje-baranda" box={[0.15, 0.2, 1.2]} position={[P.x0, H + 1.07, -2.5]} />
      <Pick id="anclaje-bandeja" box={[1.2, 0.15, 0.45]} position={[2.4, H + 1.9, -1.6]} />
      <Lanyard />
      {/* caseta de EPP */}
      {HARNESSES.map((h) => <Pick key={h} id={h} box={[0.2, 0.7, 0.35]} position={[-7.2, 1.5, scenario.objects[h].pos[2]]} />)}
      {['casco-ok', 'casco-sin', 'eslinga-abs', 'eslinga-doble', 'eslinga-sin', 'bolso', 'amarres', 'candado-alturas'].map((id) => (
        <Item key={id} id={id} position={[-6.4, 0.98, scenario.objects[id].pos[2]]} rotation={[0, W90, 0]} box={[0.3, 0.25, 0.35]} />
      ))}
      {/* documentos y tablero de alumbrado */}
      <Pick id="permiso-alturas" box={[1.0, 0.75, 0.08]} position={[-4.9, 1.45, 4.05]} />
      <Breaker id="int-alumbrado" position={[5.4, 1.45, 3.06]} />
      <LockPoint id="punto-alumbrado" position={[5.4, 1.25, 3.06]} box={[0.16, 0.1, 0.1]} />
      <Pick id="companero" box={[0.6, 1.8, 0.6]} position={[1.5, 0.9, -5.6]} />
      {/* acordonamiento */}
      <StateSwitch id="barrera" render={(st) => <Cones placed={st === 'colocada'} />} />
      <Pick id="barrera" box={[0.6, 0.9, 0.6]} position={[4.0, 0.45, 0.4]} />
      <FallingTool />
    </>
  )
}

/* conos y cinta: alrededor del área bajo la plataforma, o apilados junto al letrero */
function Cones({ placed }) {
  const g = useMemo(() => {
    const c = new Collector()
    if (placed) {
      const pts = [[-3.7, -0.4], [3.7, -0.4], [3.7, -6.4], [-3.7, -6.4]]
      pts.forEach(([x, z]) => cone(c, x, z))
      for (let i = 0; i < 4; i++) { const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % 4]; c.pipe([ax, 0.45, az], [bx, 0.45, bz], 0.012, 'red') }
    } else for (let i = 0; i < 4; i++) c.cone(0.14, 0.5, 'orange', { pos: [4.0, 0.27 + i * 0.08, 0.4], seg: 10 })
    return c.build('conos')
  }, [placed])
  useDisposable(g)
  return <primitive object={g} />
}

/* eslinga conectada: una cuerda del anclaje hacia el jugador (solo se dibuja si está conectado) */
function Lanyard() {
  const cert = useRun((s) => s.snap?.state['anclaje-cert'])
  if (cert !== 'conectado') return null
  return (
    <mesh position={[-0.5, H + 1.4, -2.6]} material={solidMaterial('orange')} raycast={() => null}>
      <cylinderGeometry args={[0.012, 0.012, 1.0, 6]} />
    </mesh>
  )
}
