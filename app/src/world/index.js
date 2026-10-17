import DemoWorld from './demo/DemoWorld.jsx'
import LotoWorld from './loto/LotoWorld.jsx'
import AlturasWorld from './alturas/AlturasWorld.jsx'
import ConfinadosWorld from './confinados/ConfinadosWorld.jsx'

/* Registro de entornos: `scenario.world` → componente.  Un escenario nuevo agrega aquí el suyo. */
export const WORLDS = {
  demo: DemoWorld,
  loto: LotoWorld,
  alturas: AlturasWorld,
  confinados: ConfinadosWorld,
}
