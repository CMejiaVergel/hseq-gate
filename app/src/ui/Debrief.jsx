import { useEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import Panel3D, { C } from './Panel3D.jsx'
import { useApp, MODES } from '../store.js'
import { startScenario, exitToLobby } from '../run/bridge.js'
import { placeInFront, useKeepInView } from './place.js'
import { SCORING } from '../scenarios/limits.js'

/*
 * Debrief al terminar (docs/06): puntaje, aprobado o no, tiempo, errores con su explicación,
 * puntos clave del escenario y botones Repetir · Volver al lobby.
 */
const SEV = { critico: ['✖', '#ff6b5a'], mayor: ['⚠', '#f39c12'], menor: ['•', '#e0c060'] }
const mmss = (s) => `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`

export default function Debrief() {
  const r = useApp((s) => s.lastResult)
  const ref = useRef()
  const gl = useThree((s) => s.gl)

  const widgets = useMemo(() => {
    if (!r) return [{ type: 'text', text: 'Sin resultado' }]
    const verdict = r.mode !== 'evaluacion' ? ['ENTRENAMIENTO REGISTRADO', '#24476e'] : r.passed ? ['APROBADO', '#1f8f4e'] : ['NO APROBADO', '#8e1b12']
    const W = [
      { type: 'title', text: r.scenarioTitle, sub: `${MODES[r.mode]} · ${r.completed ? 'procedimiento completo' : 'procedimiento incompleto'}` },
      { type: 'banner', text: `${verdict[0]} · ${r.score} / 100`, color: verdict[1] },
      /* los botones van arriba: el panel tiene alto máximo y lo de abajo puede no caber */
      { type: 'buttons', cols: 2, h: 60, items: [{ id: 'repetir', label: 'Repetir', active: true, color: C.accent }, { id: 'lobby', label: 'Volver al lobby' }] },
      { type: 'kv', rows: [
        { k: 'Tiempo', v: mmss(r.durationSec) },
        { k: 'Errores críticos', v: r.criticos, color: r.criticos ? C.bad : C.ok },
        { k: 'Errores mayores / menores', v: `${r.mayores} / ${r.menores}` },
        ...(r.mode === 'practica' ? [{ k: 'Pistas usadas', v: r.hints }] : []),
        ...(r.retries ? [{ k: 'Reintentos', v: r.retries }] : []),
      ] },
    ]
    if (r.mode === 'evaluacion') W.push({ type: 'text', text: `Para aprobar: ${SCORING.pass} puntos o más y ningún error crítico.`, small: true, color: C.mute })
    /* errores agrupados: los «fuera de orden» se cuentan en una sola línea; explicación solo en los críticos */
    const all = r.errorsFull || []
    const order = all.filter((e) => e.id === 'fuera-de-orden')
    const rest = all.filter((e) => e.id !== 'fuera-de-orden')
    const sevRank = { critico: 0, mayor: 1, menor: 2 }
    const items = rest.slice().sort((a, b) => sevRank[a.severity] - sevRank[b.severity]).slice(0, 4)
      .map((e) => ({ mark: SEV[e.severity]?.[0] || '•', color: SEV[e.severity]?.[1], text: e.message + (e.severity === 'critico' && e.explain ? ' — ' + e.explain : '') }))
    if (order.length) items.push({ mark: SEV.menor[0], color: SEV.menor[1], text: `${order.length} paso${order.length > 1 ? 's' : ''} fuera de orden: el procedimiento tiene una secuencia.` })
    if (items.length) {
      W.push({ type: 'divider' })
      W.push({ type: 'text', text: 'Errores', big: true })
      W.push({ type: 'list', items })
      if (rest.length > 4) W.push({ type: 'text', text: `… y ${rest.length - 4} más (detalle en el panel del instructor).`, small: true })
    }
    if (r.debrief?.length) {
      W.push({ type: 'divider' })
      W.push({ type: 'text', text: 'Puntos clave', big: true })
      W.push({ type: 'list', items: r.debrief.map((t, i) => ({ mark: String(i + 1), color: C.accent, text: t })) })
    }
    W.push({ type: 'text', text: 'Código del intento: ' + r.attemptId, small: true, color: C.mute })
    return W
  }, [r])

  useEffect(() => { if (ref.current) { const vr = gl.xr.isPresenting; placeInFront(ref.current, vr ? 1.0 : 1.05, vr ? -0.1 : -0.05) } }, [r, gl])

  useKeepInView(ref, gl.xr.isPresenting ? 1.0 : 1.05, -0.08)

  const onAction = (id) => {
    if (id === 'repetir') startScenario(r.scenarioId, { mode: r.mode })
    else if (id === 'lobby') exitToLobby()
  }
  return <Panel3D ref={ref} widgets={widgets} width={0.62} onAction={onAction} />
}
