import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { pickBox } from '../scene/interact.js'
import { useRunState, useSnap, getRun } from '../run/bridge.js'
import { Collector } from '../geometry/builder.js'
import { solidMaterial } from '../geometry/materials.js'

/*
 * Kit de objetos interactivos (docs/06).  Cada componente:
 *   1. pone su malla de selección invisible en PICK_LAYER (userData.obj = id del objeto);
 *   2. lee su estado del runner (useRunState) para pintarse;
 *   3. la interacción la traduce interact/handlers.js en run.act(obj, verbo, carga).
 * Lo estático (cuerpos, tableros) va fusionado en el colector del entorno (interact/parts.js).
 */

/* ---------- resaltado del paso actual (modo aprendizaje) ---------- */
export const HIGHLIGHT_MAT = new THREE.LineBasicMaterial({ color: '#3ddc84', transparent: true, opacity: 0.9, depthTest: false })
const edgesCache = new Map()
const edges = (w, h, d) => {
  const k = `${w}|${h}|${d}`
  if (!edgesCache.has(k)) edgesCache.set(k, new THREE.EdgesGeometry(new THREE.BoxGeometry(w * 1.08 + 0.03, h * 1.08 + 0.03, d * 1.08 + 0.03)))
  return edgesCache.get(k)
}
export function useTargeted(id) { return useSnap((s) => s.mode === 'aprendizaje' && s.status === 'running' && !!s.step?.targets.includes(id)) }

/** malla de selección + resaltado; `box` = [w, h, d] */
export function Pick({ id, box = [0.3, 0.3, 0.3], position, rotation, verb, offset = [0, 0, 0], highlight = true }) {
  const mesh = useMemo(() => pickBox(box[0], box[1], box[2], id, verb ? { verb } : {}), [id, verb, box[0], box[1], box[2]])  // eslint-disable-line react-hooks/exhaustive-deps
  const on = useTargeted(id)
  return (
    <group position={position} rotation={rotation}>
      <primitive object={mesh} position={offset} />
      {highlight && on && <lineSegments geometry={edges(...box)} material={HIGHLIGHT_MAT} position={offset} renderOrder={30} raycast={() => null} />}
    </group>
  )
}

/** suaviza un valor hacia su objetivo en cada cuadro y llama apply(v) */
function useTween(target, apply, speed = 4) {
  const v = useRef(target)
  useFrame((_, dt) => {
    if (Math.abs(v.current - target) < 1e-3) { if (v.current !== target) { v.current = target; apply(target) } return }
    v.current += (target - v.current) * Math.min(1, dt * speed)
    apply(v.current)
  })
  useEffect(() => { apply(v.current) })  // eslint-disable-line react-hooks/exhaustive-deps
}

/* ---------- válvula: el volante gira al abrir/cerrar ---------- */
const wheelGeo = (() => {
  const c = new Collector()
  c.torus(0.14, 0.014, 'red', { rot: [Math.PI / 2, 0, 0], seg: 20, tseg: 6 })
  c.box(0.27, 0.014, 0.014, 'red'); c.box(0.014, 0.014, 0.27, 'red')
  c.cyl(0.025, 0.04, 'darksteel', { seg: 8 })
  return c.build('volante')
})()
export function Valve({ id, position, rotation, scale = 1 }) {
  const st = useRunState(id)
  const ref = useRef()
  const wheel = useMemo(() => wheelGeo.clone(), [])
  useTween(st === 'closed' ? -Math.PI * 3 : 0, (a) => { if (ref.current) ref.current.rotation.y = a }, 2.5)
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <group ref={ref}><primitive object={wheel} /></group>
      <Pick id={id} box={[0.34, 0.12, 0.34]} />
    </group>
  )
}

/* ---------- interruptor de CCM: palanca arriba (on) / abajo (off) ---------- */
export function Breaker({ id, position, rotation }) {
  const st = useRunState(id)
  const ref = useRef()
  useTween(st === 'off' ? -0.7 : 0.7, (a) => { if (ref.current) ref.current.rotation.x = a }, 6)
  return (
    <group position={position} rotation={rotation}>
      <group ref={ref}>
        <mesh position={[0, 0.06, 0.02]} material={solidMaterial('black')} raycast={() => null}><boxGeometry args={[0.04, 0.12, 0.04]} /></mesh>
        <mesh position={[0, 0.12, 0.04]} material={solidMaterial(st === 'off' ? 'green' : 'red')} raycast={() => null}><boxGeometry args={[0.07, 0.04, 0.06]} /></mesh>
      </group>
      <Pick id={id} box={[0.16, 0.26, 0.12]} />
    </group>
  )
}

