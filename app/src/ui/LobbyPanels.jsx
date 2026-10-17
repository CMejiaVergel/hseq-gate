import { useEffect, useMemo, useState } from 'react'
import Panel3D, { C } from './Panel3D.jsx'
import { useApp, MODES } from '../store.js'
import { SCENARIOS } from '../scenarios/index.js'
import { getTrainee, bestScores, normCedula } from '../records/records.js'
import { startScenario } from '../run/bridge.js'
import * as S from '../world/effects/sound.js'

/*
 * Paneles del lobby (docs/06), fijos en la pared de la sala de inducción:
 *   1. Identificación: teclado numérico para la cédula; si está en el listado muestra el nombre,
 *      si no, sigue como invitado (el registro queda con la cédula).
 *   2. Escenarios: tarjetas con título, duración, normas y mejor puntaje del aprendiz.
 *   3. Modo (Aprendizaje · Práctica · Evaluación), avisos previos y Comenzar.
 */
const MODE_TXT = {
  aprendizaje: 'Instrucción de cada paso visible y objetos resaltados. Los errores se explican al momento. No califica.',
  practica: 'Sin instrucciones: pistas a demanda (cuestan puntos). Avisos breves de los errores. No califica.',
  evaluacion: 'Sin ayudas. Los errores se informan al final. Un error crítico termina el intento. Aprueba con 80 o más y sin críticos.',
}

export default function LobbyPanels({ z = -3.2, y = 1.55 }) {
  const trainee = useApp((s) => s.trainee)
  const scenarioId = useApp((s) => s.scenarioId)
  const mode = useApp((s) => s.mode)
  const [typed, setTyped] = useState(trainee?.cedula && trainee.cedula !== 'invitado' ? trainee.cedula : '')
  const [best, setBest] = useState({})
  const [msg, setMsg] = useState(null)

  useEffect(() => { if (trainee) bestScores(trainee.cedula).then(setBest).catch(() => {}) }, [trainee])
  useEffect(() => { if (!scenarioId || !SCENARIOS.some((s) => s.id === scenarioId)) useApp.getState().setScenario(SCENARIOS[0].id) }, [scenarioId])

  /* ---------- identificación ---------- */
  const idWidgets = useMemo(() => {
    const W = [{ type: 'title', text: '1 · Identificación', sub: 'Digita tu número de cédula' }]
    W.push({ type: 'banner', text: typed ? typed.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '— — —', color: '#16233a' })
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'borrar', '0', 'ok']
    W.push({ type: 'buttons', cols: 3, h: 62, font: 26, items: keys.map((k) => ({ id: 'k:' + k, label: k === 'borrar' ? '⌫' : k === 'ok' ? 'OK' : k, active: k === 'ok', color: C.ok, disabled: k === 'ok' && typed.length < 4 })) })
    if (trainee) W.push({ type: 'text', text: trainee.invitado ? `Invitado · cédula ${trainee.cedula}` : `Hola, ${trainee.nombre}${trainee.empresa ? ' · ' + trainee.empresa : ''}`, color: '#9fe0b4' })
    else W.push({ type: 'text', text: 'Si no estás en el listado del instructor, sigues como invitado.', small: true })
    if (msg) W.push({ type: 'text', text: msg, small: true, color: C.warn })
    return W
  }, [typed, trainee, msg])

  const onId = async (id) => {
    S.unlockAudio(); S.click()
    const k = id.slice(2)
    if (k === 'borrar') { setTyped((t) => t.slice(0, -1)); return }
    if (k === 'ok') {
      const ced = normCedula(typed)
      const t = await getTrainee(ced).catch(() => null)
      useApp.getState().setTrainee(t ? { ...t, invitado: false } : { cedula: ced, nombre: '', empresa: '', invitado: true })
      setMsg(null)
      return
    }
    setTyped((t) => (t.length < 12 ? t + k : t))
  }

  /* ---------- escenarios ---------- */
  const scWidgets = useMemo(() => {
    const W = [{ type: 'title', text: '2 · Escenario', sub: 'Elige el procedimiento a entrenar' }]
    W.push({ type: 'buttons', cols: 1, h: 76, font: 21, items: SCENARIOS.map((s) => {
      const b = best[s.id]
      return { id: 's:' + s.id, label: s.title, sub: `${s.minutes} min${b ? ` · mejor: ${b.score}${b.passed ? ' ✔' : ''}` : ''}`, active: s.id === scenarioId }
    }) })
    const s = SCENARIOS.find((x) => x.id === scenarioId)
    if (s) {
      W.push({ type: 'text', text: s.summary, small: true })
      if (s.norms?.length) W.push({ type: 'text', text: 'Referencias: ' + s.norms.join(' · '), small: true, color: C.mute })
    }
    return W
  }, [scenarioId, best])
  const onSc = (id) => { S.click(); useApp.getState().setScenario(id.slice(2)) }

  /* ---------- modo y comienzo ---------- */
  const s = SCENARIOS.find((x) => x.id === scenarioId)
  const modeWidgets = useMemo(() => {
    const W = [{ type: 'title', text: '3 · Modo', sub: 'Cómo quieres hacerlo' }]
    W.push({ type: 'buttons', cols: 3, h: 58, font: 19, items: Object.entries(MODES).map(([id, label]) => ({ id: 'm:' + id, label, active: mode === id })) })
    W.push({ type: 'text', text: MODE_TXT[mode], small: true })
    if (s?.warning) W.push({ type: 'banner', text: '⚠ ' + s.warning, color: '#7a5a12' })
    W.push({ type: 'gap', h: 6 })
    const ready = !!trainee && !!s
    W.push({ type: 'buttons', cols: 1, h: 76, font: 26, items: [{ id: 'go', label: ready ? 'Comenzar ▶' : 'Identifícate para comenzar', active: ready, color: C.ok, disabled: !ready }] })
    W.push({ type: 'text', text: 'Durante el escenario: botón Y (Tab en el PC) abre la tableta; ahí puedes salir cuando quieras.', small: true, color: C.mute })
    return W
  }, [mode, s, trainee])
  const onMode = (id) => {
    S.click()
    if (id.startsWith('m:')) useApp.getState().setMode(id.slice(2))
    else if (id === 'go' && trainee && s) startScenario(s.id, { mode })
  }

  return (
    <group>
      <Panel3D widgets={idWidgets} width={0.85} onAction={onId} position={[-1.05, y, z + 0.25]} rotation={[0, 0.32, 0]} />
      <Panel3D widgets={scWidgets} width={0.85} onAction={onSc} position={[0, y, z]} />
      <Panel3D widgets={modeWidgets} width={0.85} onAction={onMode} position={[1.05, y, z + 0.25]} rotation={[0, -0.32, 0]} />
    </group>
  )
}
