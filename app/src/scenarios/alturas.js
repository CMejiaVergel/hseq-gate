/*
 * Escenario 2 — Trabajo en alturas: cambio de luminaria en plataforma (docs/04).
 *
 * Referencias: Resolución 4272 de 2021 (Colombia, trabajo en alturas desde 2 m), ANSI/ASSP Z359,
 * OSHA 1926 Subpart M.  Valores numéricos en limits.js (// VALIDAR HSE).
 * DEBE VALIDARLO UN PROFESIONAL HSE antes de uso oficial.
 *
 * Situación: la luminaria de la plataforma de inspección del rack (6 m) está dañada.  Parte de la
 * plataforma tiene un tramo SIN baranda (en reparación) y la luminaria queda junto a ese borde.
 */
import { ALTURAS, claridadRequerida } from './limits.js'

const H = ALTURAS.alturaPlataforma
export const HARNESSES = ['arnes-1', 'arnes-2', 'arnes-3']
export const DISTRACTORS = ['anclaje-tubo', 'anclaje-baranda', 'anclaje-bandeja']
const ANCHORS = ['anclaje-cert', ...DISTRACTORS]
const POINTS = ['correas', 'costuras', 'argollas', 'hebillas', 'etiqueta']
export const SAFE_SPOT = { x: -1.6, z: -1.6, y: H, yaw: Math.PI }

const harness = (id, n, pos) => ({
  kind: 'harness', label: `Arnés de cuerpo completo #${n}`, pos, points: POINTS,
  pointLabels: { correas: 'Correas', costuras: 'Costuras', argollas: 'Argollas D', hebillas: 'Hebillas', etiqueta: 'Etiqueta / inspección' },
  defectIf: { variant: ['arnesDefectuoso', id] }, defectPointFrom: 'defecto',
  defectText: { costuras: 'Costura cortada en la correa de la pierna', argollas: 'Argolla D dorsal deformada', etiqueta: 'Etiqueta ilegible: inspección vencida' },
  text: 'Inspecciona los 5 puntos antes de ponértelo. Si encuentras un defecto, NO lo uses.',
})
const conectadoCert = { state: ['anclaje-cert', 'conectado'] }
const algunDistractor = { any: DISTRACTORS.map((a) => ({ state: [a, 'conectado'] })) }
const enBorde = { near: ['borde', ALTURAS.zonaBorde] }
const arnesMaloPuesto = { any: HARNESSES.map((h) => ({ all: [{ variant: ['arnesDefectuoso', h] }, { state: [h + '.puesto', true] }] })) }
const arnesBuenoListo = { any: HARNESSES.map((h) => ({ all: [{ state: [h + '.puesto', true] }, { count: [h + '.inspeccionado', '>=', POINTS.length] }, { not: { variant: ['arnesDefectuoso', h] } }] })) }
const algunArnesAjustado = { any: HARNESSES.map((h) => ({ state: [h + '.ajustado', true] })) }
const fmt = (v) => String(v).replace('.', ',')

