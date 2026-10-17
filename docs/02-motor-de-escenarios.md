# 02 — Motor de escenarios

El corazón del producto. **JavaScript puro** en `app/src/engine/`: no importa React ni three.js, para que
cada escenario se pueda probar entero con vitest (`docs/09`).

## Conceptos
| Concepto | Qué es |
|---|---|
| **Escenario** | Archivo de datos (`src/scenarios/<id>.js`) con objetos, fases, pasos, errores y debrief |
| **Objeto** | Algo con estado que el aprendiz manipula: interruptor, válvula, candado, detector… Tiene `kind` |
| **Kind** | Comportamiento genérico de un tipo de objeto (`engine/kinds.js`): verbos permitidos y cómo cambian el estado |
| **Estado del mundo** | Diccionario plano `state[objId] = valor` + `flags` + `readings` derivados |
| **Acción** | `act(objId, verb, payload?)` — la única forma de cambiar el mundo |
| **Paso** | Algo que hay que lograr; se completa cuando su condición se cumple |
| **Fase** | Grupo de pasos con orden `strict` (uno tras otro) o `any` (cualquier orden dentro de la fase) |
| **Error** | Regla que se dispara con una acción (o un tick) si su condición se cumple; tiene severidad |
| **Consecuencia** | Efecto audiovisual de un error crítico (`world/effects`): arranque del motor, caída, desvanecimiento |
| **Intento** | Una ejecución de un escenario por un aprendiz en un modo: produce un registro (`docs/07`) |

## Formato de un escenario (ejemplo abreviado)
```js
// src/scenarios/loto.js
import { LIMITS } from './limits.js'
export default {
  id: 'loto-bomba', version: 1,
  title: 'Bloqueo y etiquetado (LOTO) — bomba P-101',
  summary: 'Aislar todas las energías de una bomba centrífuga antes de cambiarle el sello.',
  norms: ['OSHA 29 CFR 1910.147', 'ANSI/ASSP Z244.1', 'Decreto 1072 de 2015 (SG-SST)'],
  minutes: 12,
  world: 'loto',                                   // constructor procedural en src/world/loto/
  spawn: { x: 0, z: 4, yaw: Math.PI },
  objects: {
    'permiso':      { kind: 'document',  label: 'Permiso de trabajo', initial: 'pendiente' },
    'ccm-03':       { kind: 'breaker',   label: 'Interruptor P-101 (CCM-03)', initial: 'on' },
    'pb-local':     { kind: 'pushbutton',label: 'Botonera local P-101' },
    'v-succion':    { kind: 'valve',     label: 'Válvula de succión', initial: 'open' },
    'v-descarga':   { kind: 'valve',     label: 'Válvula de descarga', initial: 'open' },
    'v-purga':      { kind: 'valve',     label: 'Válvula de purga', initial: 'closed' },
    'pi-carcasa':   { kind: 'gauge',     label: 'Manómetro de carcasa', reading: 'presionCarcasa' },
    'punto-ccm':    { kind: 'lockpoint', label: 'Punto de bloqueo CCM-03', for: 'ccm-03' },
    // …
  },
  readings: {                                       // valores derivados del estado (funciones puras)
    presionCarcasa: (s) => (s['v-succion'] === 'closed' && s['v-descarga'] === 'closed' && s['v-purga'] === 'open') ? 0 : 45,
  },
  phases: [
    { id: 'preparar', title: 'Preparación', order: 'any', steps: [
      { id: 'permiso', title: 'Firmar el permiso de trabajo', done: { state: ['permiso', 'firmado'] }, points: 5,
        hint: 'El permiso está en el tablero junto a la puerta.' },
      // …
    ]},
    { id: 'aislar', title: 'Aislamiento', order: 'strict', steps: [ /* … */ ] },
  ],
  errors: [
    { id: 'abrir-sin-parar', on: { act: ['ccm-03', 'off'] }, when: { state: ['motor', 'running'] },
      severity: 'mayor', message: 'Abriste el interruptor con el equipo en marcha: primero se para con el pulsador normal.' },
    { id: 'trabajo-sin-verificar', on: { act: ['sello', 'desmontar'] }, when: { not: { stepDone: 'verificar-cero' } },
      severity: 'critico', consequence: 'arranque-inesperado',
      message: 'Intervenir sin verificar energía cero: la bomba arrancó.',
      explain: 'Siempre se prueba el arranque y se mide ausencia de tensión antes de tocar el equipo.' },
  ],
  debrief: ['Identifica TODAS las fuentes de energía…', 'Un candado = una persona = una llave.'],
}
```

