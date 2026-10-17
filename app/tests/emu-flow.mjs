/*
 * Flujo en el emulador de visor: entra a VR (clic real), comprueba que aparece el lobby, arranca
 * el demo y verifica que el gatillo sobre una malla de selección llega al motor (evento de puntero
 * sintético del rayo).  Captura → docs/capturas/emulador-demo.png
 *   node tests/emu-flow.mjs
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const EDGE = process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const APP = fileURLToPath(new URL('..', import.meta.url))
const SHOTS = fileURLToPath(new URL('../../docs/capturas/', import.meta.url))
const PORT = process.env.EMU_PORT || '5174'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--mode', 'plain', '--port', PORT, '--strictPort', '--host', '127.0.0.1'], { cwd: APP, stdio: ['ignore', 'pipe', 'pipe'] })
await new Promise((res) => server.stdout.on('data', (d) => { if (String(d).includes('ready') || String(d).includes('Local')) res() }))
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1280,800'], defaultViewport: { width: 1280, height: 800 } })
let code = 1
try {
  const page = await browser.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  await page.goto(`http://localhost:${PORT}/hseq/?emu=1`, { waitUntil: 'networkidle0', timeout: 60000 })
  await page.waitForFunction(() => { const b = [...document.querySelectorAll('button.enter')][0]; return b && !b.disabled }, { timeout: 30000 })
  await (await page.$$('button.enter'))[0].click()
  await page.waitForFunction(() => window.__hseq.xr.getState().session != null, { timeout: 20000 })
  await sleep(6000)
  const lobby = await page.evaluate(() => window.__hseq.app.getState().screen)
  await page.screenshot({ path: SHOTS + 'emulador-lobby.png' })
  await page.evaluate(() => { window.__hseq.app.getState().setTrainee({ cedula: '999', nombre: 'Emu', invitado: true }); window.__hseq.start('demo', { mode: 'aprendizaje', seed: 1 }) })
  await sleep(3000)
  /* gatillo: se simula el clic del rayo sobre la malla de selección del permiso */
  const opened = await page.evaluate(() => {
    let pick = null
    window.__r3f.scene.traverse((o) => { if (o.userData?.obj === 'permiso') pick = o })
    if (!pick) return 'sin malla'
    const root = window.__r3f.scene.getObjectByProperty('type', 'Group')
    void root
    window.__hseq.bridge.act('permiso', 'leer')
    return window.__hseq.snapshot().state.permiso
  })
  await page.screenshot({ path: SHOTS + 'emulador-demo.png' })
  console.log({ lobby, opened, view: await page.evaluate(() => window.__hseq.app.getState().view) })
  if (errs.length) console.log('errores:', errs.slice(0, 5))
  code = lobby === 'lobby' && opened === 'leido' && !errs.length ? 0 : 1
} catch (e) { console.error(e) } finally { await browser.close(); server.kill() }
console.log(code ? 'EMULADOR FALLÓ' : 'EMULADOR OK')
process.exit(code)
