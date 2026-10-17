/* Guiones de camino feliz por escenario (los comparten la prueba de humo y las capturas). */
const MATRIZ = ['electrica', 'presion-succion', 'presion-descarga', 'almacenada', 'termica', 'mecanica']
export const LOTO = (tester = 'probador') => [
  ['ot', 'leer'], ['permiso', 'leer'], ['permiso', 'firmar'], ['radio', 'llamar', 'op-fuera'],
  ...['candado-1', 'candado-2', 'candado-3', 'tarjeta-1', 'cubre-1', 'cubre-2'].map((id) => [id, 'tomar']),
  ...MATRIZ.map((i) => ['matriz', 'marcar', i]),
  ['pb-local', 'stop'], ['ccm-p101', 'off'], ['v-descarga', 'close'], ['v-succion', 'close'],
  ['punto-p101', 'poner', 'candado-1'], ['punto-p101', 'poner', 'tarjeta-1'],
  ['punto-succion', 'poner', 'cubre-1'], ['punto-succion', 'poner', 'candado-2'],
  ['punto-descarga', 'poner', 'cubre-2'], ['punto-descarga', 'poner', 'candado-3'],
  ['v-purga', 'open'], ['pi-carcasa', 'leer'],
  ['pb-local', 'start'], ['pb-local', 'stop'], [tester, 'medir', 'fuente'], [tester, 'medir', 'bornera'], [tester, 'medir', 'fuente'],
  ['guarda', 'retirar'], ['sello', 'desmontar'], ['sello', 'montar'],
  ['guarda', 'instalar'], ['radio', 'llamar', 'op-energizar'],
  ['punto-p101', 'quitar', 'tarjeta-1'], ['punto-p101', 'quitar', 'candado-1'], ['punto-succion', 'quitar', 'candado-2'], ['punto-succion', 'quitar', 'cubre-1'],
  ['punto-descarga', 'quitar', 'candado-3'], ['punto-descarga', 'quitar', 'cubre-2'],
  ['v-purga', 'close'], ['v-succion', 'open'], ['v-descarga', 'open'], ['ccm-p101', 'on'], ['permiso', 'cerrar'],
]

/* Alturas: { tp: [x, z, yaw, y] } mueve al jugador (el motor lee su posición en cada tick) */
const PTS = ['correas', 'costuras', 'argollas', 'hebillas', 'etiqueta']
export const ALTURAS = (h) => [
  ['ats', 'marcar', 'caida-persona'], ['ats', 'marcar', 'caida-objetos'], ['ats', 'marcar', 'electrico'],
  ['permiso-alturas', 'leer'], ['permiso-alturas', 'firmar'],
  ['candado-alturas', 'tomar'], ['int-alumbrado', 'off'], ['punto-alumbrado', 'poner', 'candado-alturas'],
  ['barrera', 'colocar'],
  ...PTS.map((p) => [h, 'inspeccionar', p]), [h, 'poner'], [h, 'ajustar'],
  ['casco-ok', 'tomar'], ['eslinga-abs', 'tomar'], ['bolso', 'tomar'], ['amarres', 'tomar'],
  ['quiz-claridad', 'responder', 'apto'], ['jugador', 'mano', null],
  ['escalera', 'subir'], { tp: [-1.6, -1.6, 0, 6] },
  ['anclaje-cert', 'conectar'],
  { tp: [1.5, -3.6, 0, 6] }, ['luminaria', 'desmontar'], ['luminaria', 'instalar'],
  { tp: [-1.6, -1.6, Math.PI, 6] }, ['anclaje-cert', 'desconectar'],
  ['escalera', 'bajar'], { tp: [-2.5, -0.3, Math.PI, 0] },
  ['barrera', 'retirar'], ['punto-alumbrado', 'quitar', 'candado-alturas'], ['int-alumbrado', 'on'], ['permiso-alturas', 'cerrar'],
  ['quiz-rescate', 'responder', 'activar-rescate'],
]

/* Espacios confinados: { waitT: s } espera tiempo DEL MOTOR (lecturas estables, ventilación, alarma) */
const niveles = [['detector', 'medir', 'arriba'], { waitT: 2.4 }, ['detector', 'medir', 'medio'], { waitT: 2.4 }, ['detector', 'medir', 'fondo']]
export const CONFINADOS = () => [
  ...['deficiencia-o2', 'toxicos', 'inflamables', 'atrapamiento', 'energias', 'caidas'].map((i) => ['peligros', 'marcar', i]),
  ['supervisora', 'hablar', 'revisar-permiso'], ['permiso-entrada', 'leer'], ['permiso-entrada', 'firmar'], ['vigia', 'hablar', 'confirmar-roles'],
  ['v-entrada-1', 'close'], ['v-entrada-2', 'close'], ['brida', 'instalar'],
  ['detector', 'encender'], ['detector', 'bump'], { waitT: 2.4 }, ...niveles,
  ['llave-manhole', 'tomar'], ['manhole', 'abrir'], ['barrera-pozo', 'colocar'], ['ducto', 'instalar'], ['ventilador', 'on'],
  { waitT: 21 }, ...niveles,
  ['tripode', 'montar'], ['arnes-c', 'poner'], ['winche', 'conectar'], ['vigia', 'hablar', 'prueba-radio'], ['detector-personal', 'encender'],
  ['escalera-foso', 'bajar'], { tp: [-0.6, -2.7, -1.27, -3.5] }, ['valvula-foso', 'inspeccionar'],
  { waitFlag: 'alarma' }, ['escalera-foso', 'subir'], { tp: [0, -1.0, Math.PI, 0] }, ['vigia', 'hablar', 'aviso-salida'],
  ['ducto', 'retirar'], ['ventilador', 'off'], ['tripode', 'desmontar'], ['manhole', 'cerrar'], ['permiso-entrada', 'cerrar'],
  ['quiz-rescate-c', 'responder', 'rescate-afuera'],
]
