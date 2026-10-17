/*
 * Escenario 1 — LOTO (bloqueo y etiquetado) de la bomba P-101 (docs/03).
 *
 * Contenido de entrenamiento basado en la secuencia general de control de energías peligrosas
 * (OSHA 29 CFR 1910.147, ANSI/ASSP Z244.1) y el SG-SST colombiano (Decreto 1072 de 2015).
 * DEBE VALIDARLO UN PROFESIONAL HSE antes de uso oficial.  Valores numéricos en limits.js.
 *
 * Situación: cambiar el sello mecánico de la bomba centrífuga P-101 (agua caliente de proceso,
 * 60 °C, 45 psig).  El aprendiz es el mecánico asignado.
 */
import { LOTO } from './limits.js'

/* interruptores del CCM-03: el de P-101 y cinco más (el orden en el tablero se baraja con la semilla) */
export const BREAKERS = [
  ['ccm-p101', 'P-101'], ['ccm-p102', 'P-102'], ['ccm-p103', 'P-103'],
  ['ccm-vent01', 'VENT-01'], ['ccm-ilum02', 'ILUM-02'], ['ccm-toma04', 'TOMA-04'],
]
const OTHER_BREAKERS = BREAKERS.slice(1).map(([id]) => id)
const POINTS = BREAKERS.map(([id]) => 'punto-' + id.slice(4))           // punto-p101, punto-p102…
const OTHER_POINTS = POINTS.slice(1)
const ALL_POINTS = [...POINTS, 'punto-succion', 'punto-descarga']

