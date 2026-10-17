import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Collector } from '../../geometry/builder.js'
import { resetWalk, setStart } from '../../walk/walk.js'
import { room, ceilingLight } from '../common/room.js'
import { signAtlas } from '../common/signs.js'
import VRWorld from '../../scene/VRWorld.jsx'
import LobbyPanels from '../../ui/LobbyPanels.jsx'
import { useApp } from '../../store.js'
import { useDisposable } from '../../geometry/dispose.js'

/*
 * Lobby — «Sala de inducción» (docs/06): sala sencilla con el logo de Voltac, señalética de
 * seguridad y los tres paneles grandes (identificación, escenario, modo).
 */
export const LOBBY_SPAWN = { x: 0, z: 0.4, yaw: 0 }

export default function LobbyWorld() {
  const { group, logo } = useMemo(() => {
    resetWalk([-5, -4.5, 5, 4.5])
    setStart(LOBBY_SPAWN)
    const c = new Collector()
    room(c, -5, -4.5, 5, 4.5, { h: 3.2, wallMat: 'cream', floorMat: 'slab', ceilMat: 'white' })
    c.box(10, 0.12, 0.04, 'navy', { pos: [0, 1.0, -4.38] })                 // franja corporativa
    c.box(0.04, 0.12, 9, 'navy', { pos: [-4.88, 1.0, 0] })
    c.box(0.04, 0.12, 9, 'navy', { pos: [4.88, 1.0, 0] })
    for (const x of [-2.5, 2.5]) for (const z of [-2.5, 0.5, 3.2]) ceilingLight(c, x, z, 3.15)
    /* mesas con EPP de exhibición */
    for (const x of [-3.6, 3.6]) {
      c.box(1.4, 0.05, 0.7, 'wood', { pos: [x, 0.78, 1.8] })
      for (const dx of [-0.6, 0.6]) for (const dz of [-0.28, 0.28]) c.box(0.05, 0.78, 0.05, 'darksteel', { pos: [x + dx, 0.39, 1.8 + dz] })
    }
    c.sphere(0.13, 'helmet', { pos: [-3.9, 0.9, 1.8], rings: 8 })
    c.sphere(0.13, 'yellow', { pos: [-3.4, 0.9, 1.8], rings: 8 })
    c.box(0.3, 0.12, 0.2, 'orange', { pos: [3.4, 0.86, 1.8] })
    c.box(0.18, 0.28, 0.08, 'red', { pos: [3.9, 0.94, 1.8] })
    const g = c.build('lobby')
    g.add(signAtlas([
      { text: 'Uso obligatorio de EPP', kind: 'obligacion', w: 0.7, h: 0.5, pos: [-4.88, 1.8, -1.5], rotY: Math.PI / 2 },
      { text: 'Antes de intervenir: aísla, bloquea y verifica', kind: 'advertencia', w: 0.7, h: 0.5, pos: [-4.88, 1.8, 1.0], rotY: Math.PI / 2 },
      { text: 'Si no es seguro, no lo hagas', kind: 'peligro', w: 0.7, h: 0.5, pos: [4.88, 1.8, -1.5], rotY: -Math.PI / 2 },
      { text: 'Punto de encuentro', kind: 'info', w: 0.7, h: 0.5, pos: [4.88, 1.8, 1.0], rotY: -Math.PI / 2 },
      { text: 'HSEQ Gate\nSala de inducción', kind: 'oscuro', w: 1.6, h: 0.5, pos: [0, 2.75, -4.38], rotY: 0 },
    ]))
    /* logo de Voltac sobre los paneles */
    const tex = new THREE.TextureLoader().load(import.meta.env.BASE_URL + 'icons/logo-voltac.png')
    tex.colorSpace = THREE.SRGBColorSpace
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9 * 0.42), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }))
    logo.position.set(-3.2, 2.5, -4.37); logo.updateMatrix(); logo.matrixAutoUpdate = false; logo.raycast = () => null
    return { group: g, logo }
  }, [])

  useDisposable(group); useDisposable(logo)
  useEffect(() => { useApp.getState().requestTeleport({ ...LOBBY_SPAWN, y: 0 }) }, [])

  return (
    <>
      <VRWorld sky={false} background="#20283a" />
      <hemisphereLight args={['#ffffff', '#8a8578', 1.1]} />
      <directionalLight position={[2, 6, 3]} intensity={0.9} />
      <primitive object={group} />
      <primitive object={logo} />
      <LobbyPanels z={-1.6} />
    </>
  )
}
