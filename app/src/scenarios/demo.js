/*
 * Escenario de demostración (juguete): aislar una línea antes de abrir una tapa.  Sirve para
 * probar el motor (tests/fixtures/demo.js), el flujo de sesión y el kit de interacción en un
 * entorno de cajas.  NO es contenido de entrenamiento.
 */
import { ATMOSFERA } from './limits.js'

export default {
  id: 'demo', version: 1,
  title: 'Demostración — aislar una línea',
  summary: 'Escenario corto para conocer los controles: permiso, candado, interruptor, válvula y detector.',
  norms: ['Escenario de práctica de controles (sin contenido normativo)'],
  minutes: 4,
  world: 'demo',
  spawn: { x: 0, z: 3, yaw: 0 },
  objects: {
    'permiso':   { kind: 'document', label: 'Permiso de trabajo', pos: [-2.5, 1.4, -1.5], text: 'Permiso de trabajo de demostración. Léelo y fírmalo antes de intervenir.' },
    'candado':   { kind: 'item', label: 'Candado personal', group: 'candado-personal', color: 'red', pos: [-1.2, 1.2, -1.9] },
    'candado-x': { kind: 'item', label: 'Candado amarillo (prestado)', group: 'candado-prestado', color: 'yellow', pos: [-0.9, 1.2, -1.9] },
    'int-01':    { kind: 'breaker', label: 'Interruptor INT-01', initial: 'on', pos: [0.6, 1.4, -1.9] },
    'punto-int': { kind: 'lockpoint', label: 'Punto de bloqueo INT-01', for: 'int-01', pos: [0.6, 1.1, -1.9] },
    'v-01':      { kind: 'valve', label: 'Válvula V-01', initial: 'open', pos: [2.2, 1.0, -1.2] },
    'detector':  { kind: 'gasdetector', label: 'Detector de gases', reading: 'aire', pos: [-2.2, 1.0, 0.5],
      limits: { o2: [ATMOSFERA.o2Min, ATMOSFERA.o2Max], lel: ATMOSFERA.lelMax, h2s: ATMOSFERA.h2sMax, co: ATMOSFERA.coMax }, levels: ['zona'] },
    'tapa':      { kind: 'task', label: 'Tapa de inspección', initial: 'cerrada', verbs: { abrir: 'abierta', cerrar: 'cerrada' }, pos: [2.2, 0.6, -0.6] },
  },
  readings: {
    aire: () => ({ zona: { o2: 20.9, lel: 0, h2s: 0, co: 0 } }),
  },
  phases: [
    { id: 'preparar', title: 'Preparación', order: 'any', steps: [
      { id: 'firmar', title: 'Firmar el permiso de trabajo', done: { state: ['permiso', 'firmado'] }, points: 20, targets: ['permiso'],
        hint: 'El permiso está en el tablero de la izquierda: apúntalo y pulsa el gatillo.' },
      { id: 'tomar-candado', title: 'Tomar tu candado personal (rojo)', done: { has: 'candado-personal' }, points: 10, targets: ['candado'],
        hint: 'Apunta al candado rojo y pulsa el grip (E en el PC).' },
    ]},
    { id: 'aislar', title: 'Aislamiento', order: 'strict', steps: [
      { id: 'abrir-int', title: 'Abrir el interruptor INT-01', done: { state: ['int-01', 'off'] }, points: 15, targets: ['int-01'] },
      { id: 'cerrar-v', title: 'Cerrar la válvula V-01', done: { state: ['v-01', 'closed'] }, points: 15, targets: ['v-01'] },
      { id: 'bloquear', title: 'Poner tu candado en el punto de bloqueo', done: { state: ['punto-int', 'has', 'candado-personal'] }, points: 15, targets: ['punto-int'],
        hint: 'Con el candado en la mano, apunta al punto de bloqueo y pulsa A (F en el PC).' },
    ]},
    { id: 'verificar', title: 'Verificación y trabajo', order: 'strict', steps: [
      { id: 'medir', title: 'Encender el detector y medir la zona', done: { state: ['detector.lecturas.zona.ok', true] }, points: 15, targets: ['detector'] },
      { id: 'abrir-tapa', title: 'Abrir la tapa de inspección', done: { state: ['tapa', 'abierta'] }, points: 10, targets: ['tapa'] },
    ]},
  ],
  errors: [
    { id: 'sin-permiso', on: { act: [['int-01', 'off'], ['v-01', 'close']] }, when: { not: { state: ['permiso', 'firmado'] } }, severity: 'mayor',
      message: 'Empezaste a aislar sin el permiso firmado.' },
    { id: 'candado-prestado', on: { act: ['punto-int', 'poner', 'candado-prestado'] }, severity: 'mayor',
      message: 'El candado es personal: una persona, un candado, una llave.' },
    { id: 'tapa-sin-aislar', on: { act: ['tapa', 'abrir'] }, when: { not: { phaseDone: 'aislar' } }, severity: 'critico', consequence: 'arranque-inesperado',
      message: 'Abriste la tapa con la línea sin aislar: el equipo arrancó.',
      explain: 'Antes de intervenir se aíslan y bloquean todas las energías.',
      should: 'Abrir el interruptor, cerrar la válvula y poner tu candado; luego verificar.' },
  ],
  debrief: [
    'Primero el permiso, luego el aislamiento, luego la verificación.',
    'Tu candado es personal.',
  ],
}
