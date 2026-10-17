# 09 — Calidad, pruebas y rendimiento

El trabajo es autónomo, así que **las pruebas son la revisión**. Ninguna etapa se cierra sin ellas.

## 1. Pruebas del motor y escenarios (vitest) — `npm test`
- `tests/engine/*.test.js`: condiciones, kinds, runner, puntaje, validador, determinismo.
- `tests/scenarios/<id>.test.js` por escenario:
  - **validación** del archivo (`validate(scenario)` sin errores);
  - **camino feliz**: lista de acciones → `finished`, `passed: true`, `score: 100` en evaluación;
  - **cada error crítico**: secuencia mínima que lo dispara → evento `critical` con su `consequence`;
  - **variaciones por semilla**: al menos 2 semillas.
- Helper `play(scenario, actions, { mode, seed })` que devuelve el resultado: así los tests son legibles.

## 2. Prueba de humo en navegador — `npm run smoke`
`tests/smoke.mjs` con **puppeteer-core + Microsoft Edge headless** (ya instalado en el PC:
`C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`, flags `--use-angle=swiftshader
--enable-unsafe-swiftshader`). Es el mismo método con el que se probó Smart Plant 3D. Sirve `dist` con
`vite preview --port 4180 --strictPort`.
Comprueba: portada sin errores de consola · lienzo WebGL · flujo por script con los ganchos de DEV
(`window.__hseq = { app, run, act, scenario }`; en build de producción exponerlos solo con `?debug=1`) ·
service worker registrado y **carga offline** (`page.setOfflineMode(true)` + recarga) · capturas a
`docs/capturas/`.
Nota: el panel de navegador integrado de Claude Code no permite service workers y a veces no pinta si
está oculto; para comprobaciones visuales usar capturas del smoke (Edge headless) o el panel visible.

## 3. Emulador de visor (manual/visual)
`npx vite --mode plain --port 5173 --host 127.0.0.1` y abrir **`http://localhost:5173/hseq/?emu=1`**
(debe ser `localhost`, no `127.0.0.1`, para que se inyecte el emulador IWER). El botón de entrar a VR
necesita un clic real (no `element.click()` desde JS).

## 4. Presupuesto de rendimiento (Quest 3S, WebXR, 72 Hz = 13,9 ms/cuadro)
Medir en PC en modo primera persona en los puntos de vista más cargados de cada escenario (gancho DEV
que exponga `gl.info`):
| Métrica | Límite |
|---|---|
| Llamadas de dibujo por vista (×2 en VR) | ≤ 90 |
| Triángulos por vista | ≤ 250 k |
| `gl.render` CPU en el PC | ≤ 4 ms |
| Lógica por cuadro (useFrame total) | ≤ 1 ms en el PC |
| Geometrías en GPU (`gl.info.memory.geometries`) | ≤ 300 |
| Texturas de lienzo redibujadas | Solo cuando cambian (nunca por cuadro; máx. 1–2 Hz las vivas) |

## 5. Lecciones de Smart Plant 3D (obligatorias)
1. `frameRate: 72` en el store XR (por defecto pedía 120 Hz → reproyección y tirones).
2. Sin `grabPointer` ni manos: los punteros de agarre/mano intersectan toda la escena cada cuadro.
3. Mallas de selección invisibles **en la capa 5** (`PICK_LAYER`) y `raycaster.layers.enable(5)`; si no,
   three las sube a la GPU y las prueba contra el frustum cada cuadro. No usar `frustumCulled=false` en
   ellas (empeora: sube todas las geometrías).
4. `matrixAutoUpdate = false` en lo estático.
5. Nada de `toLocaleString` / `new Intl.*` en bucles: formateadores reutilizados.
6. `useApp()` sin selector re-renderiza con cualquier cambio: usar selectores siempre.
7. Paneles de lienzo (640×1024 ≈ 2,6 MB por subida): redibujar solo al cambiar el contenido.
8. Esferas de viñeta/fundido a pantalla completa: `visible=false` cuando su opacidad es 0.
9. Cielos con ruido por píxel: dibujarlos después de los opacos (`renderOrder` alto).
10. Lotes por material y zona; nada de una malla por pieza.
