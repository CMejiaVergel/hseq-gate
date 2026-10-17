# ESTADO — productos\HSEQ Gate

> Bitácora para retomar el trabajo. Léela al empezar; actualízala al terminar cada etapa.
> Protocolo: `CLAUDE.md` (trabajo autónomo, sin pedir aprobación entre etapas).

## Resumen
Simulador VR de entrenamiento HSEQ (LOTO, alturas, espacios confinados) para Meta Quest 3S, construido
sobre la base técnica de Smart Plant 3D (`..\digital-twins-3d\mr-twin`).

## Estado actual
- Etapa en curso: **Etapa 4 — Escenario LOTO**
- Versión: 0.1.0 · En producción: no
- Funciona: portada → lobby (cédula, escenario, modo) → escenario demo (tableta, avisos, resaltado, flecha guía, paneles de objeto, consecuencia crítica) → debrief → lobby, en PC y en emulador VR; intentos guardados en IndexedDB
- Bloqueos: ninguno

## Siguiente paso
Ejecutar la **Etapa 4** (entorno `world/loto/`, `scenarios/loto.js` según docs/03, pruebas camino feliz + cada crítico + semillas, capturas `docs/capturas/loto-*.png`) y seguir con la 5.

## Cómo probar
```
cd app
npm run build ; npm test ; npm run smoke     # smoke: Edge headless en :4180, capturas en docs/capturas
node tests/emu.mjs                           # entra a VR con el emulador IWER (puerto 5174)
npm run dev:plain                            # desarrollo; OJO: el 5173 lo usa Smart Plant 3D → usar --port 5174
```

## Avance por etapa
| Etapa | Estado | Commit | Notas |
|---|---|---|---|
| 0 Fundaciones | ✅ | chore: fundaciones del proyecto | build + vitest + smoke + emulador OK |
| 1 Motor de escenarios | ✅ | feat: motor de escenarios | 38 pruebas vitest |
| 2 Lobby y flujo de sesión | ✅ | feat: lobby, tableta, flujo de sesión y kit de interacción | smoke recorre lobby→demo→debrief y crítico en evaluación |
| 3 Kit de interacción | ✅ | (mismo commit que la 2) | PC: Espacio abre documento, E agarra; demo 18 llamadas de dibujo |
| 4 Escenario LOTO | ⏳ | | |
| 5 Escenario Alturas | ⏳ | | |
| 6 Escenario Espacios confinados | ⏳ | | |
| 7 Evaluación, registros y certificado | ⏳ | | |
| 8 Pulido, rendimiento, PWA y APK | ⏳ | | |
| 9 Punto de revisión | ⏳ | | |

