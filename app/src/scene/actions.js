import { useApp } from '../store.js'
import { PLAYER, nearestClimb } from '../walk/walk.js'
import { haptic } from './interact.js'

/*
 * Acciones del jugador, comunes a PC y visor (docs/06):
 *
 *   trigger(obj)   gatillo derecho / clic: interactuar con lo apuntado
 *   grip()         grip derecho / E: tomar o soltar el objeto apuntado
 *   use()          botón A / F: usar el objeto en mano sobre lo apuntado · escaleras
 *   cycle()        botón B / Q: siguiente objeto del inventario a la mano
 *   repeat()       botón X / R: repetir la instrucción del paso (aprendizaje)
 *
 * El kit de interacción (interact/handlers.js) registra aquí sus manejadores; sin escenario
 * cargado solo funcionan las escaleras.
 */
export const HANDLERS = { trigger: null, grip: null, use: null, cycle: null, repeat: null, climb: null }

export function trigger(obj) { if (obj) HANDLERS.trigger?.(obj) }
export function grip() { HANDLERS.grip?.(useApp.getState().hovered) }
export function cycle() { HANDLERS.cycle?.() }
export function repeat() { HANDLERS.repeat?.() }

/** escalera vertical cercana → subir/bajar; si no, usar el objeto en mano sobre lo apuntado */
export function use() {
  const c = nearestClimb(PLAYER.x, PLAYER.z, PLAYER.y, 1.6)
  if (c) { climb(c); return }
  HANDLERS.use?.(useApp.getState().hovered)
}

export function climb(hit) {
  const { c, toTop } = hit
  if (HANDLERS.climb && HANDLERS.climb(c, toTop) === false) return      // el escenario puede impedirlo (o registrar la acción)
  const st = useApp.getState()
  if (toTop) st.requestTeleport({ x: c.top[0], z: c.top[1], y: c.top[2], yaw: c.yaw })
  else st.requestTeleport({ x: c.foot[0], z: c.foot[1], y: c.foot[2], yaw: (c.yaw ?? 0) + Math.PI })
  haptic('right', 0.4, 60)
}
