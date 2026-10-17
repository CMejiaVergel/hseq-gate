/* Diagnóstico: geometrías/texturas en GPU al repetir escenarios (deben estabilizarse). node tests/leak.mjs */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'
const APP = fileURLToPath(new URL('..', import.meta.url))
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--mode', 'plain', '--port', '4181', '--strictPort'], { cwd: APP, stdio: ['ignore', 'pipe', 'pipe'] })
await new Promise((r) => server.stdout.on('data', (d) => { if (String(d).includes('4181')) r() }))
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const p = await b.newPage()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await p.goto('http://localhost:4181/hseq/?debug=1', { waitUntil: 'networkidle0' })
await p.evaluate(() => { const s = window.__hseq.app.getState(); s.setView('fp'); s.setScreen('lobby'); s.setTrainee({ cedula: '1', nombre: 'x' }) })
const info = () => p.evaluate(() => { const i = window.__r3f.gl.info.memory; return `${i.geometries}g ${i.textures}t` })
await sleep(1000); console.log('lobby', await info())
for (const id of ['loto-bomba', 'loto-bomba', 'alturas-luminaria', 'alturas-luminaria', 'confinados-camara', 'loto-bomba']) {
  await p.evaluate((x) => window.__hseq.start(x, { mode: 'aprendizaje' }), id); await sleep(1500)
  const a = await info()
  await p.evaluate(() => window.__hseq.bridge.exitToLobby()); await sleep(1000)
  console.log(id.padEnd(20), 'dentro', a, '→ lobby', await info())
}
await b.close(); server.kill()
