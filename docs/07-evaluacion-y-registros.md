# 07 — Evaluación, registros y certificado

## Puntaje (`engine/scoring.js`, valores en `limits.js › SCORING`)
- Base: suma de `points` de los pasos completados (cada escenario suma 100).
- Penalizaciones: error **menor** −2 · **mayor** −10 · pista usada −3 (solo práctica).
- Error **crítico**: en evaluación → intento **no aprobado** (puntaje se muestra pero `aprobado = false`);
  en aprendizaje/práctica → se registra y se permite reintentar desde el paso (cada reintento −10).
- **Aprobado** = modo evaluación + puntaje ≥ 80 + 0 críticos. (Aprendizaje y práctica nunca "aprueban":
  quedan como entrenamiento.)
- Tiempo: se registra; no puntúa en el MVP.

## Registro de intento (esquema)
```js
{
  id: 'a-<timestamp>-<rand>',        // también se usa como código de verificación del certificado
  appVersion: '1.0.0', scenarioId: 'loto-bomba', scenarioVersion: 1,
  mode: 'evaluacion', seed: 12345,
  trainee: { cedula: '1234567890', nombre: 'Ana Pérez', empresa: 'Cliente S.A.' },
  device: 'quest-3s' | 'pc' | 'browser',
  startedAt: ISO, endedAt: ISO, durationSec: 612,
  score: 86, passed: true,
  steps: [{ id, doneAt, hinted: false }],
  errors: [{ id, severity, at, message }],
  actions: [{ t, obj, verb, payload }]   // traza completa → reproducible con el motor (misma seed)
}
```

## Persistencia (`src/records/`)
- **IndexedDB** con un envoltorio mínimo propio (sin dependencias): stores `trainees`, `attempts`.
- Todo **local al dispositivo** en el MVP (funciona offline). Limitación conocida: los intentos hechos en
  las gafas se ven en las gafas; para pasarlos al PC → exportar (ver abajo). Sincronización con servidor:
  backlog.

## Panel del instructor (página 2D, PC o navegador del visor)
- **Aprendices**: importar CSV (`cedula,nombre,empresa,cargo`), agregar/editar/eliminar.
- **Resultados**: tabla filtrable (aprendiz, escenario, modo, fecha, puntaje, aprobado), detalle con
  errores y pasos.
- **Exportar**: CSV de resultados y JSON completo (incluye trazas). **Importar JSON** (para juntar en el PC
  los intentos exportados desde las gafas).
- **Certificado**: página HTML imprimible / "Guardar como PDF" del navegador: logo Voltac, nombre, cédula,
  escenario, normas de referencia, fecha, puntaje, código de verificación (id del intento) y aviso de que
  es constancia de entrenamiento en simulador.
- **Habeas data** (Ley 1581 de 2012): aviso visible al importar/registrar aprendices; botón para eliminar los
  datos de una persona; nada se envía a servidores en el MVP.

## Exportar desde las gafas
En el navegador del visor, panel del instructor → *Exportar JSON*: el archivo queda en la carpeta de
descargas del visor. Para pasarlo al PC: `quest.ps1 -PullResults` (Etapa 8) hace `adb pull` de
`/sdcard/Download/hseqgate-*.json`. Si desde la app inmersiva (APK) no se puede descargar, la vía principal
es abrir el panel del instructor en el navegador del visor (mismo origen → mismos datos; **verificarlo**
en la Etapa 8 y anotar el resultado).
