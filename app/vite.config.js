import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

/*
 * base '/hseq/': la app se publica en https://digital-twins.voltac.com.co/hseq/ junto a
 * Smart Plant 3D (/mr/), el visor de P&ID (/pid/) y el portal (/).  Cambia aquí si la mueves.
 *
 * basicSsl: WebXR exige contexto seguro también en desarrollo.  Con `vite --host` el visor
 * Quest puede abrir https://<ip-del-pc>:5173/hseq/ en la misma wifi (acepta el certificado
 * propio una vez).  En producción nginx pone el TLS.
 * `vite --mode plain` desactiva el TLS local (vistas previas y emulador en el PC).
 */
export default defineConfig(({ command, mode }) => ({
  base: '/hseq/',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: {
    /* una sola copia de three: el emulador IWER trae la suya y su renderer no entiende los materiales de 0.186 */
    dedupe: ['three'],
    /* En producción el emulador IWER se sustituye por stubs vacíos: ahorra ≈ 6 MB de chunks. */
    alias: command === 'build' && mode !== 'development' ? {
      '@iwer/devui': fileURLToPath(new URL('./src/xr/stubs/iwer-devui.js', import.meta.url)),
      '@iwer/sem': fileURLToPath(new URL('./src/xr/stubs/iwer-sem.js', import.meta.url)),
      'iwer': fileURLToPath(new URL('./src/xr/stubs/iwer.js', import.meta.url)),
    } : {},
  },
  plugins: mode === 'plain' || mode === 'test' ? [react()] : [react(), basicSsl()],
  server: { host: true, port: 5173 },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        /* Vite 8 (rolldown) exige función: separa los vendors del código propio */
        manualChunks(id) {
          if (/[\/](iwer|@iwer)[\/]/.test(id) || id.includes('/xr/dist/emulate')) return undefined
          if (id.includes('node_modules/three/')) return 'three'
          if (id.includes('@react-three/xr') || id.includes('@pmndrs/')) return 'xr'
          if (id.includes('@react-three/')) return 'r3f'
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
  /* vitest: el motor y los escenarios son JS puro, se prueban en Node sin navegador */
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
  },
}))
