import demo from './demo.js'
import loto from './loto.js'
import alturas from './alturas.js'
import confinados from './confinados.js'
import { validate } from '../engine/validate.js'

/*
 * Catálogo de escenarios que muestra el lobby.  Un escenario nuevo = su archivo de datos aquí +
 * su entorno en src/world/<world>/ registrado en world/index.js.  Nada más.
 */
export const SCENARIOS = [loto, alturas, confinados, demo]
export const SCENARIO_INDEX = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]))

/* en desarrollo, cada escenario se valida al cargar (las pruebas lo hacen siempre) */
if (import.meta.env?.DEV) {
  for (const s of SCENARIOS) {
    const p = validate(s)
    if (p.length) console.warn(`Escenario ${s.id} con problemas:\n` + p.join('\n'))
  }
}