export default {
  id: 'alturas-luminaria', version: 1,
  title: 'Trabajo en alturas — cambio de luminaria en plataforma',
  summary: 'Cambiar una luminaria a 6 m de altura junto a un tramo de plataforma sin baranda.',
  norms: ['Resolución 4272 de 2021', 'ANSI/ASSP Z359', 'OSHA 1926 Subpart M'],
  minutes: 14,
  warning: 'Incluye sensación de altura. Puedes salir en cualquier momento: botón Y (Tab) → Salir.',
  world: 'alturas',
  spawn: { x: 0, z: 6, yaw: 0 },
  objects: {
    /* planeación */
    'permiso-alturas': { kind: 'document', label: 'Permiso de trabajo en alturas', pos: [-4.9, 1.45, 4.0], closable: true,
      fields: [['Tarea', 'Cambio de luminaria L-07'], ['Altura', `${fmt(H)} m — plataforma del rack`], ['Condición', 'Tramo de 3 m sin baranda (en reparación)']],
      text: 'Requisitos: ATS diligenciado, área inferior acordonada, circuito de alumbrado bloqueado, EPP contra caídas inspeccionado, punto de anclaje certificado y plan de rescate.',
      signLabel: 'Firmar como ejecutante', closeLabel: 'Cerrar el permiso' },
    'ats': { kind: 'checklist', label: 'ATS — Análisis de trabajo seguro', tablet: true, tabletSub: 'Peligros de la tarea', cols: 1,
      text: 'Marca los peligros de ESTA tarea (y ninguno que no aplique).',
      items: [
        { id: 'caida-persona', label: 'Caída de persona a distinto nivel' },
        { id: 'caida-objetos', label: 'Caída de objetos / herramientas' },
        { id: 'electrico', label: 'Eléctrico — circuito de la luminaria' },
        { id: 'espacio-confinado', label: 'Atmósfera peligrosa en espacio confinado', correct: false },
        { id: 'quimico', label: 'Contacto con sustancias químicas', correct: false },
      ] },
    'int-alumbrado': { kind: 'breaker', label: 'Interruptor de alumbrado ALUM-07', initial: 'on', lockedBy: 'punto-alumbrado', pos: [5.4, 1.45, 3.0] },
    'punto-alumbrado': { kind: 'lockpoint', label: 'Punto de bloqueo ALUM-07', pos: [5.4, 1.25, 3.0] },
    'candado-alturas': { kind: 'item', label: 'Candado personal rojo', group: 'candado-personal', shape: 'candado', color: 'red', pos: [-6.4, 1.15, 0.2] },
    'barrera': { kind: 'barrier', label: 'Acordonamiento bajo la plataforma (conos y cinta)', pos: [4.0, 0.5, 0.4] },

    /* caseta de EPP */
    'arnes-1': harness('arnes-1', 1, [-6.7, 1.3, 1.6]),
    'arnes-2': harness('arnes-2', 2, [-6.7, 1.3, 2.3]),
    'arnes-3': harness('arnes-3', 3, [-6.7, 1.3, 3.0]),
    'casco-ok': { kind: 'item', label: 'Casco con barbuquejo', group: 'casco-barbuquejo', shape: 'casco', color: 'white', pos: [-6.4, 1.0, -0.8] },
    'casco-sin': { kind: 'item', label: 'Casco sin barbuquejo', group: 'casco-sin', shape: 'casco', color: 'yellow', pos: [-6.4, 1.0, -0.3] },
    'eslinga-abs': { kind: 'item', label: 'Eslinga con absorbedor de energía', group: 'eslinga-ok', shape: 'eslinga', color: 'orange', pos: [-6.4, 1.0, 0.8] },
    'eslinga-doble': { kind: 'item', label: 'Doble eslinga con absorbedor (desplazamientos)', group: 'eslinga-ok', shape: 'eslinga', color: 'blue', pos: [-6.4, 1.0, 1.3] },
    'eslinga-sin': { kind: 'item', label: 'Eslinga SIN absorbedor (de posicionamiento)', group: 'eslinga-sin-abs', shape: 'eslinga', color: 'black', pos: [-6.4, 1.0, 1.8] },
    'bolso': { kind: 'item', label: 'Bolso de herramientas', group: 'bolso', shape: 'bolso', pos: [-6.4, 1.0, 2.6] },
    'amarres': { kind: 'item', label: 'Amarres de herramienta (anti-caída)', group: 'amarre', shape: 'herramienta', color: 'yellow', pos: [-6.4, 1.0, 3.2] },
    'quiz-claridad': { kind: 'quiz', label: 'Cálculo de claridad de caída', tablet: true, tabletSub: '¿Es apto el anclaje para esta altura?',
      question: `¿La altura disponible bajo la plataforma (${fmt(H)} m) es suficiente para detener una caída con estos datos?`,
      data: [['Longitud de la eslinga', fmt(ALTURAS.longitudEslinga), 'm'], ['Elongación del absorbedor', fmt(ALTURAS.elongacionAbsorbedor), 'm'], ['Estatura bajo el anclaje', fmt(ALTURAS.estaturaBajoAnclaje), 'm'], ['Margen de seguridad', fmt(ALTURAS.margenSeguridad), 'm']],
      options: [
        { id: 'apto', label: `Sí: se requieren ≈ ${fmt(claridadRequerida())} m y hay ${fmt(H)} m`, correct: true },
        { id: 'no-apto', label: `No: se requieren más de ${fmt(H)} m` },
        { id: 'no-aplica', label: 'No hace falta calcularla si la eslinga tiene absorbedor' },
      ] },
    'quiz-rescate': { kind: 'quiz', label: 'Plan de rescate', tablet: true, tabletSub: 'Tu compañero quedó suspendido',
      question: 'Tu compañero cayó y quedó suspendido en el arnés, consciente pero sin poder subir. ¿Qué haces?',
      options: [
        { id: 'activar-rescate', label: 'Activar de inmediato el plan de rescate: la suspensión es una emergencia', correct: true },
        { id: 'subir-ayudar', label: 'Subir a ayudarlo sin equipo ni plan, para no perder tiempo' },
        { id: 'esperar', label: 'Esperar a que se recupere y suba solo' },
      ] },

    /* estructura */
    'escalera': { kind: 'ladder', label: 'Escalera vertical con jaula', initial: 'abajo', pos: [-2.5, 1, -0.6] },
    'anclaje-cert': { kind: 'anchor', label: `Punto de anclaje certificado (${ALTURAS.anclajeCertificado})`, certified: true, pos: [-0.5, H + 2.1, -2.6],
      requires: { conectar: { any: [{ has: 'eslinga-ok' }, { has: 'eslinga-sin-abs' }] } }, requiresText: { conectar: 'Necesitas una eslinga en el inventario' } },
    'anclaje-tubo': { kind: 'anchor', label: 'Tubería de 2"', pos: [1.0, H + 1.4, -1.2],
      requires: { conectar: { any: [{ has: 'eslinga-ok' }, { has: 'eslinga-sin-abs' }] } }, requiresText: { conectar: 'Necesitas una eslinga en el inventario' } },
    'anclaje-baranda': { kind: 'anchor', label: 'Baranda de la plataforma', pos: [-2.9, H + 1.07, -2.5],
      requires: { conectar: { any: [{ has: 'eslinga-ok' }, { has: 'eslinga-sin-abs' }] } }, requiresText: { conectar: 'Necesitas una eslinga en el inventario' } },
    'anclaje-bandeja': { kind: 'anchor', label: 'Bandeja portacables', pos: [2.4, H + 1.9, -1.6],
      requires: { conectar: { any: [{ has: 'eslinga-ok' }, { has: 'eslinga-sin-abs' }] } }, requiresText: { conectar: 'Necesitas una eslinga en el inventario' } },
    'borde': { kind: 'zone', label: 'Borde sin baranda', segment: [[0, -4], [3, -4]], y: H },
    'luminaria': { kind: 'task', label: 'Luminaria L-07 (dañada)', initial: 'danada', verbs: { desmontar: 'desmontada', instalar: 'nueva' },
      from: { desmontar: ['danada'], instalar: ['desmontada'] }, verbLabels: { desmontar: 'Desmontar la luminaria dañada', instalar: 'Instalar la luminaria nueva' },
      requires: { desmontar: { near: ['luminaria', ALTURAS.alcanceLuminaria + 0.6] }, instalar: { near: ['luminaria', ALTURAS.alcanceLuminaria + 0.6] } },
      requiresText: { desmontar: 'No alcanzas: acércate al borde (a menos de 1 m)', instalar: 'No alcanzas: acércate al borde (a menos de 1 m)' },
      pos: [1.5, H + 1.6, -4.6] },
    'companero': { kind: 'person', label: 'Compañero que pasa por debajo', pos: [1.5, 1.6, -5.6],
      options: [{ id: 'aviso', label: '«Voy a trabajar arriba: no pases por el área acordonada»', reply: 'Entendido, rodeo por el otro lado.' }] },
  },
  variants: (rng) => ({
    arnesDefectuoso: rng.pick(HARNESSES),
    defecto: rng.pick(['costuras', 'argollas', 'etiqueta']),
    caeHerramienta: rng.chance(0.5),
  }),
  phases: [
    { id: 'planear', title: 'Planear', order: 'any', steps: [
      { id: 'ats', title: 'Diligenciar el ATS en la tableta (peligros de la tarea)', done: { complete: 'ats' }, points: 7, targets: ['ats'],
        hint: 'Tableta → Lista → ATS. Son tres peligros: caída de persona, caída de objetos y eléctrico.' },
      { id: 'permiso', title: 'Firmar el permiso de trabajo en alturas', done: { state: ['permiso-alturas', 'in', ['firmado', 'cerrado']] }, points: 5, targets: ['permiso-alturas'],
        hint: 'Tablero junto a la caseta de EPP.' },
      { id: 'bloqueo-electrico', title: 'Bloquear el circuito de la luminaria (interruptor ALUM-07 + candado)', points: 6, targets: ['int-alumbrado'],
        done: { all: [{ state: ['int-alumbrado', 'off'] }, { state: ['punto-alumbrado', 'has', 'candado-personal'] }] },
        hint: 'Tablero de alumbrado al este: abre ALUM-07 y pon tu candado (está en la caseta de EPP).' },
      { id: 'acordonar', title: 'Acordonar el área bajo la plataforma', done: { state: ['barrera', 'colocada'] }, points: 6, targets: ['barrera'] },
    ]},
    { id: 'equipo', title: 'Equipo de protección', order: 'any', steps: [
      { id: 'arnes', title: 'Inspeccionar los arneses (5 puntos) y ponerse uno sin defectos', done: arnesBuenoListo, points: 12, targets: ['arnes-1', 'arnes-2', 'arnes-3'],
        hint: 'Caseta de EPP: abre cada arnés y revisa correas, costuras, argollas D, hebillas y etiqueta.' },
      { id: 'ajustar', title: 'Ajustar el arnés (pecho y piernas)', done: algunArnesAjustado, points: 5 },
      { id: 'casco', title: 'Ponerse el casco con barbuquejo', done: { has: 'casco-barbuquejo' }, points: 3, targets: ['casco-ok'] },
      { id: 'eslinga', title: 'Elegir la eslinga con absorbedor de energía', done: { has: 'eslinga-ok' }, points: 6, targets: ['eslinga-abs'] },
      { id: 'herramientas', title: 'Herramientas en el bolso, con amarres (manos libres para subir)', done: { all: [{ has: 'bolso' }, { has: 'amarre' }] }, points: 5, targets: ['bolso', 'amarres'] },
    ]},
    { id: 'calculo', title: 'Cálculo de claridad de caída', order: 'any', steps: [
      { id: 'claridad', title: 'Calcular la claridad de caída en la tableta', done: { state: ['quiz-claridad', 'apto'] }, points: 7, targets: ['quiz-claridad'],
        hint: 'Suma eslinga + elongación + estatura + margen y compárala con la altura disponible.' },
    ]},
    { id: 'acceso', title: 'Acceso', order: 'strict', steps: [
      { id: 'subir', title: 'Subir por la escalera con jaula, con las manos libres', done: { state: ['escalera', 'arriba'] }, points: 5, targets: ['escalera'],
        hint: 'Acércate al pie de la escalera y pulsa A (F en el PC). Lleva la mano libre (B / Q hasta «Mano libre»).' },
      { id: 'conectar', title: 'Antes de la zona de borde: conectar la eslinga al punto de anclaje certificado', done: { all: [conectadoCert, { state: ['escalera', 'arriba'] }] }, points: 12, targets: ['anclaje-cert'],
        hint: 'La placa amarilla del anclaje certificado está en la viga, sobre la plataforma.' },
    ]},
    { id: 'trabajo', title: 'Trabajo', order: 'strict', steps: [
      { id: 'luminaria', title: 'Cambiar la luminaria', done: { state: ['luminaria', 'nueva'] }, points: 6, targets: ['luminaria'],
        hint: 'Acércate al borde (estás conectado) y apunta a la luminaria: desmontar e instalar la nueva.' },
    ]},
    { id: 'cerrar', title: 'Bajar y cerrar', order: 'strict', steps: [
      { id: 'desconectar', title: 'Desconectarse solo en zona protegida (lejos del borde)', on: { act: ['anclaje-cert', 'desconectar'] }, when: { not: enBorde }, points: 2, targets: ['anclaje-cert'] },
      { id: 'bajar', title: 'Bajar por la escalera', done: { state: ['escalera', 'abajo'] }, points: 2, targets: ['escalera'] },
      { id: 'retirar-acordonamiento', title: 'Retirar el acordonamiento', done: { state: ['barrera', 'retirada'] }, points: 1, targets: ['barrera'] },
      { id: 'desbloquear', title: 'Retirar tu candado y cerrar el circuito de alumbrado', done: { all: [{ state: ['punto-alumbrado', 'lacks', 'candado-personal'] }, { state: ['int-alumbrado', 'on'] }] }, points: 2, targets: ['punto-alumbrado'] },
      { id: 'cerrar-permiso', title: 'Cerrar el permiso de trabajo en alturas', done: { state: ['permiso-alturas', 'cerrado'] }, points: 1, targets: ['permiso-alturas'] },
    ]},
    { id: 'rescate', title: 'Plan de rescate', order: 'any', steps: [
      { id: 'rescate', title: 'Pregunta de rescate: compañero suspendido en el arnés', done: { state: ['quiz-rescate', 'activar-rescate'] }, points: 7, targets: ['quiz-rescate'],
        hint: 'Tableta → Lista → Plan de rescate.' },
    ]},
  ],
  errors: [
    { id: 'borde-sin-conexion', on: 'tick', when: { all: [enBorde, { not: conectadoCert }, { not: algunDistractor }] }, severity: 'critico', consequence: 'caida',
      message: 'Entraste a la zona de borde sin estar conectado: caída de 6 m.',
      explain: 'Cerca de un borde sin protección se exige el 100 % de conexión a un anclaje certificado.',
      should: 'Conectar la eslinga con absorbedor al punto de anclaje certificado ANTES de acercarte al borde.', retry: { spawn: SAFE_SPOT } },
    { id: 'borde-anclaje-no-certificado', on: 'tick', when: { all: [enBorde, { not: conectadoCert }, algunDistractor] }, severity: 'critico', consequence: 'caida',
      message: 'Estabas conectado a un elemento que no es un anclaje: cedió y caíste.',
      explain: 'La tubería, la baranda o la bandeja no están diseñadas para detener una caída (se exige un anclaje certificado).',
      should: 'Conectarte solo al punto de anclaje certificado (placa amarilla).', retry: { spawn: SAFE_SPOT } },
    { id: 'borde-arnes-defectuoso', on: 'tick', when: { all: [enBorde, conectadoCert, arnesMaloPuesto] }, severity: 'critico', consequence: 'caida',
      message: 'Tu arnés tenía un defecto y se rompió al detener la caída.',
      explain: 'Un arnés con costuras cortadas, argollas deformadas o inspección vencida no garantiza la detención.',
      should: 'Inspeccionar los 5 puntos y descartar el arnés defectuoso.', retry: { spawn: SAFE_SPOT } },
    { id: 'anclaje-no-certificado', on: { act: [DISTRACTORS, 'conectar'] }, severity: 'mayor',
      message: 'Te conectaste a un elemento que no es un punto de anclaje certificado.', explain: 'La tubería no está diseñada para detener una caída.' },
    { id: 'arnes-defectuoso', on: { act: [HARNESSES, 'poner'] }, when: { variant: ['arnesDefectuoso', '$obj'] }, severity: 'mayor',
      message: 'Te pusiste el arnés que tiene un defecto.', explain: 'Todo arnés con defecto se retira de servicio. Inspecciónalo antes de usarlo.' },
    { id: 'eslinga-sin-absorbedor', on: { act: [ANCHORS, 'conectar'] }, when: { not: { has: 'eslinga-ok' } }, severity: 'mayor',
      message: 'Te conectaste con una eslinga sin absorbedor de energía.', explain: 'Para detención de caídas se usa eslinga con absorbedor; la de posicionamiento no limita la fuerza.' },
    { id: 'arnes-sin-ajustar', on: { act: ['escalera', 'subir'] }, when: { not: algunArnesAjustado }, severity: 'mayor',
      message: 'Subiste sin el arnés puesto y ajustado.', explain: 'Un arnés flojo puede soltarte o lesionarte en la detención.' },
    { id: 'subir-con-herramienta-en-mano', on: { act: ['escalera', 'subir'] }, when: { not: { hand: null } }, severity: 'mayor',
      message: 'Subiste con algo en la mano.', explain: 'Tres puntos de contacto: las manos libres. Las herramientas van en el bolso.' },
    { id: 'sin-permiso-alturas', on: { act: ['escalera', 'subir'] }, when: { not: { state: ['permiso-alturas', 'in', ['firmado', 'cerrado']] } }, severity: 'mayor',
      message: 'Subiste sin el permiso de trabajo en alturas firmado.', explain: 'Desde 2 m aplica la norma: permiso, ATS y EPP inspeccionado.' },
    { id: 'herramienta-cae', on: { act: ['luminaria', 'desmontar'] }, when: { all: [{ not: { state: ['barrera', 'colocada'] } }, { not: { has: 'amarre' } }, { variant: ['caeHerramienta', true] }] },
      severity: 'critico', consequence: 'objeto-cae',
      message: 'Se te cayó una herramienta y golpeó a tu compañero que pasaba por debajo.',
      explain: 'La caída de objetos también mata: se acordona el área inferior y las herramientas van amarradas.',
      should: 'Acordonar el área bajo la plataforma y usar amarres de herramienta.' },
    { id: 'sin-acordonar', on: { act: ['luminaria', 'desmontar'] }, when: { not: { state: ['barrera', 'colocada'] } }, severity: 'mayor',
      message: 'Empezaste a trabajar arriba sin acordonar el área inferior.', explain: 'Nadie debe pasar bajo un trabajo en alturas.' },
    { id: 'herramienta-sin-amarre', on: { act: ['luminaria', 'desmontar'] }, when: { not: { has: 'amarre' } }, severity: 'menor',
      message: 'Trabajaste con herramientas sin amarre.', explain: 'Una herramienta que cae desde 6 m puede ser mortal.' },
    { id: 'casco-sin-barbuquejo', on: { act: ['casco-sin', 'tomar'] }, severity: 'menor',
      message: 'Tomaste el casco sin barbuquejo.', explain: 'En alturas el casco debe tener barbuquejo: si caes, debe quedarse puesto.' },
    { id: 'sin-bloqueo-electrico', on: { act: ['luminaria', 'desmontar'] }, when: { state: ['int-alumbrado', 'on'] }, severity: 'mayor', effect: 'arco-electrico',
      message: 'Desmontaste la luminaria energizada: chispa.', explain: 'Antes de intervenir un circuito se abre y se bloquea su interruptor.' },
    { id: 'rescate-incorrecto', on: { act: ['quiz-rescate', 'responder', ['subir-ayudar', 'esperar']] }, severity: 'mayor',
      message: 'Respuesta incorrecta en el plan de rescate.', explain: 'La suspensión prolongada en el arnés es una emergencia: se activa el plan de rescate de inmediato y nadie sube sin equipo.' },
    { id: 'claridad-incorrecta', on: { act: ['quiz-claridad', 'responder', ['no-apto', 'no-aplica']] }, severity: 'menor',
      message: 'Cálculo de claridad de caída incorrecto.', explain: `Claridad requerida = eslinga + elongación + estatura + margen ≈ ${fmt(claridadRequerida())} m, menor que los ${fmt(H)} m disponibles.` },
  ],
  debrief: [
    'Desde 2 m de altura aplica la norma: permiso, ATS y EPP inspeccionado.',
    '100 % de conexión: siempre conectado a un anclaje certificado cuando hay riesgo de caída.',
    'Calcula la claridad de caída: un arnés que deja golpear el suelo no sirve.',
    'Acordona abajo y amarra las herramientas: la caída de objetos también mata.',
    'Ten plan de rescate: la suspensión prolongada en el arnés es una emergencia.',
  ],
}
