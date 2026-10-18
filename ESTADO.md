# ESTADO — productos\HSEQ Gate

> Bitácora para retomar el trabajo. Léela al empezar; actualízala al terminar cada etapa.
> Protocolo: `CLAUDE.md` (trabajo autónomo, sin pedir aprobación entre etapas).

## Resumen
Simulador VR de entrenamiento HSEQ (LOTO, alturas, espacios confinados) para Meta Quest 3S, construido
sobre la base técnica de Smart Plant 3D (`..\digital-twins-3d\mr-twin`).

## Estado actual
- Etapa: **9 — Punto de revisión (PARADA)**. Todas las etapas 0–8 terminadas y verificadas.
- Versión: **1.0.0** · En producción: **no** · Remoto: https://github.com/CMejiaVergel/hseq-gate (main subido 2026-10-17)
- Funciona: lobby → 3 escenarios (LOTO, alturas, espacios confinados) + demo, en los 3 modos, en PC y en VR (emulador) → debrief → registros → panel del instructor → certificado; PWA sin conexión
- Bloqueos: ninguno técnico; lo pendiente requiere al dueño (ver abajo)

## Siguiente paso
Pruebas del dueño en el servidor local y ajustes en la web; luego despliegue a /hseq/ (lo hace el asistente cuando el dueño lo pida) y después el APK.
- PC: `npm --prefix app run dev:plain` → http://localhost:5174/hseq/
- Visor en la misma wifi: `npm --prefix app run dev:quest` → https://192.168.1.60:5175/hseq/ (aceptar el certificado propio una vez)

## RESUMEN DE REVISIÓN (Etapa 9)
### Qué hay
- **App web WebXR** en `app/` (Vite 8 + React 19 + three 0.186 + @react-three/xr), base técnica de Smart Plant 3D (72 Hz, sin agarre ni manos, mallas de selección en capa 5, lotes por material).
- **Motor de escenarios por datos** (`app/src/engine/`): 20 kinds, condiciones serializables, fases strict/any, errores menor/mayor/crítico con consecuencia, modos, pistas, temporizadores, disparadores, zonas espaciales, variantes por semilla, validador y reproducción exacta desde la traza.
- **Escenarios** (`app/src/scenarios/`): LOTO bomba P-101 (23 pasos, 4 críticos), Alturas luminaria a 6 m (19 pasos, 4 críticos), Espacios confinados cámara CV-07 (20 pasos, 5 críticos), Demo de controles. Umbrales en `limits.js` (`// VALIDAR HSE`).
- **Entornos procedurales** (`app/src/world/`): lobby, casa de bombas + cuarto eléctrico, rack con plataforma y borde sin baranda, explanada con foso caminable.
- **Experiencia VR/PC**: tableta (mano izquierda / Tab), avisos, resaltado y flecha guía, paneles de objeto (documentos, diálogos NPC, inspección de arnés, detector multigás, probador, puntos de bloqueo), consecuencias confortables (sin rotar cámara), sonido WebAudio, debrief.
- **Registros**: IndexedDB local, panel del instructor (CSV de aprendices, resultados filtrables, exportar/importar JSON y CSV, borrar datos de una persona), certificado imprimible con código de verificación.
- **Entrega**: PWA offline, `deploy.ps1`/`deploy-remote.sh` (/hseq/), `quest.ps1` (-Install/-Stop/-PullResults), `quest-apk/twa-manifest.json` (immersive).

### Cómo probarlo en 5 minutos
- **PC**: `cd app; npm install; npm run build; npm run preview -- --mode plain --port 4180` → `http://localhost:4180/hseq/` → «Recorrer en el PC». Lobby: digita una cédula + OK, escenario, modo, Comenzar. Teclas: WASD, ratón, clic/Espacio, E, F, Q, Tab, R.
- **Visor** (tras desplegar): navegador de Meta Quest → `https://digital-twins.voltac.com.co/hseq/` → «Entrar en realidad virtual»; o el APK (entra solo). En la misma wifi sin desplegar: `npm run dev` y abrir `https://<ip-del-pc>:5173/hseq/` (el 5173 lo usa hoy Smart Plant 3D: usar `--port 5174`).
- **Instructor**: portada → «Panel del instructor».
- **Pruebas**: `npm test` (86), `npm run smoke`, `node tests/emu-flow.mjs`.