const objects = {
  /* documentos y comunicación */
  'ot': { kind: 'document', label: 'Orden de trabajo OT-0412', readOnly: true, pos: [-6.8, 1.45, 2.6],
    fields: [['Equipo', 'Bomba centrífuga P-101'], ['Trabajo', 'Cambio de sello mecánico'], ['Fluido', `Agua caliente ${LOTO.temperatura} °C · ${LOTO.presionCarcasa} psig`], ['Motor', `${LOTO.tensionMotor} V · CCM-03`]],
    text: 'Antes de intervenir, aislar y bloquear todas las fuentes de energía de P-101 y verificar energía cero.' },
  'permiso': { kind: 'document', label: 'Permiso de trabajo PT-2291', pos: [-6.8, 1.45, 3.8], closable: true,
    fields: [['Tipo', 'Mantenimiento mecánico con aislamiento de energías'], ['Ejecutante', 'Mecánico asignado (tú)'], ['Emisor', 'Supervisor de turno']],
    text: 'Requisitos: bloqueo y etiquetado de energías eléctrica y de proceso, liberación de energía almacenada, verificación de energía cero. Al terminar, cerrar el permiso.',
    signLabel: 'Firmar como ejecutante', closeLabel: 'Cerrar el permiso (trabajo terminado)' },
  'radio': { kind: 'radio', label: 'Radio portátil', tablet: true, tabletSub: 'Comunicación con el operador de sala',
    options: [
      { id: 'op-fuera', label: 'Operador: «P-101 sale de servicio para cambio de sello»', reply: 'Recibido. Paso la carga a P-102. P-101 queda fuera de servicio.' },
      { id: 'op-energizar', label: 'Operador: «Terminé el trabajo en P-101; voy a energizar»', reply: 'Recibido, quedo atento al arranque.' },
    ] },
  'operador': { kind: 'person', label: 'Andrea · operadora de sala', pos: [5.6, 1.6, 3.6],
    text: 'Está en la puerta del cuarto de control.',
    options: [
      { id: 'aviso-fuera', label: '«P-101 sale de servicio para cambiar el sello»', reply: 'Listo, paso la carga a P-102. Avísame cuando termines.' },
      { id: 'aviso-energizar', label: '«Terminé; voy a energizar P-101»', reply: 'Perfecto, quedo atenta.' },
    ] },
  'matriz': { kind: 'checklist', label: 'Matriz de energías de P-101', tablet: true, tabletSub: 'Identificar cada fuente de energía',
    text: 'Marca TODAS las fuentes de energía peligrosa presentes en P-101 (y ninguna que no aplique).', cols: 1,
    items: [
      { id: 'electrica', label: 'Eléctrica — motor (CCM-03)' },
      { id: 'presion-succion', label: 'Presión en la línea de succión' },
      { id: 'presion-descarga', label: 'Presión en la línea de descarga' },
      { id: 'almacenada', label: 'Energía almacenada en la carcasa' },
      { id: 'termica', label: `Térmica — agua a ${LOTO.temperatura} °C` },
      { id: 'mecanica', label: 'Mecánica — rotación del eje y acople' },
      { id: 'neumatica', label: 'Neumática — aire de instrumentos', correct: false },
      { id: 'radiacion', label: 'Radiación ionizante', correct: false },
    ] },

  /* estación de bloqueo */
  'candado-1': { kind: 'item', label: 'Candado personal rojo #1', group: 'candado-personal', shape: 'candado', color: 'red', pos: [-6.8, 1.55, 0.95] },
  'candado-2': { kind: 'item', label: 'Candado personal rojo #2', group: 'candado-personal', shape: 'candado', color: 'red', pos: [-6.8, 1.55, 1.2] },
  'candado-3': { kind: 'item', label: 'Candado personal rojo #3', group: 'candado-personal', shape: 'candado', color: 'red', pos: [-6.8, 1.55, 1.45] },
  'candado-amarillo': { kind: 'item', label: 'Candado amarillo «para prestar»', group: 'candado-prestado', shape: 'candado', color: 'yellow', pos: [-6.8, 1.55, 1.9] },
  'tarjeta-1': { kind: 'item', label: 'Tarjeta «PELIGRO – NO OPERAR» #1', group: 'tarjeta', shape: 'tarjeta', pos: [-6.8, 1.2, 0.95] },
  'tarjeta-2': { kind: 'item', label: 'Tarjeta «PELIGRO – NO OPERAR» #2', group: 'tarjeta', shape: 'tarjeta', pos: [-6.8, 1.2, 1.2] },
  'tarjeta-3': { kind: 'item', label: 'Tarjeta «PELIGRO – NO OPERAR» #3', group: 'tarjeta', shape: 'tarjeta', pos: [-6.8, 1.2, 1.45] },
  'cubre-1': { kind: 'item', label: 'Cubre-volante #1', group: 'cubre-volante', shape: 'cubre', pos: [-6.75, 0.95, 1.1] },
  'cubre-2': { kind: 'item', label: 'Cubre-volante #2', group: 'cubre-volante', shape: 'cubre', pos: [-6.75, 0.95, 1.6] },
  'candado-electricista': { kind: 'item', label: 'Candado azul del electricista (J. Rojas)', group: 'candado-ajeno', shape: 'candado', color: 'blue', initial: 'en:caja-grupal' },
  'caja-grupal': { kind: 'lockpoint', label: 'Caja de bloqueo grupal', preset: ['candado-electricista'], pos: [11.4, 1.3, -4.85] },
  'probador': { kind: 'tester', label: 'Probador de tensión', pos: [2.4, 0.95, -2.5], reads: { fuente: 'tensionFuente', bornera: 'tensionBornera' },
    readLabels: { fuente: 'Fuente conocida (toma de prueba)', bornera: 'Bornera del motor P-101' }, threshold: LOTO.umbralProbador,
    dead: { variant: ['probadorDescargado', true] }, text: 'Protocolo: probar en una fuente conocida → medir la bornera → probar de nuevo en la fuente.' },
  'probador-2': { kind: 'tester', label: 'Probador de tensión de repuesto', pos: [2.75, 0.95, -2.5], reads: { fuente: 'tensionFuente', bornera: 'tensionBornera' },
    readLabels: { fuente: 'Fuente conocida (toma de prueba)', bornera: 'Bornera del motor P-101' }, threshold: LOTO.umbralProbador,
    text: 'Probador de repuesto (batería nueva).' },

  /* equipo de proceso */
  'pb-local': { kind: 'pushbutton', label: 'Botonera local P-101 (arranque / parada)', pos: [1.9, 1.2, 0.3] },
  'motor': { kind: 'task', label: 'Motor de P-101', initial: 'running', verbs: {} },
  'v-succion': { kind: 'valve', label: 'Válvula de succión P-101', initial: 'open', lockedBy: 'punto-succion', pos: [-2.6, 1.15, -1] },
  'v-descarga': { kind: 'valve', label: 'Válvula de descarga P-101', initial: 'open', lockedBy: 'punto-descarga', pos: [-0.55, 1.55, -3.0] },
  'v-purga': { kind: 'valve', label: 'Válvula de purga (drenaje)', initial: 'closed', pos: [-0.3, 0.62, -0.55] },
  'punto-succion': { kind: 'lockpoint', label: 'Bloqueo de la válvula de succión', pos: [-2.6, 0.9, -1] },
  'punto-descarga': { kind: 'lockpoint', label: 'Bloqueo de la válvula de descarga', pos: [-0.55, 1.3, -3.0] },
  'pi-carcasa': { kind: 'gauge', label: 'Manómetro de carcasa PI-101', reading: 'presionCarcasa', unit: 'psig', pos: [-0.3, 0.95, -0.72] },
  'guarda': { kind: 'task', label: 'Guarda del acople', initial: 'instalada', verbs: { retirar: 'retirada', instalar: 'instalada' }, verbLabels: { retirar: 'Retirar la guarda', instalar: 'Instalar la guarda' }, pos: [0.25, 0.6, -1] },
  'sello': { kind: 'task', label: 'Sello mecánico de P-101', initial: 'viejo', verbs: { desmontar: 'desmontado', montar: 'nuevo' },
    from: { desmontar: ['viejo'], montar: ['desmontado'] }, requires: { desmontar: { state: ['guarda', 'retirada'] } },
    verbLabels: { desmontar: 'Desmontar el sello dañado', montar: 'Montar el sello nuevo' }, text: 'Para llegar al sello hay que retirar la guarda del acople.', pos: [-0.1, 0.6, -1] },
}
/* interruptores y sus puntos de bloqueo */
for (const [id, tag] of BREAKERS) {
  objects[id] = { kind: 'breaker', label: `Interruptor ${tag} (CCM-03)`, initial: 'on', lockedBy: 'punto-' + id.slice(4), tag }
  objects['punto-' + id.slice(4)] = { kind: 'lockpoint', label: `Punto de bloqueo ${tag}`, for: id }
}
objects['ccm-p101'].pos = [9.5, 1.5, -4.7]