## Lenguaje de condiciones (`engine/conditions.js`)
Objetos JSON evaluados contra `{ state, flags, readings, done, inventory }`:
```
{ state: [objId, valor] }            estado igual a valor
{ state: [objId, 'in', [v1, v2]] }   estado en lista
{ reading: [nombre, op, número] }    op ∈ '<' '<=' '>' '>=' '==' ; lee readings[nombre](state)
{ flag: nombre }                     bandera puesta (p. ej. 'ats-hecho')
{ stepDone: stepId }                 paso completado
{ has: itemId }                      el aprendiz tiene el objeto (inventario: candado, tarjeta, detector)
{ all: [c…] }  { any: [c…] }  { not: c }
{ near: [objId, metros] }            el jugador está a menos de N m (el motor recibe la posición del jugador)
```
Nada de funciones dentro de las condiciones (salvo `readings`): así son serializables y revisables.

## Kinds iniciales (`engine/kinds.js`)
| kind | verbos | estado |
|---|---|---|
| `document` | `leer`, `firmar` | `pendiente` → `firmado` |
| `checklist` | `marcar(item)` | conjunto de ítems marcados |
| `breaker` | `on`, `off` | `on` / `off` |
| `pushbutton` | `start`, `stop` | (acción; efecto lo define el escenario vía `effects`) |
| `valve` | `open`, `close` | `open` / `closed` |
| `lockpoint` | `lock(lockId)`, `unlock(lockId)`, `tag(tagId)` | lista de candados y tarjetas puestos |
| `item` | `tomar`, `soltar`, `usar(target)` | en sitio / en inventario |
| `gauge` | `leer` | muestra `readings[reading]` |
| `tester` | `medir(target)` | resultado según `readings` (tensión) — protocolo probar-medir-probar |
| `gasdetector` | `encender`, `bump`, `medir(nivel)` | lecturas O₂/LEL/H₂S/CO por nivel |
| `harness` | `inspeccionar(punto)`, `poner`, `ajustar` | defectos encontrados, puesto, ajustado |
| `anchor` | `conectar`, `desconectar` | conectado / libre; tiene `rating` |
| `barrier` | `colocar`, `retirar` | colocada / no |
| `door` | `abrir`, `cerrar` | abierta / cerrada (escotilla, manhole) |
| `fan` | `on`, `off` | ventilación; afecta lecturas con el tiempo (`tick`) |
| `radio` | `llamar(a)` | registra comunicación |
| `person` | `hablar(opción)` | NPC (vigía, supervisor): diálogo de opciones |

`effects` por escenario: reglas `{ on: {act:[obj,verb]}, when?, set: {obj: valor}, flag?: nombre }` para
efectos encadenados (p. ej. `pb-local:start` con `ccm-03 = on` → `motor = running`).

## Ciclo del runner (`engine/runner.js`)
```
const run = createRun(scenario, { mode, seed })
run.act(objId, verb, payload)   → { ok, events: [...] }
run.tick(dt, { player })        → eventos por tiempo (ventilación, temporizadores, near)
run.hint()                      → pista del paso actual (cuenta en el puntaje)
run.snapshot()                  → estado completo serializable (para UI y para guardar)
run.on(evento, fn)              → 'step' | 'phase' | 'error' | 'critical' | 'finished' | 'state'
```
Al recibir una acción:
1. Validar verbo para el kind (si no: ignorar, sin error).
2. Evaluar **errores** con `on` = esa acción y `when` verdadero → registrar; si es `critico` → evento
   `critical` con su `consequence` (ver modos abajo).
3. Aplicar el cambio de estado del kind y los `effects` del escenario; recalcular `readings`.
4. Evaluar pasos de la fase actual: en `strict` solo puede completarse el siguiente; si se cumple la
   condición de un paso posterior antes, registrar error `fuera-de-orden` (severidad del escenario,
   por defecto `menor`). En `any`, cualquiera. Fase completa → siguiente fase.
5. Última fase completa → `finished` con resultado.

## Modos (`docs/07`)
| | Aprendizaje | Práctica | Evaluación |
|---|---|---|---|
| Instrucción del paso actual | Visible siempre + resaltado del objeto | Oculta; pista a demanda (−puntos) | No |
| Error menor/mayor | Aviso inmediato con explicación | Aviso breve | Silencioso (sale en el debrief) |
| Error crítico | Consecuencia + explicación + **reintentar desde el paso** | Consecuencia + explicación + reintentar | Consecuencia + **fin del intento (no aprobado)** |

## Reglas de calidad del motor
- Determinista: con la misma secuencia de acciones y `seed`, el mismo resultado (los aleatorios —p. ej.
  qué defecto trae el arnés— salen de un PRNG con semilla, guardada en el intento).
- Cobertura de pruebas: cada escenario tiene al menos su **camino feliz** y **cada error crítico** como
  pruebas vitest (`tests/scenarios/<id>.test.js`).
- Validador de escenarios (`engine/validate.js`): ids únicos, referencias existentes, verbos válidos para
  el kind, todo paso alcanzable. Se ejecuta en las pruebas y en DEV al cargar.
