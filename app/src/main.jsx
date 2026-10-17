import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import { useApp } from './store.js'
import { xrStore } from './xr/store.js'

/*
 * Solo en desarrollo: /hseq/?emu=1 oculta el WebXR nativo del navegador de escritorio para que
 * @react-three/xr inyecte el emulador IWER y se pueda probar la sesión VR sin el visor.
 */
if (import.meta.env.DEV && new URLSearchParams(location.search).has('emu')) {
  Object.defineProperty(Navigator.prototype, 'xr', { get: () => undefined, configurable: true })
}

/* ganchos de depuración y de la prueba de humo: en DEV siempre; en producción solo con ?debug=1 */
const DEBUG = import.meta.env.DEV || new URLSearchParams(location.search).has('debug')
if (DEBUG) window.__hseq = { app: useApp, xr: xrStore }

createRoot(document.getElementById('root')).render(<App />)

/* PWA: el service worker guarda la app para abrirla sin conexión (solo en producción) */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {}))
}
