import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useRun } from '../../run/bridge.js'

/*
 * Chorro de agua / vapor (consecuencias «quemadura» y «fuga-presion»): partículas simples
 * (puntos) que salen de `position` en la dirección `dir`, con gravedad.  Solo existe mientras
 * la consecuencia está activa: ningún costo el resto del tiempo.
 */
const N = 220
export default function Spray({ when = ['quemadura', 'fuga-presion'], position, dir = [0, 0, 1], speed = 3.5, color = '#d8f0ff' }) {
  const active = useRun((s) => !!s.consequence && when.includes(s.consequence.name))
  if (!active) return null
  return <Particles position={position} dir={dir} speed={speed} color={color} />
}

function Particles({ position, dir, speed, color }) {
  const ref = useRef()
  const { geo, vel, life } = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3))
    return { geo, vel: new Float32Array(N * 3), life: new Float32Array(N).map(() => -Math.random()) }
  }, [])
  const d = useMemo(() => new THREE.Vector3(...dir).normalize(), [dir])
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const p = geo.attributes.position.array
    for (let i = 0; i < N; i++) {
      life[i] += dt
      if (life[i] > 0.9 || life[i] < 0) {
        if (life[i] > 0.9) life[i] = 0
        if (life[i] < 0) continue
        p[i * 3] = 0; p[i * 3 + 1] = 0; p[i * 3 + 2] = 0
        const s = speed * (0.7 + Math.random() * 0.6)
        vel[i * 3] = d.x * s + (Math.random() - 0.5) * 0.8
        vel[i * 3 + 1] = d.y * s + (Math.random() - 0.5) * 0.8
        vel[i * 3 + 2] = d.z * s + (Math.random() - 0.5) * 0.8
      }
      vel[i * 3 + 1] -= 9.8 * dt
      p[i * 3] += vel[i * 3] * dt; p[i * 3 + 1] += vel[i * 3 + 1] * dt; p[i * 3 + 2] += vel[i * 3 + 2] * dt
    }
    geo.attributes.position.needsUpdate = true
  })
  return (
    <points ref={ref} geometry={geo} position={position} frustumCulled={false} raycast={() => null}>
      <pointsMaterial color={color} size={0.035} transparent opacity={0.85} depthWrite={false} />
    </points>
  )
}
