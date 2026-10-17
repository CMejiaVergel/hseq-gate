# HSEQ Gate — instrucciones para el asistente (Claude Code)

> Lee también `Desktop\VOLTAC_DEV\AGENTS.md` (reglas generales de Voltac) si está disponible.
> Este archivo manda sobre cómo se trabaja ESTE proyecto.

## Qué es
Simulador de entrenamiento HSEQ en realidad virtual para **Meta Quest 3S**: entornos industriales
inmersivos donde una persona practica procedimientos de seguridad (LOTO, trabajo en alturas, espacios
confinados, …) sin exponerse en campo. App web WebXR (Vite + React + three.js + @react-three/xr),
empaquetable como PWA y APK de Quest. Producto de **Voltac Systems S.A.S.**

Proyecto hermano y referencia técnica: **Smart Plant 3D** en
`C:\Users\admin\Desktop\VOLTAC_DEV\productos\digital-twins-3d` (app en `mr-twin/`). Mucho se reutiliza
de ahí: ver `docs/01-arquitectura-y-reuso.md`.

## Orden de lectura al iniciar (siempre)
1. `ESTADO.md` → sección **Siguiente paso** = dónde retomar.
2. `docs/08-plan-de-etapas.md` → etapa en curso y su *criterio de terminado*.
3. El documento de diseño que esa etapa cite (02 motor, 03–05 escenarios, 06 UX, 07 evaluación…).
4. Solo si hace falta: `docs/00-vision.md`, `docs/09-calidad…`, `docs/10-despliegue…`.

## Protocolo de trabajo AUTÓNOMO (lo más importante)
El dueño (Carlos Mejía) **no aprueba etapa por etapa**: revisa cuando el producto está casi listo.
Por tanto:

1. **Encadena las etapas sin pedir permiso.** Al cumplir el *criterio de terminado* de una etapa:
   compila, corre las pruebas, haz commit, actualiza `ESTADO.md` y **empieza la siguiente** en el mismo turno.
2. **No preguntes por decisiones de diseño o técnicas.** Toma la opción por defecto documentada en
   `docs/` o, si no existe, la más simple y reversible; anótala en `ESTADO.md › Decisiones tomadas`
   con una línea de *por qué*. Sigue.
3. **Si algo falla, arréglalo tú.** Diagnostica, corrige, vuelve a probar. Si tras 3 intentos serios
   algo no sale, déjalo documentado en `ESTADO.md › Bloqueos`, márcalo como pendiente y **continúa con
   lo siguiente que no dependa de eso**. No te quedes parado.
4. **Verifica antes de dar por hecho.** Cada etapa se cierra con evidencia: `npm run build` sin errores,
   `npm test` en verde y la prueba de humo del navegador (ver `docs/09`). Nunca marques algo como
   terminado si no lo comprobaste; si no pudiste comprobarlo, dilo así en `ESTADO.md`.
5. **Commits locales por etapa** (español, `tipo: descripción`, p. ej. `feat: escenario LOTO completo`).
   Haz commits intermedios cuando un avance sea estable.
6. **Detente SOLO** en estos casos (y deja todo listo para que el dueño lo haga en 1 minuto):
   - Desplegar al VPS / producción, hacer `git push` o crear el repo remoto → **punto de revisión final**
     (Etapa 9). Antes de eso todo es local.
   - Cualquier cosa que pida credenciales, contraseñas, firmar el APK, aceptar licencias o acuerdos.
   - Se acabó el plan (todas las etapas hechas) → escribe el resumen de revisión.
7. **Contexto limpio:** si la sesión se alarga, actualiza `ESTADO.md` con precisión antes de seguir;
   debe bastar para que otra sesión retome sin leer el chat.

## Reglas técnicas no negociables
- Rendimiento Quest 3S primero (lecciones de Smart Plant 3D, ver `docs/09`): 72 Hz, sin puntero de
  agarre, sin seguimiento de manos (solo mandos), lotes de geometría, mallas de selección en capa
  propia, nada de `toLocaleString` en bucles, texturas de lienzo que se redibujan solo cuando cambian.
- Todo procedural (geometría por código, sin modelos pesados): mismo enfoque que `mr-twin/src/geometry`.
- Los escenarios son **datos** (`src/scenarios/*.js`), no código suelto en componentes: el motor
  (`docs/02`) los interpreta. Un escenario nuevo no debe exigir tocar el motor.
- Idioma: español en UI, código de dominio, comentarios y commits. Tono de comentarios como en `mr-twin`.
- Rutas relativas; nada de rutas absolutas en código. Sin secretos en el repo.
- El contenido de seguridad (pasos, umbrales, normas) sale de `docs/03–05`; **no inventes valores
  normativos**. Los umbrales van en un único archivo de configuración (`src/scenarios/limits.js`) para
  que un asesor HSE los ajuste.

## Estructura del proyecto
```
HSEQ Gate\
  CLAUDE.md  ESTADO.md  README.md
  docs\        diseño y plan (00…11)
  app\         la aplicación Vite (se crea en la Etapa 0; sin espacios en la ruta del paquete)
  quest-apk\   proyecto Bubblewrap (Etapa 8)
  deploy.ps1   quest.ps1   (Etapa 8, adaptados de digital-twins-3d)
```
