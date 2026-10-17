import { useMemo } from 'react'
import { Collector } from '../../geometry/builder.js'
import { resetWalk, addRect, setStart } from '../../walk/walk.js'
import VRWorld from '../../scene/VRWorld.jsx'

/* Escena de prueba de la Etapa 0: piso de concreto 30 × 30 m, un cubo y cielo. */
export default function TestWorld() {
  const group = useMemo(() => {
    resetWalk([-15, -15, 15, 15])
    setStart({ x: 0, z: 6, yaw: 0 })
    const c = new Collector()
    c.box(30, 0.1, 30, 'concrete', { pos: [0, -0.05, 0] })
    c.box(1, 1, 1, 'orange', { pos: [0, 0.5, 0] })
    addRect(0, 0, 0.5, 0.5, 0, 1)
    return c.build('test')
  }, [])
  return (
    <>
      <VRWorld />
      <primitive object={group} />
    </>
  )
}