### Capturas
`docs/capturas/`: lobby, loto-*, alturas-*, confinados-*, demo-*, instructor-*, certificado, emulador-* (las regenera `npm run smoke`).

### Limitaciones conocidas
- **No probado en un Quest 3S real**: rendimiento (72 Hz), comodidad, legibilidad de paneles y ergonomía de los mandos solo se verificaron en PC (Edge headless/SwiftShader) y en el emulador IWER. Medido en PC: ≤ 27 llamadas de dibujo y ≤ 8 k triángulos por vista (presupuesto 90 / 250 k). El tiempo de CPU de render (≤ 4 ms) no es medible con SwiftShader.
- Escenario de confinados usa una luz puntual dentro del foso (costo por fragmento): vigilar en el visor.
- Probador de tensión y detector son fijos (se operan desde su panel), no se llevan en la mano.
- Sin descarga verificada desde el APK inmersivo ni almacenamiento compartido APK↔navegador (ver docs/10, «Pendiente de verificar»).
- Datos solo locales por dispositivo (sin sincronización: backlog).
- Las NPC son estáticas (el compañero de alturas no camina; la herramienta que cae es una animación simple).

### Decisiones tomadas
Ver sección «Decisiones tomadas» (más abajo): ajustes de puntaje a 100 en LOTO y alturas, kinds/condiciones extra del motor, críticos que cancelan la acción, alarma siempre presente en confinados, builder simplificado, etc.

### Acciones que requieren al dueño
- **(a) Aprobar dominio/ruta y desplegar**: por defecto `https://digital-twins.voltac.com.co/hseq/` → `powershell -ExecutionPolicy Bypass -File .deploy.ps1` (probado en seco con `-DryRun`). Alternativa subdominio: requiere DNS + nginx + certificado.
- ~~(b) Crear el repo remoto y hacer push~~ ✅ hecho 2026-10-17 (CMejiaVergel/hseq-gate): `gh repo create CMejiaVergel/hseq-gate --private --source . --push` (o crear en GitHub y `git remote add origin … ; git push -u origin main`). Actualizar la columna «Remoto» en `VOLTAC_DEVPROYECTOS.md`.
- **(c) Crear la llave y firmar el APK**: pasos exactos en `docs/10-despliegue-y-apk.md` (bubblewrap update → keytool → gradlew → zipalign → apksigner → `quest-apkHSEQGate.apk`); agregar la entrada de `co.com.voltac.hseqgate` a `/.well-known/assetlinks.json` SIN borrar la de Smart Plant 3D. La llave nunca va al repo.
- **(d) Validación HSE del contenido**: un profesional HSE debe revisar pasos, mensajes y umbrales en `app/src/scenarios/loto.js`, `alturas.js`, `confinados.js` y `limits.js` (todo lo marcado `// VALIDAR HSE`).
- **(e) Developer Dashboard**: crear la app «HSEQ Gate» (organización Voltac Systems), subir el APK al canal **ALPHA**, invitar correos; subir `appVersionCode` en cada envío.

### Pendientes (no bloquean la revisión)
- Prueba en visor real (rendimiento, comodidad de la caída y el desvanecimiento, tamaño de textos).
- Verificar exportación de resultados desde el APK y `quest.ps1 -PullResults`.
- Backlog de escenarios y funciones: `docs/11-backlog-escenarios.md`.

## Cómo probar
```
cd app
npm run build ; npm test ; npm run smoke     # smoke: Edge headless en :4180, capturas en docs/capturas
node tests/emu.mjs ; node tests/emu-flow.mjs # VR con el emulador IWER (puerto 5174)
node tests/leak.mjs                          # memoria de GPU estable entre escenarios
npm run dev:plain -- --port 5174             # desarrollo (el 5173 lo usa Smart Plant 3D)
```

