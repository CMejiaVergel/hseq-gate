import { create } from 'zustand'

/*
 * Estado de interfaz y de sesión (zustand).  El estado del ESCENARIO no vive aquí: vive en el
 * runner del motor (engine/runner.js) y se publica con run/bridge.js.  Usar siempre selectores
 * (`useApp((s) => s.x)`): sin selector se re-renderiza con cualquier cambio (lección de Smart Plant 3D).
 *
 *   screen   'portada' (DOM) · 'lobby' · 'escenario' · 'debrief' · 'instructor' (DOM)
 *   view     null (portada/instructor) · 'fp' (PC: teclado y ratón) · 'vr' (visor)
 */
export const MODES = { aprendizaje: 'Aprendizaje', practica: 'Práctica', evaluacion: 'Evaluación' }

export const useApp = create((set, get) => ({
  screen: 'portada',
  view: null,
  setScreen: (screen) => set({ screen }),
  setView: (view) => set({ view }),

  /* --- sesión --- */
  trainee: null,                       // { cedula, nombre, empresa, invitado }
  scenarioId: null,
  mode: 'aprendizaje',
  setTrainee: (trainee) => set({ trainee }),
  setScenario: (scenarioId) => set({ scenarioId }),
  setMode: (mode) => set({ mode }),
  lastResult: null,                    // resultado del último intento (debrief)
  setLastResult: (lastResult) => set({ lastResult }),

  /* --- tableta y paneles --- */
  tablet: false,
  tabletTab: 'paso',                   // paso | pista | checklist | inventario | salir
  toggleTablet: () => set((s) => ({ tablet: !s.tablet })),
  setTablet: (tablet) => set({ tablet }),
  setTabletTab: (tabletTab) => set({ tabletTab, tablet: true }),
  modal: null,                         // { objId } → panel de detalle del objeto (documento, diálogo, quiz, inspección…)
  openModal: (objId) => set({ modal: objId ? { objId, n: performance.now() } : null }),

  /* --- avisos (franja frente a la vista) --- */
  toast: null,                         // { text, kind: 'ok'|'menor'|'mayor'|'info', n }
  showToast: (text, kind = 'info') => set({ toast: { text, kind, n: performance.now() + Math.random() } }),

  /* --- interacción --- */
  hovered: null,                       // objId apuntado (mira en PC, rayo del mando en VR)
  hover: (hovered) => { if (get().hovered !== hovered) set({ hovered }) },

  /* --- jugador --- */
  walkSpeed: 1.6,
  turnMode: 'snap',
  vignette: true,
  teleportReq: null,                   // { x, z, y, yaw?, n }
  requestTeleport: (t) => set({ teleportReq: { ...t, n: performance.now() + Math.random() } }),
  fadeReq: 0,                          // fundido breve (al cambiar de escena)
  requestFade: () => set((s) => ({ fadeReq: s.fadeReq + 1 })),

  /* --- calidad / diagnóstico --- */
  quality: 'high',
  setQuality: (quality) => set({ quality }),
  inXR: false,
  setInXR: (inXR) => set({ inXR }),
  fps: 0,
  setFps: (fps) => set({ fps }),
}))