## Decisiones tomadas
- 2026-10-17 Builder y materiales simplificados (no se copió el sistema de lotes con OwnerTable de mr-twin) — los escenarios son pequeños y estáticos; basta fusionar por material/familia con color por vértice: mismo efecto en llamadas de dibujo, mucho menos código.
- 2026-10-17 `walk.js` genérico sin grilla espacial — mundos de decenas de obstáculos; se recorren en lista. Se añadieron «huecos» (foso/manhole) donde el suelo no sostiene.
- 2026-10-17 Iconos: los mismos de Smart Plant 3D (isotipo Voltac blanco sobre #0b1220) — la marca es Voltac y el plan pedía generarlos igual.
- 2026-10-17 Pruebas en navegador en los puertos 4180 (smoke, `vite preview --mode plain`) y 5174 (emulador) — el 5173 lo ocupa el servidor de desarrollo de Smart Plant 3D en este PC; `preview` va en modo plain porque basicSsl lo volvía https.
- 2026-10-17 En el PC los paneles 3D se pulsan con la mira (raycast desde el centro), no con el ratón — en primera persona el puntero está capturado; en VR siguen los eventos del rayo del mando.

- 2026-10-17 Motor: lockpoint usa los verbos `poner`/`quitar` (docs/02 decía lock/unlock/tag) — un solo par de verbos sirve para candado, tarjeta y cubre-volante; el tipo lo da el `group` del item.
- 2026-10-17 Motor: kinds extra `ladder`, `quiz`, `task` (verbos propios por datos), `zone` y el objeto implícito `jugador` (mano) — necesarios para escaleras, preguntas de la tableta, sello/luminaria/trípode y zonas de borde sin tocar el motor por escenario.
- 2026-10-17 Motor: condiciones extra `count`, `timer`, `elapsed`, `complete`, `sequence`, `mode`, `variant`, `phaseDone` y rutas con punto en `state` (`detector.lecturas.fondo.ok`) — cubren detector, probador (probar-medir-probar) y checklists siguiendo serializables.
- 2026-10-17 Motor: un crítico CANCELA la acción que lo provoca; en aprendizaje/práctica el intento queda en pausa y `retry()` sigue desde ese mismo estado (= reintentar desde el paso). Pasos de fases futuras cumplidos antes de tiempo también cuentan como fuera-de-orden (una vez, por transición).
- 2026-10-17 Traza del intento incluye muestras de posición (`_pos`, cada 0,4 m) y reintentos (`_retry`) — permite reproducir también los errores espaciales (borde).
- 2026-10-17 Etapas 2 y 3 en un solo commit — el puente, los paneles y el kit dependen entre sí; un commit intermedio no compilaba.
- 2026-10-17 La instantánea del motor se publica con estructura compartida y Panel3D compara el contenido antes de redibujar — sin esto la tableta y los objetos con estado se repintaban 4 veces por segundo (lección 7 de docs/09).
- 2026-10-17 Probador de tensión y detector son objetos fijos con panel de acciones (no se llevan en la mano) — más simple de operar en VR y en PC; el protocolo probar-medir-probar se conserva en los datos.
- 2026-10-17 Paneles de objeto (documento, diálogo, inspección, detector, punto de bloqueo…) aparecen fijos delante de la vista y se cierran al alejarse 3,5 m; avisos arriba del centro.

## Bloqueos
- (ninguno)

## Bitácora
### 2026-10-17 — Etapas 2 y 3 Lobby, flujo de sesión y kit de interacción
- `run/bridge.js` (runner fuera de React, instantánea en zustand, eventos → avisos/sonidos/consecuencias, registro del intento), `records/` (IndexedDB + memoria), lobby 3D (`world/lobby`, `ui/LobbyPanels`), tableta, avisos, panel de objeto por kind, consecuencia, debrief, HUD del PC, flecha guía.
- Kit: `interact/kit.jsx` (Pick+resaltado, Valve, Breaker, PushButtons, Item, LockPoint, Gauge, StateSwitch, FanBlades, Screen), `interact/parts.js` (cuerpos estáticos fusionables), `interact/handlers.js` (gatillo/grip/A/B/X/escaleras → motor). Efectos `world/effects` (WebAudio procedural + viñeta). Entorno demo.
- Pruebas: smoke (lobby, demo por script e interacción real con teclado/ratón, crítico, IndexedDB, rendimiento), `tests/emu-flow.mjs` (VR emulado: lobby → demo).

### 2026-10-17 — Etapa 1 Motor de escenarios
- `src/engine/`: rng (mulberry32), conditions, kinds (20 kinds), runner (act/tick/hint/retry/abandon/snapshot/result/on), scoring, validate, replay. `src/scenarios/limits.js` con todos los umbrales (`// VALIDAR HSE`). Escenario de juguete `src/scenarios/demo.js` (= `tests/fixtures/demo.js`).
- Pruebas: tests/engine (conditions, kinds, runner, validate+scoring): 38 en verde.

### 2026-10-17 — Etapa 0 Fundaciones
- `git init` (rama main), `.gitignore` de R + `*.apk`. App en `app/` (hseq-gate 0.1.0) con las dependencias de mr-twin + zustand + vitest + puppeteer-core.
- Copiado/adaptado de mr-twin: vite.config (base /hseq/, stubs IWER, manualChunks), xr/store (72 Hz, sin agarre ni manos), main/App (portada, `?app=quest`), Panel3D, XrOverlays (splash HSEQ Gate), VRRig, FirstPerson, VRWorld, interact, sw.js (`hseqgate-v1`), manifest (`co.com.voltac.hseqgate`), iconos.
- Nuevos: ScreenFx (viñeta/fundido/flash común PC+VR), actions.js (gatillo/grip/A/B/X comunes), escena de prueba.
- Pruebas: `npm test`, `npm run smoke` (portada, PC, SW + offline), `node tests/emu.mjs` (entra a VR con IWER). Capturas en `docs/capturas/`.
- Fila agregada en `VOLTAC_DEV\PROYECTOS.md` (remoto: pendiente).

### 2026-10-17 — Plan
- Documentos de diseño y plan creados en `docs/` (00–11). Base técnica: Smart Plant 3D.