## Avance por etapa
| Etapa | Estado | Commit | Notas |
|---|---|---|---|
| 0 Fundaciones | ✅ | chore: fundaciones del proyecto | build + vitest + smoke + emulador OK |
| 1 Motor de escenarios | ✅ | feat: motor de escenarios | 38 pruebas vitest |
| 2 Lobby y flujo de sesión | ✅ | feat: lobby, tableta, flujo de sesión y kit de interacción | smoke recorre lobby→demo→debrief y crítico en evaluación |
| 3 Kit de interacción | ✅ | (mismo commit que la 2) | PC: Espacio abre documento, E agarra; demo 18 llamadas de dibujo |
| 4 Escenario LOTO | ✅ | feat: escenario LOTO | 15 pruebas; completo en los 3 modos; 27 llamadas de dibujo |
| 5 Escenario Alturas | ✅ | feat: escenario alturas | 12 pruebas; completo en los 3 modos; 13 llamadas de dibujo |
| 6 Escenario Espacios confinados | ✅ | feat: escenario espacios confinados | 13 pruebas; completo en los 3 modos; 27 llamadas de dibujo |
| 7 Evaluación, registros y certificado | ✅ | feat: registros y certificado | 8 pruebas de registros; smoke: aprendiz → escenario → panel → certificado |
| 8 Pulido, rendimiento, PWA y APK | ✅ | chore: v1.0.0 lista para revisión | scripts probados en seco; smoke + emulador OK |
| 9 Punto de revisión | 🛑 PARADA | docs: resumen de revisión | esperando al dueño (acciones a–e) |

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
- 2026-10-17 LOTO: los puntos de docs/03 sumaban 107; se ajustó a 100 restando en pasos de bajo riesgo (leer OT 2→1, tomar equipo 3→2, matriz 10→8, reinstalar guarda/avisar energizar/cerrar permiso 2→1). Los pasos críticos conservan su peso.
- 2026-10-17 Motor: `lockedBy` (un equipo con candado o cubre-volante puesto no se puede operar), `requires` en `task` y `$obj` en las condiciones de errores — realismo del bloqueo y reglas por punto sin duplicar datos.
- 2026-10-17 LOTO: «equipo equivocado» se detecta al intentar arrancar con otro interruptor abierto (error mayor + arranque del motor); bloquear otro interruptor es «punto-equivocado» (mayor). Retirar la guarda antes de verificar también es «trabajo-sin-verificar».
- 2026-10-17 Alturas: la tabla de docs/04 sumaba 90; se llevó a 100 sumando en lo crítico (inspección del arnés 10→12, conexión al anclaje 10→12, ATS 6→7, claridad 6→7, bajar y cerrar 6→8, rescate 5→7).
- 2026-10-17 Motor: `requires` vale para cualquier kind (p. ej. la luminaria solo se alcanza a < 1,6 m; conectar exige llevar eslinga) y la interfaz muestra `requiresText`.
- 2026-10-17 Alturas: el defecto del arnés se sortea en TODOS los modos (también en aprendizaje, para enseñar a inspeccionar). La caída de herramienta sobre el compañero es crítica solo si la semilla lo decide y no hay acordonamiento ni amarres.
- 2026-10-17 Los entornos se liberan de la GPU al desmontarse (Scene › Stage › disposeTree).
- 2026-10-17 Confinados: la alarma ocurre SIEMPRE (el paso «salir ante la alarma» vale 10 puntos); la semilla decide su retardo (2–6 s; 3 s en aprendizaje). Retirar equipos/cerrar el manhole exigen haber pasado la alarma para no cumplirse desde el inicio.
- 2026-10-17 Motor: disparadores con `delayFrom` (retardo desde la variante) y `retry.set` (al reintentar tras «ignorar la alarma» el aprendiz queda afuera).
- 2026-10-17 Las pruebas de humo esperan por TIEMPO DEL MOTOR (no por reloj): en Edge headless los cuadros son lentos y el motor avanza menos que el reloj real.
- 2026-10-17 Fuga de GPU corregida: cada objeto construido con el colector se libera con `useDisposable` (al cambiar de versión o desmontarse). Antes crecía ~11 geometrías por ciclo lobby↔escenario; ahora es estable (`tests/leak.mjs`).
- 2026-10-17 Certificado en una capa con iframe (srcdoc) dentro del panel, con «Imprimir / Guardar PDF» y «Descargar HTML» — evita ventanas emergentes bloqueadas (navegador del visor). Logo para fondo claro redimensionado a 600 px desde `digital-twins-3d/Resources`.
- 2026-10-17 CSV de resultados con punto y coma y BOM (Excel en español); importación de aprendices acepta coma o punto y coma, encabezado opcional y comillas.

