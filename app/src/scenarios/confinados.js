/*
 * Escenario 3 — Espacios confinados: ingreso a la cámara subterránea de válvulas CV-07 (docs/05).
 *
 * Referencias: Resolución 0491 de 2020 (Colombia), OSHA 29 CFR 1910.146, ANSI/ASSP Z117.1.
 * Umbrales atmosféricos en limits.js (// VALIDAR HSE).  DEBE VALIDARLO UN PROFESIONAL HSE.
 *
 * Situación: inspeccionar una válvula dentro de un foso de 3,5 m (manhole de 24" y escalera fija).
 * El aprendiz es el ENTRANTE; Andrés es el VIGÍA y Laura la SUPERVISORA de entrada.
 * Foso (entrada vertical): enseña que los gases pesados (H₂S) se acumulan abajo.
 */
import { ATMOSFERA, CONFINADOS } from './limits.js'

const LEVELS = ['arriba', 'medio', 'fondo']
const GASES = ['o2', 'lel', 'h2s', 'co']
const LIMITS = { o2: [ATMOSFERA.o2Min, ATMOSFERA.o2Max], lel: ATMOSFERA.lelMax, h2s: ATMOSFERA.h2sMax, co: ATMOSFERA.coMax }
const okAtm = (a) => a.o2 >= ATMOSFERA.o2Min && a.o2 <= ATMOSFERA.o2Max && a.lel < ATMOSFERA.lelMax && a.h2s < ATMOSFERA.h2sMax && a.co < ATMOSFERA.coMax
const r1 = (v) => Math.round(v * 10) / 10

/** atmósfera de la cámara por nivel: se limpia con la ventilación (tiempo comprimido) y empeora con la fuga de la alarma */
export function atmosfera(timers, flags) {
  const k = Math.min(1, (timers.ventilacion || 0) / (CONFINADOS.minutosVentilacion * CONFINADOS.segundosPorMinuto))
  const out = {}
  for (const lv of LEVELS) {
    const a = {}
    for (const g of GASES) a[g] = r1(CONFINADOS.inicial[lv][g] + (CONFINADOS.aireLimpio[g] - CONFINADOS.inicial[lv][g]) * k)
    if (flags.has('alarma') && CONFINADOS.fugaH2S[lv]) a.h2s = CONFINADOS.fugaH2S[lv]
    out[lv] = a
  }
  return out
}

const vigiaListo = { all: [{ state: ['vigia', 'has', 'confirmar-roles'] }, { state: ['vigia', 'has', 'prueba-radio'] }] }
const dentro = { state: ['escalera-foso', 'abajo'] }

