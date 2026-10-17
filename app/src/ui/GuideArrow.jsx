import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSnap, getRun } from '../run/bridge.js'
import { HEAD } from '../scene/head.js'
import { PLAYER } from '../walk/walk.js'
import { Screen } from '../interact/kit.jsx'

/*
 * Flecha guía (modo aprendizaje, docs/06): si el objeto del paso actual está fuera de la vista o
 * lejos, una flecha flotante abajo al centro señala hacia él, con la distancia en metros.
 * La distancia se redondea a 0,5 m: la pantallita solo se redibuja cuando cambia ese valor.
 */
const _to = new THREE.Vector3(), _f = new THREE.Vector3(), _r = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _m = new THREE.Matrix4()

export default function GuideArrow() {
  const target = useSnap((s) => (s.mode === 'aprendizaje' && s.status === 'running' ? s.step?.targets?.[0] : null))
  const ref = useRef(), arrow = useRef()
  const last = useRef(-1)
  const [text, setText] = useState('')
  const pos = useMemo(() => {
    const p = target && getRun()?.objects[target]?.pos
    return p ? new THREE.Vector3(p[0], p.length === 3 ? p[1] : 1.2, p.length === 3 ? p[2] : p[1]) : null
  }, [target])

  useFrame(() => {
    const g = ref.current
    if (!g) return
    if (!pos) { g.visible = false; return }
    _to.copy(pos).sub(HEAD.pos)
    const d = Math.hypot(pos.x - PLAYER.x, pos.z - PLAYER.z)
    const show = HEAD.fwd.angleTo(_to) > 0.6 || d > 4
    g.visible = show
    if (!show) return
    _f.copy(HEAD.fwd); _f.y = 0; _f.normalize()
    g.position.copy(HEAD.pos).addScaledVector(_f, 0.7); g.position.y -= 0.32
    g.quaternion.setFromRotationMatrix(_m.lookAt(HEAD.pos, g.position, _up))
    /* la flecha apunta en coordenadas de mundo: se compensa la rotación del grupo */
    _r.copy(pos).sub(g.position); _r.y *= 0.3; _r.normalize().applyQuaternion(g.quaternion.clone().invert())
    if (arrow.current) arrow.current.quaternion.setFromUnitVectors(_up, _r)
    const rd = Math.round(d * 2) / 2
    if (rd !== last.current) { last.current = rd; setText(rd.toFixed(1).replace('.', ',') + ' m') }
  })

  return (
    <group ref={ref} visible={false}>
      <group ref={arrow}>
        <mesh position={[0, 0.03, 0]} raycast={() => null} renderOrder={60}><coneGeometry args={[0.035, 0.08, 10]} /><meshBasicMaterial color="#3ddc84" depthTest={false} transparent /></mesh>
        <mesh position={[0, -0.03, 0]} raycast={() => null} renderOrder={60}><cylinderGeometry args={[0.012, 0.012, 0.07, 8]} /><meshBasicMaterial color="#3ddc84" depthTest={false} transparent /></mesh>
      </group>
      <Screen text={text} w={0.09} h={0.03} position={[0, -0.09, 0]} color="#ffffff" bg="#0b1220" />
    </group>
  )
}
