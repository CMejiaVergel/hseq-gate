# 05 — Escenario 3: Espacios confinados — ingreso a cámara subterránea

> Referencias: Resolución 0491 de 2020 (Colombia, espacios confinados), OSHA 29 CFR 1910.146,
> ANSI/ASSP Z117.1. Umbrales atmosféricos en `src/scenarios/limits.js` marcados `// VALIDAR HSE`.
> **Debe validarlo un profesional HSE** antes de uso oficial.

## Situación
"Hay que inspeccionar una válvula dentro de la **cámara subterránea de válvulas CV-07** (foso de 3,5 m de
profundidad, acceso por manhole de 24" y escalera fija). Tú eres el **entrante**. El NPC **Andrés** es el
**vigía** y la NPC **Laura** es la **supervisora de entrada**."

Se eligió un foso (entrada vertical) porque enseña que los gases pesados (H₂S) se acumulan abajo y hace
natural el trípode de rescate.

## Entorno (`src/world/confinados/`)
- Explanada con la tapa del manhole, **trípode con winche** (desplegable), **ventilador/extractor** con
  ducto flexible, conos y barrera.
- Interior: foso de concreto 3 × 3 × 3,5 m, escalera fija, válvula de compuerta con su línea, charco de
  lodo al fondo, iluminación tenue (luz portátil).
- **Detector multigás** (O₂, LEL, H₂S, CO) con **sonda/manguera** para medir desde afuera a 3 niveles:
  arriba (0,5 m), medio (1,8 m), fondo (3,2 m). Estación de **bump test** (cilindro de gas de prueba).
- Válvulas de la línea que entra a la cámara (para aislar) + **brida ciega** disponible.
- Tablero: permiso de entrada a espacio confinado.

## Modelo de atmósfera (`readings`, función pura del estado y del tiempo)
- Valores iniciales por nivel (semilla), p. ej.: arriba O₂ 20,9 % · medio O₂ 20,1 % · **fondo O₂ 18,4 %,
  H₂S 14 ppm, LEL 6 %**.
- Con ventilador encendido y ducto en el foso: cada minuto **simulado** los valores se acercan a aire
  limpio (tiempo comprimido: 1 min simulado = 5 s reales; configurable).
- Durante el trabajo (práctica/evaluación, según semilla): **evento de alarma** — el H₂S sube (válvula
  que pasa) y el detector personal suena.

Umbrales iniciales (todos `// VALIDAR HSE` en `limits.js`): O₂ entre 19,5 y 23,5 %; LEL < 10 %;
H₂S < 1 ppm; CO < 25 ppm.

## Fases y pasos
| Fase (orden) | Paso | Pts |
|---|---|---|
| **1. Planear** (any) | Identificar peligros en la tableta: atmósfera (deficiencia de O₂, tóxicos, inflamables), atrapamiento/engullimiento, energías de la línea, caídas al bajar | 6 |
| | Permiso de entrada: revisar y firmar con la supervisora (diálogo) | 5 |
| | Confirmar roles: vigía presente y su función (no entra) | 4 |
| **2. Aislar** (strict) | Cerrar válvulas de la línea que entra a la cámara | 5 |
| | Instalar brida ciega (o bloqueo y etiquetado de las válvulas) | 6 |
| **3. Medir antes** (strict) | Encender el detector y hacer **bump test** | 5 |
| | Medir desde afuera, con la sonda, en **arriba → medio → fondo** (esperar lectura estable en cada nivel) | 9 |
| **4. Ventilar** (strict) | Abrir el manhole con la herramienta correcta, acordonar | 3 |
| | Instalar el ducto del ventilador hasta el fondo y encenderlo | 5 |
| | Esperar y **volver a medir** los 3 niveles hasta valores aceptables | 8 |
| **5. Preparar rescate** (any) | Montar el trípode y el winche sobre el manhole | 5 |
| | Conectar el arnés a la línea del winche | 5 |
| | Prueba de radio con el vigía | 4 |
| | Llevar el detector personal encendido | 4 |
| **6. Entrar y trabajar** | Bajar por la escalera, inspeccionar la válvula (acción "inspeccionar") | 6 |
| | Ante la **alarma** del detector: **salir de inmediato** y avisar al vigía | 10 |
| **7. Cierre** | Salir, retirar equipos, cerrar el manhole, cerrar el permiso | 5 |
| **8. Rescate (quiz)** | "Tu compañero colapsó adentro": activar emergencia y rescatar con el winche desde afuera; **no entrar** sin equipo de respiración | 5 |
Total 100.

## Errores
| Id | Disparo | Severidad | Consecuencia |
|---|---|---|---|
| `entrar-sin-medir` | Bajar la escalera sin la fase 3 completa | **crítico** | **Desvanecimiento**: visión que se oscurece y tambalea suavemente, sonidos amortiguados, fundido |
| `entrar-fuera-de-rango` | Bajar con alguna lectura fuera de umbral | **crítico** | Igual (según el gas: asfixia / intoxicación) |
| `entrar-sin-vigia` | Bajar sin confirmar al vigía / sin prueba de radio | **crítico** | "Nadie sabría que estás en problemas" |
| `entrar-sin-linea-de-vida` | Bajar sin estar conectado al winche | mayor | — |
| `ignorar-alarma` | Seguir dentro > 5 s tras la alarma | **crítico** | Desvanecimiento |
| `medir-solo-arriba` | Dar la medición por buena sin medir fondo | mayor | "El H₂S es más pesado que el aire: se acumula abajo" |
| `sin-bump-test` | Medir sin bump test | mayor | — |
| `sin-aislar` | Entrar con la línea sin aislar | mayor (crítico si ocurre la entrada de fluido por semilla) | Ingreso de fluido / gas |
| `no-esperar-lectura` | Mover la sonda antes de lectura estable | menor | — |
| `rescate-entrando` (quiz) | Elegir "bajar a ayudarlo" | **crítico** | Explicación: la mayoría de víctimas en espacios confinados son rescatistas improvisados |

## Debrief
1. Un espacio confinado se trata como peligroso hasta demostrar lo contrario: permiso, roles y aislamiento.
2. Mide antes de entrar, en varios niveles (orden O₂ → inflamables → tóxicos), ventila y vuelve a medir.
3. Monitoreo continuo: si suena el detector, sales. Sin discusión.
4. El vigía nunca entra; el rescate se hace desde afuera con el equipo previsto.
