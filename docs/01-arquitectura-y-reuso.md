# 01 — Arquitectura y reutilización de Smart Plant 3D

Referencia: `R = C:\Users\admin\Desktop\VOLTAC_DEV\productos\digital-twins-3d` (app en `R\mr-twin`).
Antes de copiar un archivo, **léelo**: arrastra decisiones de rendimiento importantes (comentadas en el código).

## Stack (igual que Smart Plant 3D)
Vite 8 · React 19 · three.js 0.186 · @react-three/fiber 9 · @react-three/drei 10 · @react-three/xr 6.6 ·
three-mesh-bvh · zustand. Se añade **vitest** (pruebas del motor) y **puppeteer-core** como dependencia de
desarrollo (prueba de humo con Edge headless, ver `docs/09`).

## Estructura objetivo de `app/`
```
app/
  index.html  package.json  vite.config.js   (base '/hseq/')
  public/     manifest.json  sw.js  favicon.png  icons/ (icon-192, icon-512, maskable-512, logo-voltac)
  src/
    main.jsx  App.jsx  Scene.jsx  store.js
    xr/store.js                       ← copiar tal cual de mr-twin (72 Hz, sin agarre, sin manos)
    engine/                           ← NUEVO: motor de escenarios (JS puro, sin React ni three)
      runner.js  conditions.js  scoring.js  events.js
    scenarios/                        ← NUEVO: un archivo de datos por escenario + umbrales
      index.js  limits.js  loto.js  alturas.js  confinados.js
    world/                            ← entornos procedurales por escenario
      common/  (piso, cerramiento, señalética, iluminación, cielo)  loto/  alturas/  confinados/  lobby/
    interact/                         ← NUEVO: kit de objetos interactivos (docs/06)
    geometry/                         ← copiar de mr-twin: builder.js, materials.js, atlas.js, decals.js (adaptados)
    scene/                            ← copiar/adaptar: batch.js, VRRig.jsx, VRWorld.jsx, FirstPerson.jsx, interact.js
    walk/walk.js                      ← adaptar de mr-twin/src/plant/walk.js (colisiones por escenario)
    ui/                               ← copiar: Panel3D.jsx, XrOverlays.jsx; nuevos: lobby, tablet, debrief
    records/                          ← NUEVO: persistencia IndexedDB, exportes, certificado
  tests/                              ← vitest + smoke.mjs (puppeteer-core)
```

## Qué copiar de Smart Plant 3D y cómo
| Origen (`R\mr-twin\…`) | Destino | Cambios |
|---|---|---|
| `vite.config.js` | `app/vite.config.js` | `base: '/hseq/'`; mantener `define.__APP_VERSION__`, stubs IWER en build, `manualChunks` |
| `src/xr/store.js` | igual | Tal cual (72 Hz, `grabPointer:false`, `hand:false`, `handTracking:false`, sin planos/mallas) |
| `src/main.jsx` | igual | Registro del service worker; ganchos de depuración `window.__hseq` en DEV |
| `src/App.jsx` | igual | Portada propia; `QUEST_APP` (`?app=quest`) → entra solo a VR (mismo patrón) |
| `src/ui/Panel3D.jsx` | igual | Tal cual (paneles con lienzo + rectángulos de toque). Es la base de toda la UI en VR |
| `src/ui/XrOverlays.jsx` | igual | Splash con textos de HSEQ Gate; `ControllerPrompt` tal cual |
| `src/ui/ControlPanel.jsx` | `ui/Tablet.jsx` | Reutilizar `headPose/HEAD` y la tableta en mano izquierda (botón Y) |
| `src/scene/VRRig.jsx` | igual | Caminar, giro a saltos, teletransporte, viñeta (ya optimizada: solo se dibuja activa) |
| `src/scene/VRWorld.jsx` | igual | Cielo/terreno; para interiores (tanque) usar entorno propio sin cielo |
| `src/scene/FirstPerson.jsx` | igual | Modo PC (WASD + ratón) — imprescindible para probar sin visor |
| `src/scene/interact.js` | igual | `findTag`, `aimAt`, `haptic` → base de la interacción |
| `src/plant/walk.js` | `walk/walk.js` | Grillas de obstáculos/superficies por escenario; escaleras (`climbs`) |
| `src/scene/batch.js` + `geometry/materials.js` | igual | Lotes por material con dueño por vértice; materiales "familia"; desgaste procedural |
| `src/geometry/builder.js` | igual | `Collector` (cyl, box, flange…), `pipeCurve`, `pipeGeometry` |
| `src/geometry/equipment.js`, `inline.js` | tomar piezas | Bomba, motor, válvulas, tanques, escaleras con jaula, barandas: reutilizar constructores |
| `src/geometry/decals.js`, `atlas.js` | igual | Placas y rótulos en atlas (señalética de seguridad, tarjetas de bloqueo) |
| `src/scene/buildPlant.js` | patrón | Patrón de construcción: mallas de selección invisibles en `PICK_LAYER` (capa 5), BVH perezoso |
| `public/sw.js`, `manifest.json`, iconos | igual | `VERSION = 'hseqgate-v1'`; nombre/colores/iconos propios |
| `R\deploy.ps1`, `deploy-remote.sh`, `quest.ps1` | raíz | Ruta remota `/hseq/`, paquete del APK propio (`docs/10`) |
| `R\quest-apk\twa-manifest.json` | `quest-apk/` | Solo como referencia de campos (modo **immersive**, `startUrl` con `?app=quest`) |

**No copiar**: `plant/model.js`, `plant/process.js`, `plant/layout.js`, `plant/catalog.js`, `scene/Plant.jsx`
(lógica de la planta de crudo), `LiveReadouts`, `SmartLabels`, `CutGizmo`, herramientas de maqueta
(`tools/`), ni el modo MR de maqueta (fuera del MVP).

## Arquitectura en capas
```
           ┌──────────── datos ─────────────┐
           │ scenarios/*.js   limits.js      │   ← lo edita un experto HSE
           └───────────────┬─────────────────┘
                           ▼
   engine/ (JS puro)  runner: estado del escenario, pasos, condiciones, errores, puntaje, eventos
        ▲  acciones: act(objId, verb, payload)          │ eventos: stepDone, error, critical, finished
        │                                               ▼
   interact/ (kit)  objetos 3D que emiten acciones    ui/ (tableta, avisos, debrief) + world/ (efectos)
        ▲                                               │
   scene/ VRRig, FirstPerson, interact.js  ←── jugador ──┘
                           ▼
   records/  intento → IndexedDB → exportes / certificado
```
- **El motor no conoce three.js**: recibe acciones con nombre (`'breaker-mcc-03' : 'open'`) y mantiene el
  estado del mundo como un diccionario (`world.state['breaker-mcc-03'] = 'open'`). Esto permite probar los
  escenarios completos con vitest, sin navegador (clave para el trabajo autónomo).
- Los objetos 3D leen el estado del motor para pintarse (candado puesto, válvula cerrada, lectura del
  detector) y envían acciones al interactuar.
- zustand (`store.js`) guarda lo de interfaz y sesión (aprendiz, escenario, modo, tableta, calidad);
  el estado del escenario vive en el runner y se publica a zustand con un selector por cambio.

## Coordenadas y escala
Metros, Y arriba, origen en el centro del área del escenario. Cada escenario define su `spawn`
(posición y orientación inicial) y su grilla de caminabilidad.