const notificado = { any: [{ state: ['radio', 'has', 'op-fuera'] }, { state: ['operador', 'has', 'aviso-fuera'] }] }
const avisoEnergizar = { any: [{ state: ['radio', 'has', 'op-energizar'] }, { state: ['operador', 'has', 'aviso-energizar'] }] }
const pmp = (t) => ({ sequence: [t + '', ['fuente:si', 'bornera:no', 'fuente:si']] })

export default {
  id: 'loto-bomba', version: 1,
  title: 'Bloqueo y etiquetado (LOTO) — bomba P-101',
  summary: 'Aislar todas las energías de una bomba centrífuga antes de cambiarle el sello mecánico.',
  norms: ['OSHA 29 CFR 1910.147', 'ANSI/ASSP Z244.1', 'Decreto 1072 de 2015 (SG-SST)'],
  minutes: 12,
  world: 'loto',
  spawn: { x: 0, z: 3.6, yaw: 0 },
  objects,
  readings: {
    presionCarcasa: (s) => (s['v-purga'] === 'open' && s['v-succion'] === 'closed' && s['v-descarga'] === 'closed' ? 0 : LOTO.presionCarcasa),
    tensionFuente: () => 120,
    tensionBornera: (s) => (s['ccm-p101'] === 'on' ? LOTO.tensionMotor : 0),
  },
  /* práctica y evaluación: interruptor P-101 en otra posición del CCM y probador posiblemente descargado */
  variants: (rng, mode) => mode === 'aprendizaje'
    ? { orden: BREAKERS.map(([id]) => id), probadorDescargado: false }
    : { orden: rng.shuffle(BREAKERS.map(([id]) => id)), probadorDescargado: rng.chance(LOTO.probabilidadProbadorDescargado) },
  effects: [
    { on: { act: ['pb-local', 'stop'] }, set: { motor: 'stopped' } },
    { on: { act: ['pb-local', 'start'] }, when: { state: ['ccm-p101', 'on'] }, set: { motor: 'running' } },
    { on: { act: ['ccm-p101', 'off'] }, set: { motor: 'stopped' } },
  ],
  phases: [
    { id: 'preparar', title: 'Preparación', order: 'any', steps: [
      { id: 'leer-ot', title: 'Leer la orden de trabajo', done: { state: ['ot', 'in', ['leido', 'firmado']] }, points: 1, targets: ['ot'],
        hint: 'La orden de trabajo está en el tablero de permisos, en la pared oeste.' },
      { id: 'firmar-permiso', title: 'Firmar el permiso de trabajo', done: { state: ['permiso', 'in', ['firmado', 'cerrado']] }, points: 5, targets: ['permiso'],
        hint: 'El permiso está junto a la orden de trabajo.' },
      { id: 'notificar', title: 'Notificar al operador que P-101 saldrá de servicio', done: notificado, points: 5, targets: ['operador'],
        hint: 'Habla con la operadora en la puerta del cuarto de control, o usa la radio desde la tableta (pestaña Lista).' },
      { id: 'tomar-equipo', title: 'Tomar 3 candados personales, una tarjeta y 2 cubre-volantes', points: 2, targets: ['candado-1'],
        done: { all: ['candado-1', 'candado-2', 'candado-3', 'tarjeta-1', 'cubre-1', 'cubre-2'].map((id) => ({ state: [id, '!=', 'sitio'] })) },
        hint: 'En la estación de bloqueo (pared oeste). Los candados ROJOS son personales; el amarillo no sirve.' },
    ]},
    { id: 'identificar', title: 'Identificar energías', order: 'any', steps: [
      { id: 'matriz-energias', title: 'Marcar todas las fuentes de energía en la matriz de la tableta', done: { complete: 'matriz' }, points: 8, targets: ['matriz'],
        hint: 'Tableta → pestaña Lista → Matriz de energías. Son seis: no olvides la energía almacenada, la térmica y la mecánica.' },
    ]},
    { id: 'aislar', title: 'Apagar y aislar', order: 'strict', steps: [
      { id: 'parar', title: 'Parar la bomba con el pulsador de parada local', done: { state: ['motor', 'stopped'] }, points: 5, targets: ['pb-local'],
        hint: 'Botonera amarilla junto a la bomba: botón rojo.' },
      { id: 'abrir-ccm', title: 'Abrir el interruptor de P-101 en el CCM-03', done: { state: ['ccm-p101', 'off'] }, points: 5, targets: ['ccm-p101'],
        hint: 'Cuarto eléctrico (puerta este). Lee el rótulo: solo el de P-101.' },
      { id: 'cerrar-descarga', title: 'Cerrar la válvula de descarga', done: { state: ['v-descarga', 'closed'] }, points: 5, targets: ['v-descarga'] },
      { id: 'cerrar-succion', title: 'Cerrar la válvula de succión', done: { state: ['v-succion', 'closed'] }, points: 5, targets: ['v-succion'] },
    ]},
    { id: 'bloquear', title: 'Bloquear y etiquetar', order: 'any', steps: [
      { id: 'bloquear-ccm', title: 'Poner candado personal y tarjeta en el interruptor de P-101', points: 8, targets: ['punto-p101'],
        done: { all: [{ state: ['punto-p101', 'has', 'candado-personal'] }, { state: ['punto-p101', 'has', 'tarjeta'] }] },
        hint: 'Con el candado en la mano, apunta al punto de bloqueo del interruptor y pulsa A (F en el PC). Igual con la tarjeta.' },
      { id: 'bloquear-succion', title: 'Cubre-volante y candado en la válvula de succión', points: 5, targets: ['punto-succion'],
        done: { all: [{ state: ['punto-succion', 'has', 'cubre-volante'] }, { state: ['punto-succion', 'has', 'candado-personal'] }] } },
      { id: 'bloquear-descarga', title: 'Cubre-volante y candado en la válvula de descarga', points: 5, targets: ['punto-descarga'],
        done: { all: [{ state: ['punto-descarga', 'has', 'cubre-volante'] }, { state: ['punto-descarga', 'has', 'candado-personal'] }] } },
    ]},
    { id: 'liberar', title: 'Liberar energía almacenada', order: 'strict', steps: [
      { id: 'abrir-purga', title: 'Abrir la purga hacia el drenaje', done: { state: ['v-purga', 'open'] }, points: 5, targets: ['v-purga'],
        hint: 'Válvula pequeña en la parte baja de la carcasa, sobre el balde.' },
      { id: 'leer-manometro', title: 'Leer el manómetro de carcasa: debe marcar 0 psig', done: { state: ['pi-carcasa', 0] }, points: 5, targets: ['pi-carcasa'] },
    ]},
    { id: 'verificar', title: 'Verificar energía cero', order: 'strict', steps: [
      { id: 'intentar-arrancar', title: 'Intentar arrancar en la botonera local (no debe arrancar)', on: { act: ['pb-local', 'start'] }, when: { state: ['motor', 'stopped'] }, points: 8, targets: ['pb-local'],
        hint: 'Botón verde de la botonera: la bomba NO debe arrancar.' },
      { id: 'devolver-parada', title: 'Devolver la botonera a parada', on: { act: ['pb-local', 'stop'] }, points: 2, targets: ['pb-local'] },
      { id: 'probar-medir-probar', title: 'Probador: probar en fuente conocida → medir bornera (0 V) → probar de nuevo', points: 8, targets: ['probador'],
        done: { any: [pmp('probador'), pmp('probador-2')] },
        hint: 'Carro de herramientas junto al motor. Si el probador no marca en la fuente conocida, está dañado: usa el de repuesto.' },
    ]},
    { id: 'trabajo', title: 'Trabajo', order: 'strict', steps: [
      { id: 'cambiar-sello', title: 'Retirar la guarda y cambiar el sello', done: { state: ['sello', 'nuevo'] }, points: 4, targets: ['guarda', 'sello'] },
    ]},
    { id: 'restaurar', title: 'Restaurar el servicio', order: 'strict', steps: [
      { id: 'reinstalar-guarda', title: 'Reinstalar la guarda del acople', done: { all: [{ state: ['guarda', 'instalada'] }, { state: ['sello', 'nuevo'] }] }, points: 1, targets: ['guarda'] },
      { id: 'avisar-energizar', title: 'Avisar al operador que se va a energizar', done: avisoEnergizar, points: 1, targets: ['operador'] },
      { id: 'retirar-candados', title: 'Retirar SOLO tus candados, tarjetas y cubre-volantes', points: 3, targets: ['punto-p101'],
        done: { all: ['punto-p101', 'punto-succion', 'punto-descarga'].flatMap((p) => [{ state: [p, 'lacks', 'candado-personal'] }, { state: [p, 'lacks', 'tarjeta'] }, { state: [p, 'lacks', 'cubre-volante'] }]) } },
      { id: 'restablecer', title: 'Cerrar la purga, abrir succión y descarga y cerrar el interruptor', points: 3, targets: ['v-purga'],
        done: { all: [{ state: ['v-purga', 'closed'] }, { state: ['v-succion', 'open'] }, { state: ['v-descarga', 'open'] }, { state: ['ccm-p101', 'on'] }] } },
      { id: 'cerrar-permiso', title: 'Cerrar el permiso de trabajo', done: { state: ['permiso', 'cerrado'] }, points: 1, targets: ['permiso'] },
    ]},
  ],
  errors: [
    { id: 'sin-permiso', on: { act: [['pb-local', 'stop'], [BREAKERS.map(([id]) => id), 'off'], [['v-succion', 'v-descarga'], 'close'], [ALL_POINTS, 'poner']] },
      when: { not: { state: ['permiso', 'in', ['firmado', 'cerrado']] } }, severity: 'mayor',
      message: 'Empezaste a aislar sin el permiso de trabajo firmado.', explain: 'Todo trabajo de mantenimiento requiere permiso firmado antes de empezar.' },
    { id: 'sin-notificar', on: { act: ['pb-local', 'stop'] }, when: { not: notificado }, severity: 'mayor',
      message: 'Paraste P-101 sin avisar al operador.', explain: 'Parar un equipo sin avisar afecta el proceso y a otras personas.' },
    { id: 'interruptor-bajo-carga', on: { act: ['ccm-p101', 'off'] }, when: { state: ['motor', 'running'] }, severity: 'mayor', effect: 'arco-electrico',
      message: 'Abriste el interruptor con el motor en marcha: arco en el CCM.', explain: 'Primero se para con el pulsador normal; el interruptor no es para parar bajo carga.' },
    { id: 'punto-equivocado', on: { act: [OTHER_POINTS, 'poner'] }, severity: 'mayor',
      message: 'Bloqueaste un interruptor que no es el de P-101.', explain: 'Lee el rótulo del CCM: un bloqueo en el equipo equivocado no protege a nadie.' },
    { id: 'equipo-equivocado', after: true, on: { act: ['pb-local', 'start'] }, when: { all: [{ state: ['motor', 'running'] }, { any: OTHER_BREAKERS.map((id) => ({ state: [id, 'off'] })) }] }, severity: 'mayor', effect: 'arranque-motor',
      message: 'La bomba arrancó al probar: abriste un interruptor equivocado.', explain: 'Por eso se verifica intentando arrancar: la verificación revela el aislamiento equivocado.' },
    { id: 'candado-prestado', on: { act: [ALL_POINTS, 'poner', 'candado-prestado'] }, severity: 'mayor',
      message: 'Usaste el candado amarillo «para prestar».', explain: 'El candado es personal: una persona, un candado, una llave.' },
    { id: 'tarjeta-sin-candado', on: { act: [ALL_POINTS, 'poner', 'tarjeta'] }, when: { state: ['$obj', 'lacks', 'candado-personal'] }, severity: 'mayor',
      message: 'Pusiste la tarjeta sin candado.', explain: 'La tarjeta informa, el candado impide. Primero el candado, luego la tarjeta.' },
    { id: 'probador-sin-verificar', on: { act: [['probador', 'probador-2'], 'medir', 'bornera'] }, when: { state: ['$obj', 'lacks', 'fuente:si'] }, severity: 'mayor',
      message: 'Mediste la bornera con un probador que no verificaste en una fuente conocida.', explain: 'Un probador dañado marca «sin tensión» aunque haya tensión: siempre probar–medir–probar.' },
    { id: 'purga-con-valvulas-abiertas', on: { act: ['v-purga', 'open'] }, when: { any: [{ state: ['v-succion', 'open'] }, { state: ['v-descarga', 'open'] }] },
      severity: 'critico', consequence: 'quemadura',
      message: 'Abriste la purga con la succión o la descarga abiertas: chorro de agua caliente a 60 °C.',
      explain: 'La purga libera la energía ATRAPADA; si la línea sigue conectada al proceso, sale el caudal del sistema.',
      should: 'Cerrar y bloquear succión y descarga antes de abrir la purga.' },
    { id: 'trabajo-sin-verificar', on: { act: [['sello', 'desmontar'], ['guarda', 'retirar']] }, when: { not: { phaseDone: 'verificar' } },
      severity: 'critico', consequence: 'arranque-inesperado',
      message: 'Interviniste el equipo sin verificar energía cero: la bomba arrancó.',
      explain: 'Siempre se prueba el arranque y se mide ausencia de tensión antes de tocar el equipo.',
      should: 'Intentar arrancar en la botonera y hacer probar–medir–probar con el probador.' },
    { id: 'trabajo-con-presion', on: { act: ['sello', 'desmontar'] }, when: { reading: ['presionCarcasa', '>', 0] },
      severity: 'critico', consequence: 'fuga-presion',
      message: 'Desmontaste el sello con presión en la carcasa: fuga de agua caliente a presión.',
      explain: 'La energía almacenada se libera y se verifica en el manómetro (0 psig) antes de abrir.',
      should: 'Abrir la purga y confirmar 0 psig en el manómetro.' },
    { id: 'retirar-candado-ajeno', on: { act: ['caja-grupal', 'quitar', 'candado-ajeno'] }, severity: 'critico', consequence: 'candado-ajeno',
      message: 'Retiraste el candado del electricista.',
      explain: 'Retirar el candado de otra persona puede matarla. Nunca. Solo su dueño lo retira.',
      should: 'Retirar únicamente tus propios candados y tarjetas.' },
    { id: 'energizar-sin-avisar', on: { act: ['ccm-p101', 'on'] }, when: { not: avisoEnergizar }, severity: 'mayor',
      message: 'Cerraste el interruptor sin avisar al operador.', explain: 'Antes de energizar se avisa a todos los involucrados y se confirma que nadie está en el equipo.' },
  ],
  debrief: [
    'Identifica TODAS las energías, no solo la eléctrica.',
    'Secuencia: preparar → avisar → apagar → aislar → bloquear/etiquetar → liberar energía almacenada → verificar → trabajar.',
    'Un candado = una persona = una llave. Nunca se retira el candado de otro.',
    'La verificación (intentar arrancar + probar–medir–probar) es la que te salva si aislaste lo equivocado.',
  ],
}