/* ---------- botonera: dos zonas con verbo propio + piloto de marcha ---------- */
export function PushButtons({ id, start, stop, lampObj, lampOn = 'running' }) {
  const lamp = useRunState(lampObj)
  return (
    <group>
      <Pick id={id} box={[0.1, 0.09, 0.08]} position={start} verb="start" />
      <Pick id={id} box={[0.1, 0.09, 0.08]} position={stop} verb="stop" highlight={false} />
      {lampObj && (
        <mesh position={[start[0], start[1] + 0.07, start[2]]} raycast={() => null}>
          <sphereGeometry args={[0.018, 10, 8]} />
          <meshBasicMaterial color={lamp === lampOn ? '#3dff6a' : '#20402a'} />
        </mesh>
      )}
    </group>
  )
}

/* ---------- objetos tomables: forma según def.shape ---------- */
const COLOR_HEX = { red: '#c62828', yellow: '#f2c200', blue: '#1e5aa8', green: '#2e7d32', orange: '#ef6c00', black: '#222', white: '#eee', gray: '#888' }
export function itemShape(shape, color = 'red') {
  const c = new Collector()
  const col = color in COLOR_HEX ? color : 'red'
  const paint = { red: 'red', yellow: 'yellow', blue: 'blue', green: 'green', orange: 'orange', black: 'black', white: 'white', gray: 'galv' }[col] || 'red'
  switch (shape) {
    case 'candado':
      c.box(0.045, 0.05, 0.022, paint, { pos: [0, 0.025, 0] })
      c.torus(0.016, 0.004, 'silver', { pos: [0, 0.055, 0], arc: Math.PI, seg: 10, tseg: 4 })
      break
    case 'tarjeta':
      c.box(0.075, 0.14, 0.004, 'red', { pos: [0, 0.07, 0] })
      c.box(0.07, 0.06, 0.005, 'white', { pos: [0, 0.05, 0] })
      break
    case 'cubre':
      c.cyl(0.17, 0.05, 'yellow', { seg: 16 }); c.box(0.06, 0.06, 0.03, 'red', { pos: [0.18, 0, 0] })
      break
    case 'probador':
      c.box(0.07, 0.16, 0.035, 'yellow', { pos: [0, 0.08, 0] }); c.box(0.05, 0.04, 0.037, 'black', { pos: [0, 0.12, 0] })
      c.pipe([0.02, 0, 0], [0.04, -0.12, 0.02], 0.004, 'red'); c.pipe([-0.02, 0, 0], [-0.04, -0.12, 0.02], 0.004, 'black')
      break
    case 'detector':
      c.box(0.08, 0.14, 0.045, 'yellow', { pos: [0, 0.07, 0] }); c.box(0.06, 0.05, 0.047, 'black', { pos: [0, 0.1, 0] })
      break
    case 'radio':
      c.box(0.06, 0.13, 0.035, 'black', { pos: [0, 0.065, 0] }); c.cyl(0.006, 0.08, 'black', { pos: [0.02, 0.17, 0], seg: 6 })
      break
    case 'casco':
      c.sphere(0.12, paint, { pos: [0, 0.02, 0], rings: 6 }); c.cyl(0.15, 0.012, paint, { seg: 14 })
      break
    case 'eslinga':
      c.torus(0.12, 0.012, paint, { rot: [Math.PI / 2, 0, 0], seg: 18, tseg: 5 }); c.box(0.06, 0.1, 0.04, 'black', { pos: [0.12, -0.05, 0] })
      break
    case 'bolso':
      c.box(0.3, 0.22, 0.14, 'orange', { pos: [0, 0.11, 0] })
      break
    case 'herramienta':
      c.box(0.03, 0.2, 0.02, 'red', { pos: [0, 0.1, 0] }); c.box(0.06, 0.04, 0.02, 'galv', { pos: [0, 0.22, 0] })
      break
    case 'llave':
      c.box(0.04, 0.35, 0.02, 'galv', { pos: [0, 0.17, 0] }); c.torus(0.03, 0.008, 'galv', { pos: [0, 0.37, 0], seg: 10, tseg: 4 })
      break
    case 'brida':
      c.cyl(0.14, 0.02, 'galv', { rot: [Math.PI / 2, 0, 0], seg: 16 })
      break
    default:
      c.box(0.1, 0.1, 0.1, paint, { pos: [0, 0.05, 0] })
  }
  return c.build('item:' + shape)
}

