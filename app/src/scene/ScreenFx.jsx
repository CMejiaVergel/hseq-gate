import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { headPose } from './head.js'

/*
 * Esfera de viñeta / fundido a pantalla completa (la fxMat de VRRig en Smart Plant 3D), común a
 * PC y visor.  La usan la comodidad al caminar, los teletransportes y los efectos de consecuencia
 * (flash rojo, desvanecimiento, fundido a negro de la caída).  Solo se dibuja cuando aporta algo.
 *
 *   FX.vig    viñeta de comodidad (0…1)            la escribe el rig al caminar
 *   FX.fade   fundido a negro (0…1)                 decae solo
 *   FX.dark   oscurecimiento sostenido (0…1)        desvanecimiento, caída
 *   FX.flash  destello de color (0…1)               decae solo; color en FX.color
 *   FX.sway   balanceo de la viñeta (no de la cámara)
 */
export const FX = { vig: 0, fade: 0, dark: 0, flash: 0, color: new THREE.Color('#ff2a1a'), sway: 0 }

const fxMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, transparent: true, depthTest: false, depthWrite: false, fog: false,
  uniforms: { uVig: { value: 0 }, uFade: { value: 0 }, uFlash: { value: 0 }, uColor: { value: FX.color }, uSway: { value: 0 }, uT: { value: 0 } },
  vertexShader: `varying vec3 vP; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vP = mv.xyz; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `varying vec3 vP; uniform float uVig, uFade, uFlash, uSway, uT; uniform vec3 uColor;
    void main(){
      vec3 d = normalize(vP);
      vec2 off = vec2(sin(uT * 1.3), cos(uT * 0.9)) * 0.12 * uSway;
      float ang = acos(clamp(-normalize(vec3(d.xy - off, d.z)).z, 0.0, 1.0));
      float v = smoothstep(0.62, 1.3, ang) * uVig;
      float a = clamp(v + uFade, 0.0, 1.0);
      vec3 col = mix(vec3(0.0), uColor, uFlash * (0.4 + 0.6 * smoothstep(0.2, 1.2, ang)));
      gl_FragColor = vec4(col, clamp(a + uFlash * 0.55, 0.0, 1.0));
    }`,
})

export default function ScreenFx() {
  const ref = useRef()
  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1)
    FX.fade = Math.max(0, FX.fade - dt * 3.2)
    FX.flash = Math.max(0, FX.flash - dt * 1.2)
    const u = fxMat.uniforms
    u.uVig.value = Math.min(1.6, FX.vig + FX.dark * 1.6)
    u.uFade.value = Math.min(1, FX.fade * 1.4 + Math.max(0, FX.dark - 0.6) * 2.5)
    u.uFlash.value = FX.flash
    u.uSway.value = FX.sway
    u.uT.value += dt
    const m = ref.current
    if (!m) return
    m.visible = u.uVig.value > 0.01 || u.uFade.value > 0 || FX.flash > 0.01
    if (m.visible) m.position.copy(headPose(state).pos)
  })
  return (
    <mesh ref={ref} material={fxMat} renderOrder={999} frustumCulled={false} raycast={() => null} visible={false}>
      <sphereGeometry args={[0.3, 24, 12]} />
    </mesh>
  )
}
