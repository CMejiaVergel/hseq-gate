import { createXRStore } from '@react-three/xr'

/*
 * Un único store de WebXR para toda la app (copiado de Smart Plant 3D, mismas lecciones).
 *
 *  - Solo mandos: sin manos ni seguimiento de manos (con manos el visor iba muy lento).
 *    Si no hay mandos, ui/XrOverlays pide tomarlos.
 *  - Sin puntero de agarre: duplicaba la intersección con toda la escena en cada cuadro.
 *  - 72 Hz: por defecto se pedía la máxima (120 Hz, 8,3 ms por cuadro) y el visor reproyectaba.
 *  - emulate: en localhost sin visor, @react-three/xr inyecta el emulador IWER (solo en desarrollo).
 */
export const xrStore = createXRStore({
  meshDetection: false,
  planeDetection: false,
  hand: false,
  handTracking: false,
  controller: { grabPointer: false },
  frameRate: (rates) => (rates.includes(72) ? 72 : false),
  emulate: import.meta.env.DEV ? { type: 'metaQuest3', syntheticEnvironment: false } : false,
})