export function Item({ id, position, rotation, shape, box }) {
  const st = useRunState(id)
  const def = getRun()?.objects[id]
  const s = shape || def?.shape || 'caja'
  const mesh = useMemo(() => itemShape(s, def?.color), [s, def?.color])
  if (st !== 'sitio') return null
  return (
    <group position={position} rotation={rotation}>
      <primitive object={mesh} />
      <Pick id={id} box={box || [0.16, 0.18, 0.12]} offset={[0, 0.06, 0]} />
    </group>
  )
}

/* ---------- punto de bloqueo: muestra lo que tiene puesto ---------- */
export function LockPoint({ id, position, rotation, box = [0.14, 0.14, 0.1], device }) {
  const st = useRunState(id)
  const run = getRun()
  const content = useMemo(() => {
    if (!Array.isArray(st) || !st.length || !run) return null
    const g = new THREE.Group()
    let k = 0
    for (const it of st) {
      const d = run.objects[it]
      const shape = d?.shape || 'candado'
      const m = itemShape(shape, d?.color)
      if (shape === 'cubre') { m.position.set(device?.[0] ?? 0, device?.[1] ?? 0, device?.[2] ?? 0); m.rotation.x = Math.PI / 2 }
      else { m.position.set(-0.04 + (k % 3) * 0.045, -0.02 - (shape === 'tarjeta' ? 0.07 : 0), 0.02 + Math.floor(k / 3) * 0.01); k++ }
      m.updateMatrix()
      g.add(m)
    }
    return g
  }, [st, run, device])
  return (
    <group position={position} rotation={rotation}>
      {content && <primitive object={content} />}
      <Pick id={id} box={box} />
    </group>
  )
}

/* ---------- manómetro: aguja según la lectura ---------- */
export function Gauge({ id, position, rotation, max = 100 }) {
  const def = getRun()?.objects[id]
  const v = useSnap((s) => s.readings?.[def?.reading]) ?? 0
  const ref = useRef()
  useTween(Math.PI * 0.75 - (Math.min(max, Math.max(0, v)) / max) * Math.PI * 1.5, (a) => { if (ref.current) ref.current.rotation.z = a }, 3)
  return (
    <group position={position} rotation={rotation}>
      <group ref={ref} position={[0, 0, 0.02]}>
        <mesh position={[0, 0.022, 0]} raycast={() => null}><boxGeometry args={[0.005, 0.045, 0.003]} /><meshBasicMaterial color="#c62828" /></mesh>
      </group>
      <Pick id={id} box={[0.14, 0.14, 0.08]} />
    </group>
  )
}

/* ---------- objeto cuyo aspecto depende del estado: render(state) ---------- */
export function StateSwitch({ id, render }) {
  const st = useRunState(id)
  return render(st)
}

/* ---------- ventilador: aspas que giran si está encendido ---------- */
export function FanBlades({ id, position, rotation, r = 0.22 }) {
  const st = useRunState(id)
  const ref = useRef()
  useFrame((_, dt) => { if (ref.current && st === 'on') ref.current.rotation.z += dt * 18 })
  return (
    <group position={position} rotation={rotation}>
      <group ref={ref}>
        <mesh raycast={() => null} material={solidMaterial('darksteel')}><boxGeometry args={[r * 2, 0.06, 0.01]} /></mesh>
        <mesh raycast={() => null} material={solidMaterial('darksteel')} rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[r * 2, 0.06, 0.01]} /></mesh>
      </group>
    </group>
  )
}

/* ---------- pantalla con lienzo (detector, tableros): se redibuja solo si cambia `text` ---------- */
export function Screen({ text, w = 0.08, h = 0.05, position, rotation, color = '#9fffb0', bg = '#06140a' }) {
  const { tex, ctx, canvas } = useMemo(() => {
    const canvas = Object.assign(document.createElement('canvas'), { width: 256, height: Math.round(256 * h / w) })
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace
    return { tex, ctx: canvas.getContext('2d'), canvas }
  }, [w, h])
  useEffect(() => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = color; ctx.font = `700 ${Math.round(canvas.height / 4.2)}px monospace`; ctx.textBaseline = 'top'
    String(text).split('\n').slice(0, 4).forEach((l, i) => ctx.fillText(l, 8, 6 + i * canvas.height / 4))
    tex.needsUpdate = true
  }, [text, ctx, canvas, tex, color, bg])
  useEffect(() => () => tex.dispose(), [tex])
  return (
    <mesh position={position} rotation={rotation} raycast={() => null}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  )
}