## Bloqueos
- (ninguno)

## Bitácora
### 2026-10-17 — Repo remoto y servidor local
- Remoto `origin` = github.com/CMejiaVergel/hseq-gate; `main` subido. Scripts `dev:plain` (http :5174) y `dev:quest` (https :5175, red local) + `.claude/launch.json`. Decisión del dueño: probar y ajustar en la web antes de desplegar y de crear el APK.

### 2026-10-17 — Etapas 8 y 9
- v1.0.0; `deploy.ps1` (-DryRun probado), `deploy-remote.sh`, `quest.ps1` (sintaxis verificada, -PullResults), `quest-apk/twa-manifest.json`, docs/10 con el orden exacto, README con capturas. Verificación final: build OK, 86 pruebas, smoke OK (3 escenarios × 3 modos, críticos, instructor, certificado, offline), emulador VR OK.
- Resumen de revisión escrito. **Parada**: despliegue, push, firma del APK, validación HSE y tienda quedan para el dueño.

### 2026-10-17 — Etapa 7 Evaluación, registros y certificado
- `records/exchange.js` (CSV de aprendices y resultados, exportar/importar JSON con fusión sin duplicados), `records/certificate.js` (constancia imprimible, solo aprobados en evaluación, texto escapado). `ui/Instructor.jsx`: Resultados (filtros, detalle con pasos y errores, certificado), Aprendices (formulario, CSV, eliminar datos de una persona — habeas data), Exportar/importar. Botón en la portada.
- Pruebas: `tests/records/records.test.js` (8, incluye reproducir un intento guardado). Total vitest: 86. Smoke: registra aprendiz en el panel → escenario por script → resultado en la tabla → certificado.

### 2026-10-17 — Etapa 6 Escenario Espacios confinados
- `scenarios/confinados.js` (8 fases, 20 pasos, 10 errores: 5 críticos), modelo de atmósfera por nivel con tiempo comprimido (ventilación) y fuga de H₂S en la alarma; vigía y supervisora con diálogos; requisitos físicos (llave de tapa, válvulas cerradas para la brida, trípode y arnés para la línea del winche). `world/confinados/ConfinadosWorld.jsx`: explanada, foso caminable de 3,5 m con escalera fija, línea con V-71/V-72 y brida ciega, ventilador con ducto, trípode, detector con pantalla, detector personal con alarma, NPCs.
- Pruebas: `tests/scenarios/confinados.test.js` (13). Smoke: completo en los 3 modos, desvanecimiento al bajar sin medir. Total vitest: 78.

### 2026-10-17 — Etapa 5 Escenario Alturas
- `scenarios/alturas.js` (7 fases, 19 pasos, 16 errores: 4 críticos — borde sin conexión, anclaje no certificado, arnés defectuoso, herramienta que cae), variantes (arnés defectuoso y su defecto, caída de herramienta). `world/alturas/AlturasWorld.jsx`: rack con plataforma a 6 m, tramo sin baranda con cinta, escalera con jaula (climb ligado al motor), anclaje certificado y distractores, luminaria, caseta de EPP, permisos, tablero de alumbrado, acordonamiento, compañero.
- Pruebas: `tests/scenarios/alturas.test.js` (12). Smoke: completo en los 3 modos, caída + reintento en zona segura. Capturas `docs/capturas/alturas-*.png`.

### 2026-10-17 — Etapa 4 Escenario LOTO
- `scenarios/loto.js` (8 fases, 23 pasos, 13 errores: 4 críticos), variantes por semilla (orden del CCM barajado, probador descargado con repuesto). `world/loto/LotoWorld.jsx`: casa de bombas, bomba/motor/acople, succión, descarga con cheque, purga con balde, manómetro, botonera, carro con probadores, estación de bloqueo, tablero de permisos, operadora, cuarto eléctrico con CCM-03 y caja grupal (candado del electricista). Partículas de chorro (`world/effects/Spray`).
- Pruebas: `tests/scenarios/loto.test.js` (15). Smoke: LOTO completo en los 3 modos, crítico de la purga + reintento, rendimiento (27 llamadas). Capturas `docs/capturas/loto-*.png`.

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
