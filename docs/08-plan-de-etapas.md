# 08 — Plan de etapas (ejecución autónoma)

Reglas de ejecución: `CLAUDE.md › Protocolo de trabajo AUTÓNOMO`. Resumen: al cumplir el **criterio de
terminado** de una etapa → `npm run build` + `npm test` + prueba de humo → commit → actualizar `ESTADO.md`
(tabla de avance + bitácora + siguiente paso) → **pasar a la siguiente sin preguntar**.
La única parada planificada es la **Etapa 9 (punto de revisión)**.

Referencia: `R = C:\Users\admin\Desktop\VOLTAC_DEV\productos\digital-twins-3d`.

---

## Etapa 0 — Fundaciones
**Objetivo:** app vacía pero real, con la base técnica de Smart Plant 3D, corriendo en PC y emulador.
1. `git init` en `HSEQ Gate\` (rama `main`) y `.gitignore` copiado de `R\.gitignore` (ya excluye
   `node_modules/`, `.env*`, `*.pem`, `*.keystore`, `*.apk`, `quest-apk/build/`, `quest-apk/app/build/`).
   Igual que en R, `app/dist/` **sí** se versiona (se despliega sin compilar en el servidor).
2. Crear `app/` con `package.json` (nombre `hseq-gate`, versión `0.1.0`, mismas dependencias que
   `R\mr-twin\package.json` + `vitest` + `puppeteer-core` como devDependencies). `npm install`.
3. Copiar/adaptar según la tabla de `docs/01`: `vite.config.js` (base `/hseq/`), `xr/store.js`,
   `main.jsx`, `App.jsx` (portada HSEQ Gate), `ui/Panel3D.jsx`, `ui/XrOverlays.jsx` (textos HSEQ Gate),
   `scene/VRRig.jsx`, `scene/VRWorld.jsx`, `scene/FirstPerson.jsx`, `scene/interact.js`, `scene/batch.js`,
   `geometry/*` necesarios, `walk/walk.js` (versión genérica), `public/sw.js` + `manifest.json` + iconos
   (generar iconos como en R: isotipo blanco sobre `#0b1220`; logo en `R\Resources`).
4. Escena de prueba: piso de concreto 30×30 m + un cubo + cielo; caminar en PC y en emulador IWER.
4b. Agregar una fila para `HSEQ Gate` en `Desktop\VOLTAC_DEV\PROYECTOS.md` (mismo formato que `digital-twins-3d`;
   remoto: "pendiente").
5. `tests/smoke.mjs` (puppeteer-core + Edge headless, ver `docs/09`) y un test vitest trivial.
**Terminado cuando:** `npm run build` OK · `npm test` OK · smoke OK (la portada carga sin errores de consola y
el lienzo existe) · en `http://localhost:5173/hseq/?emu=1` se entra a VR y se ve la escena · commit
`chore: fundaciones del proyecto`.

## Etapa 1 — Motor de escenarios
**Objetivo:** `src/engine/` completo y probado, sin gráficos (`docs/02`).
1. `conditions.js`, `kinds.js` (todos los kinds de la tabla), `runner.js` (act/tick/hint/snapshot/on,
   fases strict/any, errores, efectos, modos), `scoring.js`, `validate.js`, PRNG con semilla.
2. `src/scenarios/limits.js` (umbrales y puntaje, con `// VALIDAR HSE`).
3. Escenario de juguete `tests/fixtures/demo.js` (3 fases, 1 error crítico) para probar el motor.
4. Pruebas: condiciones, cada kind, orden strict/any, errores por severidad, modos (crítico en evaluación
   termina; en aprendizaje permite reintentar), determinismo con semilla, validador.
**Terminado cuando:** cobertura de todas las reglas de `docs/02` con vitest en verde · commit `feat: motor de escenarios`.

## Etapa 2 — Lobby y flujo de sesión
1. zustand `store.js`: sesión (aprendiz, escenario, modo), tableta, calidad.
2. Lobby 3D (`docs/06`): teclado numérico de cédula, tarjetas de escenarios (`scenarios/index.js`),
   selector de modo, botón comenzar, avisos.
3. Puente motor↔React: `useRun()` (crea el runner), `useRunState(objId)`, eventos → avisos.
4. Tableta (pestañas Paso/Pista/Checklist/Inventario/Salir), panel de aviso, panel de consecuencia,
   debrief. Probar con el escenario `demo` en un entorno de cajas.
5. Splash (de XrOverlays) → lobby → escenario → debrief → lobby; `?app=quest` entra solo a VR.
**Terminado cuando:** el flujo completo funciona en PC con el escenario demo (smoke lo recorre vía
`window.__hseq`) · commit `feat: lobby, tableta y flujo de sesión`.

## Etapa 3 — Kit de interacción
1. Componentes de `src/interact/` (lista de `docs/06`) con malla de selección en `PICK_LAYER`, lectura de
   estado y acciones; inventario (grip/B), uso sobre objeto (A).
2. Resaltado de pasos (aprendizaje), flecha guía.
3. Efectos de consecuencia (`world/effects/`) y sonidos WebAudio.
4. Escenario `demo` reconstruido con objetos reales (válvula, interruptor, candado, detector).
**Terminado cuando:** el escenario demo se completa interactuando (PC) y por script (`__hseq.act`) · los
efectos se ven · presupuesto de rendimiento respetado en la escena demo · commit `feat: kit de interacción`.

## Etapa 4 — Escenario LOTO (`docs/03`)
1. Entorno `world/loto/` (casa de bombas + cuarto eléctrico + estación de bloqueo + NPC).
2. `scenarios/loto.js` completo (fases, errores, variaciones por semilla, debrief).
3. Pruebas: camino feliz (aprobado 100) + cada error crítico + variación del interruptor barajado.
**Terminado cuando:** pruebas en verde · se completa en PC en los 3 modos · rendimiento dentro del
presupuesto · capturas de pantalla guardadas en `docs/capturas/loto-*.png` · commit `feat: escenario LOTO`.

## Etapa 5 — Escenario Alturas (`docs/04`)
Igual estructura: entorno, datos, zona de borde (`near`), quiz de claridad de caída, efecto de caída
confortable, pruebas (camino feliz + críticos). **Terminado** con los mismos criterios · commit `feat: escenario alturas`.

## Etapa 6 — Escenario Espacios confinados (`docs/05`)
Igual estructura: foso, modelo de atmósfera con tiempo comprimido, detector con sonda por niveles,
alarma, roles NPC, trípode. **Terminado** con los mismos criterios · commit `feat: escenario espacios confinados`.

## Etapa 7 — Evaluación, registros y certificado (`docs/07`)
IndexedDB, guardado de intentos al terminar, panel del instructor 2D (aprendices CSV, resultados, exportar
/importar JSON y CSV, certificado imprimible, borrar datos de una persona), reproducción de un intento
desde su traza en pruebas. **Terminado cuando:** pruebas de registros en verde · smoke recorre: registrar
aprendiz → escenario por script → resultado visible en el panel → certificado generado · commit `feat: registros y certificado`.

## Etapa 8 — Pulido, rendimiento, PWA y APK (preparación)
1. Medición de rendimiento por escenario (`docs/09`) y correcciones hasta cumplir el presupuesto.
2. Splash con versión `1.0.0`, iconos, manifest, `sw.js` probado offline (smoke offline como en R).
3. `deploy.ps1` / `deploy-remote.sh` adaptados a `/hseq/` (**no ejecutar**). `quest.ps1` adaptado
   (paquete `co.com.voltac.hseqgate`, `-PullResults`).
4. `quest-apk/`: dejar `twa-manifest.json` preparado (immersive, `startUrl /hseq/?app=quest`) y
   `docs/10` con los comandos exactos. La generación de la llave y la firma **las hace el dueño**.
5. README con capturas.
**Terminado cuando:** todo lo anterior verificado · commit `chore: v1.0.0 lista para revisión`.

## Etapa 9 — Punto de revisión (PARADA)
Escribir en `ESTADO.md` un **resumen de revisión**: qué hay, cómo probarlo en 5 minutos (PC y visor),
capturas, limitaciones conocidas, decisiones tomadas, pendientes y lista de acciones que requieren al
dueño: (a) aprobar dominio/ruta y desplegar, (b) crear repo remoto y push, (c) crear la llave y firmar el
APK, (d) validación HSE del contenido, (e) crear la app en el Developer Dashboard y subir a ALPHA.
**Detenerse aquí** y avisar.
