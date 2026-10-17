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
