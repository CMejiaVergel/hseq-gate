/*
 * Comprobación del emulador de visor (docs/09 §3): servidor de desarrollo en localhost:5173,
 * /hseq/?emu=1 inyecta IWER; se pulsa «Entrar en realidad virtual» con un clic real (CDP) y se
 * verifica que la sesión inmersiva arranca.  Captura → ../docs/capturas/emulador-vr.png
 *   node tests/emu.mjs
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
  await page.goto(`http://localhost:${PORT}/hseq/?emu=1`, { waitUntil: 'networkidle0', timeout: 60000 })
  await page.waitForFunction(() => { const b = [...document.querySelectorAll('button.enter')][0]; return b && !b.disabled }, { timeout: 30000 })
  const btn = (await page.$$('button.enter'))[0]
  await btn.click()
  await page.waitForFunction(() => window.__hseq.xr.getState().session != null, { timeout: 20000 })
  await sleep(10000)
  const st = await page.evaluate(() => ({ session: !!window.__hseq.xr.getState().session, view: window.__hseq.app.getState().view, mode: window.__hseq.xr.getState().mode }))
  console.log('sesión:', st)
  await page.screenshot({ path: SHOTS + 'emulador-vr.png' })
  if (errs.length) console.log('errores:', errs)
  code = st.session && st.view === 'vr' && !errs.length ? 0 : 1
} catch (e) { console.error(e) } finally { await browser.close(); server.kill() }
console.log(code ? 'EMULADOR FALLÓ' : 'EMULADOR OK')
process.exit(code)
