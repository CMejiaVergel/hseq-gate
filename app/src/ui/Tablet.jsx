import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Panel3D, { C } from './Panel3D.jsx'
import { useApp, MODES } from '../store.js'
import { useRun, getRun, act, hint, restart, exitToLobby, repeatInstruction } from '../run/bridge.js'
import { HANDS } from '../scene/VRRig.jsx'
import { HEAD } from '../scene/head.js'
import { placeInFront } from './place.js'
import * as S from '../world/effects/sound.js'

/*
 * Tableta (docs/06): en VR flota sobre la mano izquierda (botón Y) y mira a la cara; en el PC se
 * acopla abajo a la izquierda de la vista (Tab).  Pestañas: Paso · Pista (práctica) · Lista
 * (matrices, ATS, preguntas, radio) · Inventario · Salir.
 */
const _t = new THREE.Vector3(), _f = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _m = new THREE.Matrix4(), _q = new THREE.Quaternion()
const vrNow = () => useApp.getState().inXR
const mmss = (s) => { const m = Math.floor(s / 60), x = Math.floor(s % 60); return `${m}:${x < 10 ? '0' : ''}${x}` }

export default function Tablet() {
  const ref = useRef()
  const show = useApp((s) => s.tablet)
  const tab = useApp((s) => s.tabletTab)
  const vignette = useApp((s) => s.vignette)
  const turnMode = useApp((s) => s.turnMode)
  const snap = useRun((s) => s.snap)
  const [hintText, setHintText] = useState(null)
  const sec = snap ? Math.floor(snap.time / 5) : 0           // el reloj de la tableta se redibuja cada 5 s, no por cuadro

  const widgets = useMemo(() => {
    const run = getRun()
    if (!snap || !run) return [{ type: 'text', text: 'Sin escenario' }]
    const scen = run.scenario, mode = snap.mode
    const tabs = [['paso', 'Paso'], ...(mode === 'practica' ? [['pista', 'Pista']] : []), ['lista', 'Lista'], ['inventario', 'Inventario'], ['salir', 'Salir']]
    const W = [{ type: 'buttons', cols: tabs.length, h: 46, font: 18, items: tabs.map(([id, label]) => ({ id: 'tab:' + id, label, active: tab === id })) }]
    const nPh = scen.phases.length
    const phTxt = snap.phase ? `Fase ${snap.phaseIndex + 1} de ${nPh}` : 'Terminado'
    if (tab === 'paso') {
      W.push({ type: 'title', text: scen.title, sub: `${MODES[mode]} · ${phTxt} · ${mmss(sec * 5)}` })
      if (mode === 'aprendizaje' && snap.step) {
        W.push({ type: 'text', text: snap.phase.title, small: true, color: C.mute })
        W.push({ type: 'banner', text: snap.step.title, color: '#1f5fbf' })
        if (snap.step.hint) W.push({ type: 'text', text: snap.step.hint, small: true })
        W.push({ type: 'buttons', cols: 1, h: 44, font: 18, items: [{ id: 'repetir', label: 'Repetir instrucción (X / R)' }] })
      } else if (mode === 'practica' && snap.phase) {
        W.push({ type: 'text', text: 'Fase actual: ' + snap.phase.title })
        W.push({ type: 'text', text: 'Las instrucciones están ocultas. Usa la pestaña Pista si te atascas (cuesta puntos).', small: true })
      } else if (snap.phase) W.push({ type: 'text', text: 'Modo evaluación: ejecuta el procedimiento completo sin ayudas. Los errores se informan al final.', small: true })
      const totalSteps = scen.phases.reduce((n, p) => n + p.steps.length, 0)
      W.push({ type: 'progress', value: snap.done.length / totalSteps, label: `Pasos: ${snap.done.length} de ${totalSteps}`, color: C.ok })
      if (mode !== 'evaluacion') W.push({ type: 'kv', rows: [{ k: 'Puntaje parcial', v: snap.score.score }] })
    } else if (tab === 'pista') {
      W.push({ type: 'title', text: 'Pista', sub: 'Cada pista nueva cuesta 3 puntos (una vez por paso).' })
      W.push({ type: 'buttons', cols: 1, items: [{ id: 'pista', label: 'Ver pista del paso actual', color: C.warn, active: true }] })
      if (hintText) W.push({ type: 'banner', text: hintText, color: '#7a5a12' })
    } else if (tab === 'lista') {
      const items = Object.entries(run.objects).filter(([, d]) => d.tablet)
      W.push({ type: 'title', text: 'Lista y herramientas', sub: 'Matrices, análisis de trabajo seguro, preguntas y radio.' })
      if (items.length) W.push({ type: 'buttons', cols: 1, h: 60, font: 20, items: items.map(([id, d]) => ({ id: 'obj:' + id, label: d.label, sub: d.tabletSub })) })
      else W.push({ type: 'text', text: 'Este escenario no tiene listas en la tableta.', small: true })
    } else if (tab === 'inventario') {
      W.push({ type: 'title', text: 'Inventario', sub: snap.hand ? 'En la mano: ' + run.objects[snap.hand].label : 'Mano libre' })
      if (snap.inventory.length) W.push({ type: 'buttons', cols: 1, h: 52, font: 19, items: snap.inventory.map((id) => ({ id: 'inv:' + id, label: run.objects[id].label, active: snap.hand === id })) })
      else W.push({ type: 'text', text: 'No llevas nada. Toma objetos con el grip (E en el PC).', small: true })
      if (snap.hand) W.push({ type: 'buttons', cols: 2, h: 48, font: 18, items: [{ id: 'guardar', label: 'Mano libre' }, { id: 'soltar', label: 'Soltar' }] })
    } else if (tab === 'salir') {
      W.push({ type: 'title', text: 'Opciones', sub: scen.title })
      W.push({ type: 'toggle', id: 'vignette', label: 'Viñeta al caminar (comodidad)', value: vignette })
      W.push({ type: 'toggle', id: 'turn', label: 'Giro a saltos de 30°', value: turnMode === 'snap' })
      W.push({ type: 'buttons', cols: 1, items: [{ id: 'reiniciar', label: 'Reiniciar el escenario' }, { id: 'salir', label: 'Salir al lobby', color: C.bad, active: true }] })
      W.push({ type: 'text', text: 'Al salir, el intento queda registrado como no terminado.', small: true, color: C.mute })
    }
    return W
  }, [snap, tab, hintText, sec, vignette, turnMode])

  useFrame((state, dt) => {
    const g = ref.current
    if (!g) return
    g.visible = show
    if (!show) return
    const vr = state.gl.xr.isPresenting
    if (vr && HANDS.left) {
      HANDS.left.updateWorldMatrix(true, false)
      _t.setFromMatrixPosition(HANDS.left.matrixWorld)
      _f.copy(HEAD.pos).sub(_t).normalize()
      _t.addScaledVector(_f, 0.06); _t.y += 0.2
      g.position.lerp(_t, Math.min(1, dt * 16))
      _q.setFromRotationMatrix(_m.lookAt(HEAD.pos, g.position, _up))
      g.quaternion.slerp(_q, Math.min(1, dt * 12))
    } else placeInFront(g, vr ? 0.6 : 0.85, vr ? -0.3 : -0.2, vr ? -0.25 : -0.47, Math.min(1, dt * 6))
  })

  const onAction = (id) => {
    S.click()
    const app = useApp.getState(), run = getRun()
    if (id.startsWith('tab:')) { app.setTabletTab(id.slice(4)); return }
    if (id.startsWith('obj:')) { app.openModal(id.slice(4)); return }
    if (id.startsWith('inv:')) { act('jugador', 'mano', id.slice(4)); return }
    switch (id) {
      case 'repetir': repeatInstruction(); break
      case 'pista': setHintText(hint() || 'No hay pista disponible.'); break
      case 'guardar': act('jugador', 'mano', null); break
      case 'soltar': if (run?.hand) act(run.hand, 'soltar'); break
      case 'vignette': useApp.setState((s) => ({ vignette: !s.vignette })); break
      case 'turn': useApp.setState((s) => ({ turnMode: s.turnMode === 'snap' ? 'smooth' : 'snap' })); break
      case 'reiniciar': restart(); break
      case 'salir': exitToLobby(); break
      default: break
    }
  }
  return <Panel3D ref={ref} widgets={widgets} width={vrNow() ? 0.36 : 0.3} onAction={onAction} visible={false} />
}
