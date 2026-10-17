import { useEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import Panel3D, { C } from './Panel3D.jsx'
import { useRun, getRun, retry, toDebrief } from '../run/bridge.js'
import { placeInFront } from './place.js'

/*
 * Panel de consecuencia crítica (docs/06): tras el efecto, qué pasó, por qué y qué debiste hacer;
 * «Reintentar desde el paso» (aprendizaje/práctica) o «Ver resultado» (evaluación).
 */
export default function Consequence() {
  const c = useRun((s) => s.consequence)
  const ref = useRef()
  const gl = useThree((s) => s.gl)
  const visible = c?.stage === 'panel'

  const widgets = useMemo(() => {
    if (!c) return []
    const evalMode = getRun()?.mode === 'evaluacion'
    const W = [
      { type: 'title', text: '⚠ Error crítico', color: '#ff6b5a', sub: evalMode ? 'Modo evaluación: el intento termina (no aprobado).' : 'El procedimiento se detuvo en este paso.' },
      { type: 'banner', text: c.error.message, color: '#8e1b12' },
    ]
    if (c.error.explain) W.push({ type: 'text', text: 'Por qué: ' + c.error.explain })
    if (c.should) W.push({ type: 'text', text: 'Qué debiste hacer: ' + c.should, color: '#bfe3c8' })
    W.push({ type: 'gap', h: 6 })
    W.push({ type: 'buttons', cols: 1, h: 64, items: [evalMode ? { id: 'resultado', label: 'Ver resultado', active: true, color: C.accent } : { id: 'reintentar', label: 'Reintentar desde el paso', active: true, color: C.ok }] })
    return W
  }, [c])

  useEffect(() => {
    if (visible && ref.current) { const vr = gl.xr.isPresenting; placeInFront(ref.current, vr ? 0.8 : 0.85, vr ? -0.1 : -0.05) }
  }, [visible, gl])

  if (!visible) return null
  const onAction = (id) => { if (id === 'reintentar') retry(); else if (id === 'resultado') toDebrief() }
  return <Panel3D ref={ref} widgets={widgets} width={0.55} onAction={onAction} />
}
