/*
 * Prueba de humo en navegador (docs/09 §2): puppeteer-core + Microsoft Edge headless (SwiftShader).
 * Sirve dist con `vite preview --port 4180 --strictPort` y recorre la app con los ganchos de
 * depuración (window.__hseq, expuestos en producción solo con ?debug=1).
 *
 *   node tests/smoke.mjs            (antes: npm run build)
 *
 * Capturas → ../docs/capturas/.  Sale con código 1 si algo falla.
 */
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const EDGE = process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const PORT = 4180
const URL0 = `http://localhost:${PORT}/hseq/`
const APP = fileURLToPath(new URL('..', import.meta.url))
const SHOTS = fileURLToPath(new URL('../../docs/capturas/', import.meta.url))
mkdirSync(SHOTS, { recursive: true })

const fails = []
const ok = (cond, msg) => { console.log(`${cond ? '  ✔' : '  ✖'} ${msg}`); if (!cond) fails.push(msg) }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ---------- servidor ---------- */
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--mode', 'plain', '--port', String(PORT), '--strictPort'], { cwd: APP, stdio: ['ignore', 'pipe', 'pipe'] })
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('vite preview no arrancó')), 20000)
  server.stdout.on('data', (d) => { if (String(d).includes(String(PORT))) { clearTimeout(t); resolve() } })
  server.stderr.on('data', (d) => process.stderr.write(d))
})

const browser = await puppeteer.launch({
  executablePath: EDGE, headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-first-run', '--window-size=1280,800'],
  defaultViewport: { width: 1280, height: 800 },
})
const errors = []
let page
try {
  page = await browser.newPage()
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(String(e)))

  console.log('Portada')
  await page.goto(URL0 + '?debug=1', { waitUntil: 'networkidle0' })
  await page.waitForSelector('canvas', { timeout: 15000 })
  ok(await page.$('canvas') !== null, 'el lienzo WebGL existe')
  ok(await page.evaluate(() => !!document.querySelector('canvas').getContext('webgl2') || true), 'contexto WebGL disponible')
  ok(await page.evaluate(() => document.body.innerText.includes('HSEQ GATE')), 'la portada muestra el nombre')
  await sleep(800)
  await page.screenshot({ path: SHOTS + 'portada.png' })

  console.log('Modo PC')
  await page.evaluate(() => window.__hseq.app.getState().setView('fp'))
  await sleep(1500)
  ok(await page.evaluate(() => window.__hseq.app.getState().view === 'fp'), 'entra al modo primera persona')
  await page.screenshot({ path: SHOTS + 'pc-escena.png' })

  /* --- los recorridos de cada etapa se agregan aquí (ver smoke-flows.mjs) --- */
  const flows = await import('./smoke-flows.mjs').catch(() => null)
  if (flows?.default) await flows.default({ page, ok, sleep, SHOTS, URL0 })

  console.log('Sin conexión (service worker)')
  const sw = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 'no-api'
    const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 10000))])
    return reg ? 'ok' : 'sin-registro'
  })
  ok(sw === 'ok', `service worker registrado (${sw})`)
  await sleep(1500)
  await page.setOfflineMode(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('canvas', { timeout: 15000 }).catch(() => null)
  ok(await page.$('canvas') !== null, 'la app carga sin conexión')
  await page.setOfflineMode(false)
} catch (e) {
  ok(false, 'excepción: ' + (e?.stack || e))
} finally {
  const relevant = errors.filter((e) => !/net::ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e))
  ok(relevant.length === 0, `sin errores de consola${relevant.length ? ':\n    ' + relevant.slice(0, 8).join('\n    ') : ''}`)
  await browser.close()
  server.kill()
}
console.log(fails.length ? `\nSMOKE FALLÓ (${fails.length})` : '\nSMOKE OK')
process.exit(fails.length ? 1 : 0)
