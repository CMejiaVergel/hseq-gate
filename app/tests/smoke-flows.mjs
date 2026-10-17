/*
 * Recorridos de la prueba de humo por etapa (los llama tests/smoke.mjs con la página ya abierta).
 * Usan los ganchos de depuración window.__hseq (producción: solo con ?debug=1).
 */
const DEMO_FELIZ = [
  ['permiso', 'leer'], ['permiso', 'firmar'], ['candado', 'tomar'],
  ['int-01', 'off'], ['v-01', 'close'], ['punto-int', 'poner', 'candado'],
  ['detector', 'encender'], ['detector', 'medir', 'zona'], ['tapa', 'abrir'],
]

export default async function flows({ page, ok, sleep, SHOTS }) {
  const ev = (fn, ...args) => page.evaluate(fn, ...args)

  console.log('Lobby y flujo de sesión (demo)')
  await ev(() => { const s = window.__hseq.app.getState(); s.setView('fp'); s.setScreen('lobby') })
  await sleep(1200)
  ok(await ev(() => window.__hseq.app.getState().screen === 'lobby'), 'lobby visible')
  await page.screenshot({ path: SHOTS + 'lobby.png' })

  await ev(() => window.__hseq.app.getState().setTrainee({ cedula: '1234567890', nombre: 'Prueba Humo', empresa: 'Voltac', invitado: false }))
  await ev(() => window.__hseq.start('demo', { mode: 'aprendizaje', seed: 3 }))
  await sleep(1500)
  ok(await ev(() => window.__hseq.app.getState().screen === 'escenario'), 'escenario demo cargado (aprendizaje)')
  ok(await ev(() => window.__hseq.snapshot().step.id === 'firmar'), 'paso actual = firmar el permiso')
  await page.screenshot({ path: SHOTS + 'demo-aprendizaje.png' })

  /* interacción real en el PC: mirar el permiso y pulsar Espacio; agarrar el candado con E */
  await ev(() => window.__hseq.app.getState().setTablet(false))
  await ev(() => window.__hseq.app.getState().requestTeleport({ x: -2.5, z: -0.8, y: 0, yaw: 0 }))
  await sleep(700)
  await page.keyboard.press('Space')
  await sleep(500)
  ok(await ev(() => window.__hseq.app.getState().modal?.objId === 'permiso' && window.__hseq.snapshot().state.permiso === 'leido'), 'PC: Espacio sobre el permiso abre el documento (leído)')
  await page.screenshot({ path: SHOTS + 'demo-documento.png' })
  await ev(() => window.__hseq.app.getState().openModal(null))
  await ev(() => window.__hseq.app.getState().requestTeleport({ x: -0.85, z: -1.1, y: 0, yaw: 0 }))
  await sleep(600)
  await page.mouse.move(640, 300); await page.mouse.down(); await page.mouse.move(640, 360, { steps: 4 }); await page.mouse.move(640, 430, { steps: 4 }); await page.mouse.up()
  await sleep(500)
  const aimed = await ev(() => window.__hseq.app.getState().hovered)
  await page.keyboard.press('KeyE')
  await sleep(400)
  ok(await ev(() => window.__hseq.snapshot().inventory.includes('candado-x')), `PC: E agarra el candado apuntado (${aimed})`)
  await ev(() => window.__hseq.act('candado-x', 'soltar'))

  /* presupuesto de rendimiento (docs/09 §4) en la vista del demo */
  await ev(() => window.__hseq.app.getState().requestTeleport({ x: 0, z: 3, y: 0, yaw: 0 }))
  await sleep(800)
  const info = await ev(() => { const i = window.__r3f.gl.info; return { calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, tex: i.memory.textures } })
  ok(info.calls <= 90 && info.tris <= 250000 && info.geos <= 300, `rendimiento demo: ${info.calls} llamadas, ${info.tris} triángulos, ${info.geos} geometrías, ${info.tex} texturas`)

  for (const a of DEMO_FELIZ) { await ev((x) => window.__hseq.act(...x), a); await sleep(120) }
  await sleep(800)
  const r1 = await ev(() => window.__hseq.app.getState().lastResult)
  ok(await ev(() => window.__hseq.app.getState().screen === 'debrief'), 'debrief al terminar')
  ok(r1 && r1.completed && r1.score === 100, `resultado del demo en aprendizaje: ${r1?.score}`)
  await page.screenshot({ path: SHOTS + 'demo-debrief.png' })

  console.log('Error crítico en evaluación')
  await ev(() => window.__hseq.bridge.exitToLobby())
  await sleep(500)
  await ev(() => window.__hseq.start('demo', { mode: 'evaluacion', seed: 4 }))
  await sleep(800)
  await ev(() => { window.__hseq.act('permiso', 'firmar'); window.__hseq.act('tapa', 'abrir') })
  await sleep(3500)
  ok(await ev(() => window.__hseq.bridge.useRun.getState().consequence?.stage === 'panel'), 'panel de consecuencia tras el efecto')
  await page.screenshot({ path: SHOTS + 'demo-critico.png' })
  await ev(() => window.__hseq.bridge.toDebrief())
  await sleep(600)
  const r2 = await ev(() => window.__hseq.app.getState().lastResult)
  ok(r2 && r2.passed === false && r2.criticos === 1, 'evaluación con crítico: no aprobado')
  const n = await ev(async () => (await window.__hseq.records.listAttempts()).length)
  ok(n >= 2, `intentos guardados en IndexedDB: ${n}`)
  await ev(() => window.__hseq.bridge.exitToLobby())
  await sleep(400)
}
