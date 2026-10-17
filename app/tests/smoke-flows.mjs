/*
 * Recorridos de la prueba de humo por etapa (los llama tests/smoke.mjs con la página ya abierta).
 * Usan los ganchos de depuración window.__hseq (producción: solo con ?debug=1).
 */
const DEMO_FELIZ = [
  ['permiso', 'leer'], ['permiso', 'firmar'], ['candado', 'tomar'],
  ['int-01', 'off'], ['v-01', 'close'], ['punto-int', 'poner', 'candado'],
  ['detector', 'encender'], ['detector', 'medir', 'zona'], ['tapa', 'abrir'],
]

import { LOTO, ALTURAS, CONFINADOS } from './scenario-scripts.mjs'

export default async function flows({ page, ok, sleep, SHOTS }) {
  const ev = (fn, ...args) => page.evaluate(fn, ...args)
  const perf = async (label) => {
    await sleep(700)
    const i = await ev(() => { const x = window.__r3f.gl.info; return { calls: x.render.calls, tris: x.render.triangles, geos: x.memory.geometries, tex: x.memory.textures } })
    ok(i.calls <= 90 && i.tris <= 250000 && i.geos <= 300, `rendimiento ${label}: ${i.calls} llamadas, ${i.tris} triángulos, ${i.geos} geometrías, ${i.tex} texturas`)
  }
  const tp = (x, z, yaw, y = 0) => ev((t) => window.__hseq.app.getState().requestTeleport(t), { x, z, yaw, y })
  const runScript = async (acts) => {
    for (const a of acts) {
      if (a.tp) { await tp(...a.tp); await sleep(450); continue }
      if (a.waitT) { const t0 = await ev(() => window.__hseq.run().time); await page.waitForFunction((t) => window.__hseq.run().time >= t, { timeout: 120000, polling: 100 }, t0 + a.waitT); continue }
      if (a.waitFlag) { await page.waitForFunction((f) => window.__hseq.snapshot()?.flags.includes(f), { timeout: 15000 }, a.waitFlag); await sleep(300); continue }
      const r = await ev((x) => window.__hseq.act(...x), a)
      if (!r?.ok) console.log('    (acción ignorada)', JSON.stringify(a), r?.reason)
    }
  }

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

  console.log('Escenario LOTO')
  for (const mode of ['aprendizaje', 'practica', 'evaluacion']) {
    await ev((m) => window.__hseq.start('loto-bomba', { mode: m, seed: 11 }), mode)
    await sleep(1500)
    const dead = await ev(() => window.__hseq.run().variant.probadorDescargado)
    if (mode === 'aprendizaje') {
      await ev(() => window.__hseq.app.getState().setTablet(true))
      await tp(0, 3.6, 0); await sleep(900)
      await page.screenshot({ path: SHOTS + 'loto-inicio.png' })
      await perf('LOTO (vista inicial)')
      await ev(() => window.__hseq.app.getState().setTablet(false))
      await tp(9.5, -2.2, 0); await sleep(900)
      await page.screenshot({ path: SHOTS + 'loto-ccm.png' })
      await perf('LOTO (CCM)')
      await tp(-5.6, 1.3, Math.PI / 2); await sleep(900)
      await page.screenshot({ path: SHOTS + 'loto-estacion.png' })
    }
    const acts = LOTO(dead ? 'probador-2' : 'probador')
    await runScript(acts.slice(0, 30))
    if (mode === 'aprendizaje') { await tp(-1.9, 0.6, -0.5); await sleep(900); await page.screenshot({ path: SHOTS + 'loto-bloqueo.png' }) }
    await runScript(acts.slice(30))
    await sleep(900)
    const r = await ev(() => window.__hseq.app.getState().lastResult)
    ok(r && r.completed && r.score === 100 && (mode !== 'evaluacion' || r.passed), `LOTO completo en ${mode}: ${r?.score} ${r?.passed ? '(aprobado)' : ''}`)
    if (mode === 'evaluacion') await page.screenshot({ path: SHOTS + 'loto-debrief.png' })
    await ev(() => window.__hseq.bridge.exitToLobby()); await sleep(400)
  }
  console.log('Escenario Alturas')
  for (const mode of ['aprendizaje', 'practica', 'evaluacion']) {
    await ev((m) => window.__hseq.start('alturas-luminaria', { mode: m, seed: 21 }), mode)
    await sleep(1500)
    const h = await ev(() => ['arnes-1', 'arnes-2', 'arnes-3'].find((x) => x !== window.__hseq.run().variant.arnesDefectuoso))
    if (mode === 'aprendizaje') {
      await tp(0, 6, 0); await sleep(900); await page.screenshot({ path: SHOTS + 'alturas-inicio.png' }); await perf('Alturas (vista inicial)')
      await tp(-4.6, 1.2, Math.PI / 2); await sleep(900); await page.screenshot({ path: SHOTS + 'alturas-caseta.png' })
    }
    const acts = ALTURAS(h)
    const iBorde = acts.findIndex((a) => a.tp && a.tp[0] === 1.5)
    await runScript(acts.slice(0, iBorde + 1))
    if (mode === 'aprendizaje') { await tp(-1.0, -1.6, -0.69, 6); await sleep(900); await page.screenshot({ path: SHOTS + 'alturas-plataforma.png' }); await perf('Alturas (plataforma)'); await tp(1.5, -3.6, 0, 6); await sleep(450) }
    await runScript(acts.slice(iBorde + 1))
    await sleep(900)
    const r = await ev(() => window.__hseq.app.getState().lastResult)
    ok(r && r.completed && r.score === 100 && (mode !== 'evaluacion' || r.passed), `Alturas completo en ${mode}: ${r?.score}`)
    await ev(() => window.__hseq.bridge.exitToLobby()); await sleep(400)
  }
  /* consecuencia: borde sin conexión → caída */
  await ev(() => window.__hseq.start('alturas-luminaria', { mode: 'practica', seed: 21 }))
  await sleep(1200)
  await tp(-1.6, -1.6, 0, 6); await sleep(500)
  await tp(1.5, -3.6, 0, 6); await sleep(1200)
  await page.screenshot({ path: SHOTS + 'alturas-caida.png' })
  await sleep(2500)
  ok(await ev(() => window.__hseq.bridge.useRun.getState().consequence?.error.id === 'borde-sin-conexion'), 'Alturas: caída al entrar al borde sin conexión')
  await page.screenshot({ path: SHOTS + 'alturas-critico.png' })
  await ev(() => window.__hseq.bridge.retry()); await sleep(800)
  ok(await ev(() => window.__hseq.run().status === 'running' && Math.abs(window.__hseq.player.y - 6) < 0.1 && window.__hseq.player.z > -2), 'Alturas: reintento en zona segura de la plataforma')
  await ev(() => window.__hseq.bridge.exitToLobby()); await sleep(400)

  console.log('Escenario Espacios confinados')
  for (const mode of ['aprendizaje', 'practica', 'evaluacion']) {
    await ev((m) => window.__hseq.start('confinados-camara', { mode: m, seed: 31 }), mode)
    await sleep(1500)
    if (mode === 'aprendizaje') { await tp(0, 4.5, 0); await sleep(900); await page.screenshot({ path: SHOTS + 'confinados-inicio.png' }); await perf('Confinados (vista inicial)') }
    const acts = CONFINADOS()
    const iDentro = acts.findIndex((a) => a.tp && a.tp[3] === -3.5)
    await runScript(acts.slice(0, iDentro + 1))
    if (mode === 'aprendizaje') {
      await page.screenshot({ path: SHOTS + 'confinados-foso.png' }); await perf('Confinados (dentro del foso)')
      await tp(0.6, 1.6, 0.35); await sleep(800); await page.screenshot({ path: SHOTS + 'confinados-montaje.png' }); await tp(-0.6, -2.7, -1.27, -3.5); await sleep(400)
    }
    await runScript(acts.slice(iDentro + 1))
    await sleep(900)
    const r = await ev(() => window.__hseq.app.getState().lastResult)
    ok(r && r.completed && r.score === 100 && (mode !== 'evaluacion' || r.passed), `Confinados completo en ${mode}: ${r?.score} ${JSON.stringify(r?.errors?.map((e) => e.id) || [])}`)
    if (mode === 'evaluacion') await page.screenshot({ path: SHOTS + 'confinados-debrief.png' })
    await ev(() => window.__hseq.bridge.exitToLobby()); await sleep(400)
  }
  /* consecuencia: bajar sin medir → desvanecimiento */
  await ev(() => window.__hseq.start('confinados-camara', { mode: 'practica', seed: 31 }))
  await sleep(1200)
  await ev(() => window.__hseq.act('escalera-foso', 'bajar'))
  await sleep(2000)
  await page.screenshot({ path: SHOTS + 'confinados-desvanecimiento.png' })
  await sleep(2500)
  ok(await ev(() => window.__hseq.bridge.useRun.getState().consequence?.error.id === 'entrar-sin-medir'), 'Confinados: desvanecimiento al bajar sin medir')
  await ev(() => window.__hseq.bridge.retry()); await sleep(300)
  await ev(() => window.__hseq.bridge.exitToLobby()); await sleep(400)

  console.log('Registros, panel del instructor y certificado')
  const clickText = (t, sel = 'button') => ev(([t, sel]) => { const b = [...document.querySelectorAll(sel)].find((x) => x.textContent.includes(t)); if (!b) return false; b.click(); return true }, [t, sel])
  const typeIn = async (name, v) => { await page.click(`.instr input[name="${name}"]`, { clickCount: 3 }); await page.type(`.instr input[name="${name}"]`, v) }
  await ev(() => { const s = window.__hseq.app.getState(); s.setView(null); s.setScreen('portada') })
  await sleep(500)
  ok(await clickText('Panel del instructor'), 'portada: botón del panel del instructor')
  await sleep(500)
  await clickText('Aprendices (')
  await sleep(300)
  await typeIn('cedula', '80.001.234'); await typeIn('nombre', 'María Fernanda Ruiz'); await typeIn('empresa', 'Contratista Demo S.A.S.'); await typeIn('cargo', 'Técnica mecánica')
  await clickText('Guardar')
  await sleep(600)
  ok(await ev(() => document.querySelector('.instr').innerText.includes('María Fernanda Ruiz')), 'instructor: aprendiz registrado desde el formulario')
  await page.screenshot({ path: SHOTS + 'instructor-aprendices.png' })
  await ev(async () => { const s = window.__hseq.app.getState(); const t = await window.__hseq.records.getTrainee('80001234'); s.setTrainee({ ...t, invitado: false }); s.setView('fp'); s.setScreen('lobby') })
  await sleep(800)
  await ev(() => window.__hseq.start('demo', { mode: 'evaluacion', seed: 5 }))
  await sleep(1000)
  for (const a of DEMO_FELIZ) await ev((x) => window.__hseq.act(...x), a)
  await sleep(1200)
  const last = await ev(() => window.__hseq.app.getState().lastResult)
  ok(last?.passed, 'escenario por script aprobado en evaluación')
  await ev(() => { window.__hseq.bridge.exitToLobby(); const s = window.__hseq.app.getState(); s.setView(null); s.setScreen('instructor') })
  await sleep(800)
  ok(await ev(() => document.querySelector('.instr .grid')?.innerText.includes('María Fernanda Ruiz')), 'instructor: el resultado aparece en la tabla')
  await ev(() => [...document.querySelectorAll('.instr .grid tbody tr')].find((r) => r.innerText.includes('María Fernanda Ruiz') && r.innerText.includes('Aprobado'))?.click())
  await sleep(400)
  await page.screenshot({ path: SHOTS + 'instructor-resultados.png' })
  ok(await clickText('Ver certificado'), 'instructor: botón del certificado')
  await sleep(1200)
  const certOk = await ev((id) => { const f = document.getElementById('cert-frame'); return !!f && f.srcdoc.includes('María Fernanda Ruiz') && f.srcdoc.includes(id) && f.srcdoc.includes('C.C. 80.001.234') }, last.attemptId)
  ok(certOk, 'certificado generado con nombre y código de verificación')
  await page.screenshot({ path: SHOTS + 'certificado.png' })
  await clickText('Cerrar')
  await ev(() => { const s = window.__hseq.app.getState(); s.setScreen('lobby'); s.setView('fp') })
  await sleep(400)

  /* consecuencia: purga con válvulas abiertas */
  await ev(() => window.__hseq.start('loto-bomba', { mode: 'practica', seed: 2 }))
  await sleep(1200)
  await runScript(LOTO().slice(0, 18))
  await tp(0.4, 0.6, 0.3); await sleep(500)
  await ev(() => window.__hseq.act('v-purga', 'open'))
  await sleep(900)
  await page.screenshot({ path: SHOTS + 'loto-quemadura.png' })
  await sleep(2500)
  ok(await ev(() => window.__hseq.bridge.useRun.getState().consequence?.error.id === 'purga-con-valvulas-abiertas'), 'LOTO: consecuencia de la purga con válvulas abiertas')
  await page.screenshot({ path: SHOTS + 'loto-critico.png' })
  await ev(() => window.__hseq.bridge.retry()); await sleep(300)
  ok(await ev(() => window.__hseq.run().status === 'running'), 'LOTO: reintentar desde el paso')
  await ev(() => window.__hseq.bridge.exitToLobby()); await sleep(400)
}
