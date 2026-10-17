import { FX } from '../../scene/ScreenFx.jsx'
import { PLAYER } from '../../walk/walk.js'
import { haptic } from '../../scene/interact.js'
import * as S from './sound.js'

/*
 * Efectos de consecuencia de los errores críticos (docs/06), ligeros y confortables:
 *
 *   arranque-inesperado   zumbido de motor, vibración, flash rojo (el entorno hace girar el acople)
 *   quemadura / fuga-presion   siseo de ruido blanco, flash naranja (el entorno lanza partículas)
 *   caida                 viñeta fuerte + descenso vertical ≤ 1,5 s SIN rotar + fundido a negro
 *   desvanecimiento       oscurecimiento progresivo, balanceo de la viñeta (no de la cámara), audio amortiguado
 *   objeto-cae            golpe sonoro + flash
 *   arco-electrico        chispa + flash blanco azulado
 *
 * Devuelve la duración (s) tras la cual se muestra el panel de consecuencia.  Los entornos leen
 * `useApp.consequence` para sus partes visuales (acople girando, chorro de agua, herramienta que cae).
 */
let timer = null
function animate(dur, fn, done) {
  const t0 = performance.now()
  clearInterval(timer)
  timer = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / (dur * 1000))
    fn(k)
    if (k >= 1) { clearInterval(timer); done?.() }
  }, 16)
}

export function playConsequence(name) {
  S.unlockAudio()
  switch (name) {
    case 'arranque-inesperado':
      S.motorStart(3); FX.color.set('#ff2a1a'); FX.flash = 1
      for (let i = 0; i < 6; i++) setTimeout(() => haptic('right', 1, 120), i * 250)
      return 2.5
    case 'quemadura': case 'fuga-presion':
      S.hiss(2.5); FX.color.set('#ff8a1f'); FX.flash = 1; haptic('right', 0.8, 300)
      return 2.5
    case 'arco-electrico':
      S.spark(); FX.color.set('#bcd8ff'); FX.flash = 1; haptic('right', 1, 200)
      return 1.5
    case 'arranque-motor':
      S.motorStart(2.5); haptic('right', 0.6, 200)
      return 1
    case 'objeto-cae':
      setTimeout(() => S.thud(0.7), 600); FX.color.set('#ff2a1a'); setTimeout(() => { FX.flash = 0.8 }, 600)
      return 2
    case 'caida': {
      /* descenso vertical rápido, sin rotación, con fundido a negro antes del suelo */
      PLAYER.frozen = true
      FX.vig = 1
      animate(1.4, (k) => {
        PLAYER.dy = -Math.pow(k, 1.6) * 4.5
        FX.dark = Math.min(1, k * 1.5)
      }, () => { S.thud(0.8); FX.fade = 1 })
      return 2.2
    }
    case 'desvanecimiento': {
      PLAYER.frozen = true
      S.muffle(true)
      animate(3.5, (k) => { FX.dark = Math.min(1, k * 1.15); FX.sway = k }, () => { FX.fade = 1 })
      return 3.8
    }
    default:
      FX.color.set('#ff2a1a'); FX.flash = 1; S.warnSound()
      return 1.5
  }
}

/** deja la vista y el sonido como estaban (al reintentar o salir) */
export function clearConsequence() {
  clearInterval(timer)
  PLAYER.dy = 0; PLAYER.frozen = false
  FX.dark = 0; FX.sway = 0; FX.flash = 0
  S.muffle(false)
}
