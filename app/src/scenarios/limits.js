/*
 * Umbrales, datos técnicos y puntaje de TODOS los escenarios en un solo archivo, para que un
 * asesor HSE los revise y ajuste sin tocar el motor ni los escenarios.
 *
 * Todo lo marcado  // VALIDAR HSE  sale de docs/03–05 y docs/07 y debe confirmarlo un profesional
 * HSE antes de usar el simulador como formación oficial.  Los valores marcados  // dato del
 * escenario  describen la situación simulada (no son normativos).
 */

/* ---------- puntaje (docs/07) ---------- */
export const SCORING = {
  menor: 2,          // penalización por error menor                         // VALIDAR HSE
  mayor: 10,         // penalización por error mayor                         // VALIDAR HSE
  hint: 3,           // pista usada en práctica (una vez por paso)            // VALIDAR HSE
  retry: 10,         // reintento tras un error crítico (aprendizaje/práctica) // VALIDAR HSE
  pass: 80,          // puntaje mínimo para aprobar (modo evaluación, 0 críticos) // VALIDAR HSE
}

/* ---------- LOTO — bomba P-101 (docs/03) ---------- */
export const LOTO = {
  presionCarcasa: 45,     // psig con la bomba aislada pero sin purgar             // dato del escenario
  temperatura: 60,        // °C del agua de proceso                                // dato del escenario
  tensionMotor: 440,      // V entre fases en la bornera del motor energizado      // dato del escenario
  umbralProbador: 30,     // V: por encima el probador indica presencia de tensión // VALIDAR HSE
  probabilidadProbadorDescargado: 0.5,   // práctica/evaluación                   // dato del escenario
}

/* ---------- Trabajo en alturas (docs/04) ---------- */
export const ALTURAS = {
  alturaNorma: 2.0,           // m: desde aquí aplica la norma (Res. 4272 de 2021)      // VALIDAR HSE
  alturaPlataforma: 6.0,      // m                                                       // dato del escenario
  longitudEslinga: 1.8,       // m                                                       // VALIDAR HSE
  elongacionAbsorbedor: 1.07, // m                                                       // VALIDAR HSE
  estaturaBajoAnclaje: 1.5,   // m (distancia del anillo D a los pies, aprox.)           // VALIDAR HSE
  margenSeguridad: 0.6,       // m                                                       // VALIDAR HSE
  zonaBorde: 1.5,             // m: distancia al borde sin baranda que exige conexión    // VALIDAR HSE
  alcanceLuminaria: 1.0,      // m: la luminaria solo se alcanza a menos de esto del borde // dato del escenario
  anclajeCertificado: '5.000 lb / 22,2 kN',                                              // VALIDAR HSE
}
/** claridad de caída requerida (m): eslinga + elongación + estatura + margen */
export const claridadRequerida = () => +(ALTURAS.longitudEslinga + ALTURAS.elongacionAbsorbedor + ALTURAS.estaturaBajoAnclaje + ALTURAS.margenSeguridad).toFixed(2)

/* ---------- Espacios confinados (docs/05) ---------- */
export const ATMOSFERA = {
  o2Min: 19.5,     // % vol                         // VALIDAR HSE
  o2Max: 23.5,     // % vol                         // VALIDAR HSE
  lelMax: 10,      // % LEL                         // VALIDAR HSE
  h2sMax: 1,       // ppm                           // VALIDAR HSE
  coMax: 25,       // ppm                           // VALIDAR HSE
}
export const CONFINADOS = {
  segundosPorMinuto: 5,     // tiempo comprimido: 1 min simulado = 5 s reales    // dato del escenario
  minutosVentilacion: 4,    // minutos simulados de ventilación hasta aire limpio // dato del escenario
  salidaTrasAlarma: 5,      // s: seguir dentro más de esto tras la alarma = crítico // VALIDAR HSE
  lecturaEstable: 2,        // s reales: esperar entre niveles para una lectura estable // dato del escenario
  fugaH2S: { medio: 6, fondo: 18 },   // ppm durante el evento de alarma (válvula que pasa) // dato del escenario
  profundidad: 3.5,         // m                                                  // dato del escenario
  niveles: { arriba: 0.5, medio: 1.8, fondo: 3.2 },   // m bajo la tapa           // dato del escenario
  /* atmósfera inicial por nivel (antes de ventilar) */                          // dato del escenario
  inicial: {
    arriba: { o2: 20.9, lel: 0, h2s: 0, co: 0 },
    medio: { o2: 20.1, lel: 2, h2s: 3, co: 4 },
    fondo: { o2: 18.4, lel: 6, h2s: 14, co: 8 },
  },
  aireLimpio: { o2: 20.9, lel: 0, h2s: 0, co: 0 },
}
