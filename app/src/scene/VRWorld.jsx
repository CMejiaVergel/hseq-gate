import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/*
 * Cielo y luz de exteriores (de Smart Plant 3D, sin la planta): cielo con sol y nubes que
 * acompaña a la cabeza y niebla en el horizonte.  Los interiores (lobby, foso) usan
 * `sky={false}`: fondo liso y luz propia.  El cielo se dibuja después de los opacos
 * (renderOrder alto): su ruido por píxel solo se paga donde no hay nada delante.
 */
export const SUN = new THREE.Vector3(0.42, 0.66, 0.30).normalize()
const HORIZON = '#c9dcea'
const T = { value: 0 }

const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { uSun: { value: SUN }, uTime: T },
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    varying vec3 vDir; uniform vec3 uSun; uniform float uTime;
    float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
    float fbm(vec2 p){ return 0.5 * n2(p) + 0.25 * n2(p * 2.1 + 3.0) + 0.125 * n2(p * 4.3 + 7.0); }
    void main(){
      vec3 d = normalize(vDir);
      float h = d.y;
      vec3 zen = vec3(0.13, 0.33, 0.70), hor = vec3(0.79, 0.88, 0.95), grd = vec3(0.42, 0.45, 0.40);
      vec3 col = mix(hor, zen, pow(clamp(h, 0.0, 1.0), 0.45));
      col = mix(col, grd, smoothstep(-0.005, -0.12, h));
      float s = max(dot(d, normalize(uSun)), 0.0);
      col += vec3(1.0, 0.92, 0.72) * (pow(s, 900.0) * 3.0 + pow(s, 14.0) * 0.16);
      vec2 p = d.xz / (h + 0.22) * 1.6 + vec2(uTime * 0.006, 0.0);
      float c = smoothstep(0.52, 0.82, fbm(p)) * smoothstep(0.015, 0.30, h);
      col = mix(col, vec3(1.0), c * 0.8);
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
})

export default function VRWorld({ sky = true, background = '#1a2130', fog = true }) {
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const dome = useMemo(() => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), skyMat)
    m.scale.setScalar(400); m.frustumCulled = false; m.renderOrder = 1000; m.name = 'sky'
    m.raycast = () => null
    return m
  }, [])
  const ground = useMemo(() => {
    const m = new THREE.Mesh(new THREE.RingGeometry(14, 600, 48, 1), new THREE.MeshLambertMaterial({ color: '#7a7d6a' }))
    m.rotation.x = -Math.PI / 2; m.position.y = -0.02; m.name = 'farGround'
    m.updateMatrix(); m.matrixAutoUpdate = false
    m.raycast = () => null
    return m
  }, [])

  useEffect(() => {
    const prevFog = scene.fog, prevFar = camera.far
    if (sky && fog) scene.fog = new THREE.Fog(HORIZON, 90, 420)
    camera.far = sky ? 600 : 120; camera.updateProjectionMatrix()
    gl.setClearColor(sky ? HORIZON : background, 1)
    return () => { scene.fog = prevFog; camera.far = prevFar; camera.updateProjectionMatrix() }
  }, [scene, camera, gl, sky, background, fog])

  useFrame((state, dt) => {
    if (!sky) return
    T.value += dt
    const cam = state.gl.xr.isPresenting ? state.gl.xr.getCamera() : state.camera
    cam.getWorldPosition(dome.position)
  })

  if (!sky) return null
  return (
    <>
      <primitive object={dome} />
      <primitive object={ground} />
      <directionalLight position={[SUN.x * 100, SUN.y * 100, SUN.z * 100]} intensity={1.35} color="#fff2dc" />
      <hemisphereLight args={['#bcd6ee', '#6d7f45', 0.6]} />
    </>
  )
}
