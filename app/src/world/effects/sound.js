/*
 * Sonido procedural con WebAudio (docs/06): osciladores y ruido, sin archivos → offline y ligero.
 * El contexto se crea en el primer gesto del usuario (los navegadores lo exigen).
 */
let ctx = null, master = null, filter = null
function ac() {
  if (ctx) return ctx
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 20000
  master = ctx.createGain(); master.gain.value = 0.5
  filter.connect(master).connect(ctx.destination)
  return ctx
}
export function unlockAudio() { const c = ac(); if (c?.state === 'suspended') c.resume().catch(() => {}) }

function env(g, t0, a, d, peak = 1) { g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d) }

/** pitido corto */
export function beep(freq = 880, dur = 0.12, vol = 0.25, type = 'sine') {
  const c = ac(); if (!c) return
  const o = c.createOscillator(), g = c.createGain(), t = c.currentTime
  o.type = type; o.frequency.value = freq
  env(g, t, 0.005, dur, vol)
  o.connect(g).connect(filter); o.start(t); o.stop(t + dur + 0.05)
}
export const click = () => beep(1800, 0.04, 0.15, 'square')
export const okSound = () => { beep(660, 0.1, 0.2); setTimeout(() => beep(990, 0.14, 0.2), 90) }
export const warnSound = () => { beep(330, 0.18, 0.25, 'triangle'); setTimeout(() => beep(260, 0.22, 0.25, 'triangle'), 160) }

function noiseBuffer(c, secs = 1) {
  const b = c.createBuffer(1, c.sampleRate * secs, c.sampleRate), d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return b
}
/** siseo (fuga a presión, vapor): ruido blanco filtrado */
export function hiss(dur = 2.5, vol = 0.35) {
  const c = ac(); if (!c) return
  const s = c.createBufferSource(); s.buffer = noiseBuffer(c, dur + 0.2)
  const bp = c.createBiquadFilter(); bp.type = 'highpass'; bp.frequency.value = 2500
  const g = c.createGain(), t = c.currentTime
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.05); g.gain.setValueAtTime(vol, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  s.connect(bp).connect(g).connect(filter); s.start(t); s.stop(t + dur + 0.1)
}
/** zumbido de motor que arranca: sierra que sube de frecuencia */
export function motorStart(dur = 3) {
  const c = ac(); if (!c) return
  const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), t = c.currentTime
  o.type = 'sawtooth'; o2.type = 'square'
  o.frequency.setValueAtTime(20, t); o.frequency.exponentialRampToValueAtTime(120, t + 1.2)
  o2.frequency.setValueAtTime(40, t); o2.frequency.exponentialRampToValueAtTime(240, t + 1.2)
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35, t + 0.4); g.gain.setValueAtTime(0.35, t + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(lp); o2.connect(lp); lp.connect(g).connect(filter)
  o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1)
}
/** golpe seco (objeto que cae, caída) */
export function thud(vol = 0.6) {
  const c = ac(); if (!c) return
  const o = c.createOscillator(), g = c.createGain(), t = c.currentTime
  o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.25)
  env(g, t, 0.005, 0.35, vol)
  o.connect(g).connect(filter); o.start(t); o.stop(t + 0.45)
}
/** chispa / arco eléctrico */
export function spark() {
  const c = ac(); if (!c) return
  const s = c.createBufferSource(); s.buffer = noiseBuffer(c, 0.5)
  const g = c.createGain(), t = c.currentTime
  for (let i = 0; i < 6; i++) { g.gain.setValueAtTime(0.5, t + i * 0.05); g.gain.setValueAtTime(0, t + i * 0.05 + 0.02) }
  s.connect(g).connect(filter); s.start(t); s.stop(t + 0.4)
}
/** alarma del detector de gases: pitidos rápidos (devuelve función para detenerla) */
export function alarm(secs = 6) {
  let n = 0
  const id = setInterval(() => { beep(n++ % 2 ? 2400 : 3000, 0.09, 0.22, 'square'); if (n > secs * 8) clearInterval(id) }, 125)
  return () => clearInterval(id)
}
/** sonido amortiguado (desvanecimiento): baja el filtro maestro durante `secs` */
export function muffle(on) {
  const c = ac(); if (!c) return
  filter.frequency.cancelScheduledValues(c.currentTime)
  filter.frequency.linearRampToValueAtTime(on ? 400 : 20000, c.currentTime + (on ? 2 : 0.5))
}