export default {
  id: 'confinados-camara', version: 1,
  title: 'Espacios confinados — ingreso a la cámara de válvulas CV-07',
  summary: 'Entrar a un foso de 3,5 m para inspeccionar una válvula: permiso, roles, aislamiento, medición, ventilación y rescate.',
  norms: ['Resolución 0491 de 2020', 'OSHA 29 CFR 1910.146', 'ANSI/ASSP Z117.1'],
  minutes: 15,
  warning: 'Incluye un espacio oscuro y estrecho. Puedes salir en cualquier momento: botón Y (Tab) → Salir.',
  world: 'confinados',
  spawn: { x: 0, z: 4.5, yaw: 0 },
  objects: {
    /* planeación */
    'peligros': { kind: 'checklist', label: 'Identificación de peligros', tablet: true, tabletSub: 'Peligros del espacio confinado', cols: 1,
      text: 'Marca los peligros de ESTE ingreso (y ninguno que no aplique).',
      items: [
        { id: 'deficiencia-o2', label: 'Atmósfera con deficiencia de oxígeno' },
        { id: 'toxicos', label: 'Gases tóxicos (H₂S, CO)' },
        { id: 'inflamables', label: 'Atmósfera inflamable (LEL)' },
        { id: 'atrapamiento', label: 'Atrapamiento / engullimiento' },
        { id: 'energias', label: 'Energías de la línea que entra a la cámara' },
        { id: 'caidas', label: 'Caída al bajar por la escalera' },
        { id: 'radiacion', label: 'Radiación ionizante', correct: false },
        { id: 'ruido', label: 'Ruido de impacto', correct: false },
      ] },
    'permiso-entrada': { kind: 'document', label: 'Permiso de entrada a espacio confinado', pos: [-3.6, 1.45, 2.0], closable: true,
      fields: [['Espacio', 'Cámara de válvulas CV-07 (foso 3,5 m)'], ['Entrante', 'Tú'], ['Vigía', 'Andrés'], ['Supervisora', 'Laura']],
      text: 'Requisitos: aislamiento de la línea, medición previa en 3 niveles, ventilación, medición continua, vigía permanente, equipo de rescate montado.',
      signLabel: 'Firmar como entrante', closeLabel: 'Cerrar el permiso' },
    'supervisora': { kind: 'person', label: 'Laura · supervisora de entrada', pos: [-3.6, 1.6, 3.2],
      options: [
        { id: 'revisar-permiso', label: '«Laura, revisemos juntos el permiso de entrada»', reply: 'Revisado: aislamiento, medición, ventilación, vigía y rescate. Fírmalo y empezamos.' },
        { id: 'cerrar', label: '«Terminamos: el espacio queda cerrado»', reply: 'Gracias. Cierra el permiso en el tablero.' },
      ] },
    'vigia': { kind: 'person', label: 'Andrés · vigía', pos: [-1.3, 1.6, -0.9],
      text: 'El vigía permanece afuera todo el tiempo.',
      options: [
        { id: 'confirmar-roles', label: '«Andrés, eres el vigía: no entras, me vigilas y activas el rescate»', reply: 'Confirmado: no entro, mantengo contacto contigo y activo el rescate si hace falta.' },
        { id: 'prueba-radio', label: '«Prueba de radio: ¿me copias?»', reply: 'Te copio fuerte y claro.' },
        { id: 'aviso-salida', label: '«¡Alarma del detector! Salgo de inmediato»', reply: '¡Sal ya! Te tengo con el winche.' },
      ] },
    /* aislamiento */
    'v-entrada-1': { kind: 'valve', label: 'Válvula de bloqueo V-71 (línea a la cámara)', initial: 'open', pos: [3.5, 1.15, -2.4] },
    'v-entrada-2': { kind: 'valve', label: 'Válvula de bloqueo V-72 (línea a la cámara)', initial: 'open', pos: [3.5, 1.15, -1.0] },
    'brida': { kind: 'task', label: 'Brida ciega', initial: 'retirada', verbs: { instalar: 'instalada', retirar: 'retirada' },
      verbLabels: { instalar: 'Instalar la brida ciega', retirar: 'Retirar la brida ciega' },
      requires: { instalar: { all: [{ state: ['v-entrada-1', 'closed'] }, { state: ['v-entrada-2', 'closed'] }] } }, requiresText: { instalar: 'Primero cierra las dos válvulas de bloqueo' },
      pos: [3.5, 0.8, -1.7] },
    /* medición */
    'detector': { kind: 'gasdetector', label: 'Detector multigás con sonda', reading: 'atmosfera', levels: LEVELS, limits: LIMITS, pos: [1.0, 0.75, -1.1],
      levelLabels: { arriba: 'arriba (0,5 m)', medio: 'medio (1,8 m)', fondo: 'fondo (3,2 m)' } },
    'detector-personal': { kind: 'gasdetector', label: 'Detector personal (monitoreo continuo)', reading: 'atmosfera', levels: [], limits: LIMITS, pos: [-2.8, 0.95, -0.4] },
    /* ventilación, acceso y rescate */
    'llave-manhole': { kind: 'item', label: 'Llave para tapa de manhole', group: 'llave-tapa', shape: 'llave', pos: [-2.8, 0.95, -1.2] },
    'barra': { kind: 'item', label: 'Barra de acero (palanca improvisada)', group: 'barra', shape: 'herramienta', color: 'gray', pos: [-2.8, 0.95, -1.7] },
    'manhole': { kind: 'door', label: 'Tapa del manhole (24")', initial: 'cerrada', pos: [0, 0.1, -2],
      requires: { abrir: { has: 'llave-tapa' } }, requiresText: { abrir: 'Necesitas la llave de tapa de manhole' } },
    'barrera-pozo': { kind: 'barrier', label: 'Acordonamiento del manhole', pos: [2.2, 0.5, 0.3] },
    'ducto': { kind: 'task', label: 'Ducto flexible del ventilador', initial: 'retirado', verbs: { instalar: 'instalado', retirar: 'retirado' },
      verbLabels: { instalar: 'Bajar el ducto hasta el fondo', retirar: 'Retirar el ducto' },
      requires: { instalar: { state: ['manhole', 'abierta'] } }, requiresText: { instalar: 'Primero abre el manhole' }, pos: [1.9, 0.5, -0.5] },
    'ventilador': { kind: 'fan', label: 'Ventilador / extractor', initial: 'off', pos: [2.2, 0.5, -0.4] },
    'tripode': { kind: 'task', label: 'Trípode con winche de rescate', initial: 'plegado', verbs: { montar: 'montado', desmontar: 'plegado' },
      verbLabels: { montar: 'Montar el trípode sobre el manhole', desmontar: 'Desmontar y plegar el trípode' },
      requires: { montar: { state: ['manhole', 'abierta'] } }, requiresText: { montar: 'Primero abre el manhole' }, pos: [-1.6, 0.6, 0.4] },
    'arnes-c': { kind: 'harness', label: 'Arnés de rescate (cuerpo completo)', points: ['correas', 'costuras', 'argollas', 'hebillas', 'etiqueta'], pos: [-2.8, 1.2, 0.3],
      text: 'Arnés en buen estado, para conectarse a la línea del winche.' },
    'winche': { kind: 'anchor', label: 'Línea del winche (rescate)', pos: [0, 1.6, -2],
      requires: { conectar: { all: [{ state: ['tripode', 'montado'] }, { state: ['arnes-c.puesto', true] }] } }, requiresText: { conectar: 'Necesitas el trípode montado y el arnés puesto' } },
    'escalera-foso': { kind: 'ladder', label: 'Escalera fija del foso', initial: 'arriba', pos: [0, 0.5, -1.4] },
    'valvula-foso': { kind: 'task', label: 'Válvula a inspeccionar (dentro del foso)', initial: 'pendiente', verbs: { inspeccionar: 'inspeccionada' },
      verbLabels: { inspeccionar: 'Inspeccionar la válvula' }, requires: { inspeccionar: dentro }, requiresText: { inspeccionar: 'La válvula está dentro del foso' }, pos: [0.7, -2.6, -3.0] },
    'quiz-rescate-c': { kind: 'quiz', label: 'Rescate en espacio confinado', tablet: true, tabletSub: 'Tu compañero colapsó adentro',
      question: 'Durante otro ingreso, tu compañero colapsó dentro del foso. ¿Qué haces?',
      options: [
        { id: 'rescate-afuera', label: 'Activar la emergencia y rescatarlo con el winche desde afuera; nadie entra sin equipo de respiración', correct: true },
        { id: 'bajar-ayudar', label: 'Bajar de inmediato a ayudarlo' },
        { id: 'esperar', label: 'Esperar a que se recupere' },
      ] },
  },
  readings: {
    atmosfera: (s, c) => atmosfera(c.timers, c.flags),
    atmosferaApta: (s, c) => { const a = atmosfera(c.timers, c.flags); return LEVELS.every((l) => okAtm(a[l])) ? 1 : 0 },
  },
  timers: {
    ventilacion: { while: { all: [{ state: ['ventilador', 'on'] }, { state: ['ducto', 'instalado'] }] } },
    alarmaDentro: { while: { all: [{ flag: 'alarma' }, dentro] }, reset: true },
  },
  variants: (rng, mode) => ({ alarmaDelay: mode === 'aprendizaje' ? 3 : 2 + rng.int(5) }),
  triggers: [
    { id: 'alarma', when: { stepDone: 'inspeccionar' }, delayFrom: 'alarmaDelay', delay: 3, flag: 'alarma', sound: 'alarma',
      message: '¡ALARMA del detector personal! H₂S alto: sal de inmediato y avisa al vigía.' },
  ],
  phases: [
    { id: 'planear', title: 'Planear', order: 'any', steps: [
      { id: 'peligros', title: 'Identificar los peligros en la tableta', done: { complete: 'peligros' }, points: 6, targets: ['peligros'],
        hint: 'Tableta → Lista → Identificación de peligros: atmósfera (O₂, tóxicos, inflamables), atrapamiento, energías de la línea y caídas.' },
      { id: 'permiso', title: 'Revisar el permiso con la supervisora y firmarlo', points: 5, targets: ['supervisora', 'permiso-entrada'],
        done: { all: [{ state: ['supervisora', 'has', 'revisar-permiso'] }, { state: ['permiso-entrada', 'in', ['firmado', 'cerrado']] }] },
        hint: 'Habla con Laura junto al tablero y luego firma el permiso.' },
      { id: 'roles', title: 'Confirmar roles: el vigía está presente y no entra', done: { state: ['vigia', 'has', 'confirmar-roles'] }, points: 4, targets: ['vigia'] },
    ]},
    { id: 'aislar', title: 'Aislar la línea', order: 'strict', steps: [
      { id: 'cerrar-valvulas', title: 'Cerrar las válvulas de la línea que entra a la cámara', done: { all: [{ state: ['v-entrada-1', 'closed'] }, { state: ['v-entrada-2', 'closed'] }] }, points: 5, targets: ['v-entrada-1', 'v-entrada-2'],
        hint: 'Las dos válvulas de bloqueo están en la línea, al este del manhole.' },
      { id: 'brida', title: 'Instalar la brida ciega', done: { state: ['brida', 'instalada'] }, points: 6, targets: ['brida'] },
    ]},
    { id: 'medir', title: 'Medir antes de entrar', order: 'strict', steps: [
      { id: 'bump', title: 'Encender el detector y hacer la prueba de respuesta (bump test)', done: { all: [{ state: ['detector.on', true] }, { state: ['detector.bump', true] }] }, points: 5, targets: ['detector'] },
      { id: 'medir-niveles', title: 'Medir con la sonda desde afuera: arriba → medio → fondo', done: { sequence: ['detector.hist', LEVELS] }, points: 9, targets: ['detector'],
        hint: 'En el panel del detector: Medir arriba, luego medio, luego fondo, esperando unos segundos en cada nivel.' },
    ]},
    { id: 'ventilar', title: 'Ventilar', order: 'strict', steps: [
      { id: 'abrir-manhole', title: 'Abrir el manhole con la herramienta correcta y acordonar', done: { all: [{ state: ['manhole', 'abierta'] }, { state: ['barrera-pozo', 'colocada'] }] }, points: 3, targets: ['manhole', 'barrera-pozo'],
        hint: 'Toma la llave de tapa de la mesa de herramientas.' },
      { id: 'ventilar', title: 'Bajar el ducto del ventilador hasta el fondo y encenderlo', done: { all: [{ state: ['ducto', 'instalado'] }, { state: ['ventilador', 'on'] }] }, points: 5, targets: ['ducto', 'ventilador'] },
      { id: 'remedir', title: 'Esperar y volver a medir los 3 niveles hasta valores aceptables', points: 8, targets: ['detector'],
        done: { all: [{ count: ['detector.hist', '>=', 6] }, ...LEVELS.map((l) => ({ state: [`detector.lecturas.${l}.ok`, true] }))] },
        hint: `Cada minuto simulado dura ${CONFINADOS.segundosPorMinuto} s. Vuelve a medir arriba, medio y fondo hasta que todo esté en rango.` },
    ]},
    { id: 'preparar-rescate', title: 'Preparar el rescate', order: 'any', steps: [
      { id: 'tripode', title: 'Montar el trípode y el winche sobre el manhole', done: { state: ['tripode', 'montado'] }, points: 5, targets: ['tripode'] },
      { id: 'linea', title: 'Ponerse el arnés y conectarlo a la línea del winche', done: { all: [{ state: ['arnes-c.puesto', true] }, { state: ['winche', 'conectado'] }] }, points: 5, targets: ['arnes-c', 'winche'] },
      { id: 'radio', title: 'Prueba de radio con el vigía', done: { state: ['vigia', 'has', 'prueba-radio'] }, points: 4, targets: ['vigia'] },
      { id: 'detector-personal', title: 'Llevar el detector personal encendido', done: { state: ['detector-personal.on', true] }, points: 4, targets: ['detector-personal'] },
    ]},
    { id: 'entrar', title: 'Entrar y trabajar', order: 'strict', steps: [
      { id: 'inspeccionar', title: 'Bajar por la escalera e inspeccionar la válvula', done: { state: ['valvula-foso', 'inspeccionada'] }, points: 6, targets: ['escalera-foso', 'valvula-foso'],
        hint: 'Acércate a la escalera del manhole y pulsa A (F en el PC).' },
      { id: 'salir-alarma', title: 'Ante la alarma del detector: salir de inmediato y avisar al vigía', points: 10, targets: ['escalera-foso', 'vigia'],
        done: { all: [{ flag: 'alarma' }, { state: ['escalera-foso', 'arriba'] }, { state: ['vigia', 'has', 'aviso-salida'] }] } },
    ]},
    { id: 'cierre', title: 'Cierre', order: 'strict', steps: [
      { id: 'retirar-equipos', title: 'Retirar el ducto, apagar el ventilador y plegar el trípode', points: 2, targets: ['ducto', 'tripode'],
        done: { all: [{ state: ['ducto', 'retirado'] }, { state: ['ventilador', 'off'] }, { state: ['tripode', 'plegado'] }, { flag: 'alarma' }] } },
      { id: 'cerrar-manhole', title: 'Cerrar el manhole', done: { all: [{ state: ['manhole', 'cerrada'] }, { flag: 'alarma' }] }, points: 1, targets: ['manhole'] },
      { id: 'cerrar-permiso', title: 'Cerrar el permiso de entrada', done: { state: ['permiso-entrada', 'cerrado'] }, points: 2, targets: ['permiso-entrada'] },
    ]},
    { id: 'rescate', title: 'Rescate', order: 'any', steps: [
      { id: 'quiz-rescate', title: 'Pregunta de rescate: compañero colapsado adentro', done: { state: ['quiz-rescate-c', 'rescate-afuera'] }, points: 5, targets: ['quiz-rescate-c'],
        hint: 'Tableta → Lista → Rescate en espacio confinado.' },
    ]},
  ],
  errors: [
    /* los mayores del ingreso van primero: se registran aunque un crítico cancele la bajada */
    { id: 'sin-aislar', on: { act: ['escalera-foso', 'bajar'] }, when: { not: { state: ['brida', 'instalada'] } }, severity: 'mayor',
      message: 'Entraste con la línea sin aislar.', explain: 'Una válvula que pasa puede inundar la cámara o llenarla de gas: se aísla con brida ciega o bloqueo.' },
    { id: 'entrar-sin-linea-de-vida', on: { act: ['escalera-foso', 'bajar'] }, when: { not: { state: ['winche', 'conectado'] } }, severity: 'mayor',
      message: 'Entraste sin estar conectado a la línea del winche.', explain: 'La línea de vida permite rescatarte desde afuera sin que nadie entre.' },
    { id: 'entrar-sin-medir', on: { act: ['escalera-foso', 'bajar'] }, when: { not: { phaseDone: 'medir' } }, severity: 'critico', consequence: 'desvanecimiento',
      message: 'Bajaste sin medir la atmósfera: te desvaneciste por falta de oxígeno y H₂S.',
      explain: 'Un espacio confinado se trata como peligroso hasta demostrar lo contrario: se mide antes de entrar, en varios niveles.',
      should: 'Hacer bump test y medir arriba, medio y fondo desde afuera; ventilar y volver a medir.' },
    { id: 'entrar-fuera-de-rango', on: { act: ['escalera-foso', 'bajar'] }, when: { reading: ['atmosferaApta', '==', 0] }, severity: 'critico', consequence: 'desvanecimiento',
      message: 'Bajaste con la atmósfera fuera de rango: intoxicación por H₂S / asfixia.',
      explain: `Para entrar: O₂ entre ${ATMOSFERA.o2Min} y ${ATMOSFERA.o2Max} %, LEL < ${ATMOSFERA.lelMax} %, H₂S < ${ATMOSFERA.h2sMax} ppm, CO < ${ATMOSFERA.coMax} ppm.`,
      should: 'Ventilar y volver a medir los 3 niveles hasta que todos estén en rango.' },
    { id: 'entrar-sin-vigia', on: { act: ['escalera-foso', 'bajar'] }, when: { not: vigiaListo }, severity: 'critico', consequence: 'desvanecimiento',
      message: 'Entraste sin vigía confirmado ni prueba de radio.', explain: 'Nadie sabría que estás en problemas: el vigía y la comunicación son obligatorios.',
      should: 'Confirmar roles con el vigía y hacer la prueba de radio antes de entrar.' },
    { id: 'ignorar-alarma', on: 'tick', when: { timer: ['alarmaDentro', '>', CONFINADOS.salidaTrasAlarma] }, severity: 'critico', consequence: 'desvanecimiento',
      message: 'Seguiste dentro después de la alarma: te desvaneciste.', explain: 'Monitoreo continuo: si suena el detector, sales. Sin discusión.',
      should: 'Salir de inmediato por la escalera y avisar al vigía.', retry: { spawn: { x: 0, z: -0.8, y: 0, yaw: Math.PI }, set: { 'escalera-foso': 'arriba' } } },
    { id: 'sin-bump-test', on: { act: ['detector', 'medir'] }, when: { not: { state: ['detector.bump', true] } }, severity: 'mayor',
      message: 'Mediste sin hacer la prueba de respuesta (bump test).', explain: 'Un detector sin bump test puede no reaccionar al gas.' },
    { id: 'no-esperar-lectura', on: { act: ['detector', 'medir'] }, when: { elapsed: ['detector.lastT', '<', CONFINADOS.lecturaEstable] }, severity: 'menor',
      message: 'Cambiaste de nivel antes de que la lectura se estabilizara.', explain: 'La sonda necesita unos segundos en cada nivel para dar una lectura confiable.' },
    { id: 'medir-solo-arriba', on: { act: ['manhole', 'abrir'] }, when: { not: { state: ['detector.lecturas.fondo.t', '>=', 0] } }, severity: 'mayor',
      message: 'Diste la medición por buena sin medir el fondo.', explain: 'El H₂S es más pesado que el aire: se acumula abajo.' },
    { id: 'rescate-entrando', on: { act: ['quiz-rescate-c', 'responder', 'bajar-ayudar'] }, severity: 'critico', consequence: 'desvanecimiento',
      message: 'Elegiste bajar a ayudarlo: serías la segunda víctima.', explain: 'La mayoría de víctimas en espacios confinados son rescatistas improvisados.',
      should: 'Activar la emergencia y rescatar con el winche desde afuera; solo entra personal con equipo de respiración.' },
  ],
  debrief: [
    'Un espacio confinado se trata como peligroso hasta demostrar lo contrario: permiso, roles y aislamiento.',
    'Mide antes de entrar, en varios niveles (O₂ → inflamables → tóxicos), ventila y vuelve a medir.',
    'Monitoreo continuo: si suena el detector, sales. Sin discusión.',
    'El vigía nunca entra; el rescate se hace desde afuera con el equipo previsto.',
  ],
}
