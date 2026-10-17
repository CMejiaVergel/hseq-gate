# 03 — Escenario 1: LOTO (bloqueo y etiquetado) — bomba P-101

> Contenido de entrenamiento basado en la secuencia general de control de energías peligrosas
> (OSHA 29 CFR 1910.147, ANSI/ASSP Z244.1) y en el SG-SST colombiano (Decreto 1072 de 2015).
> **Debe validarlo un profesional HSE** antes de uso oficial; los textos están en `src/scenarios/loto.js`.

## Situación
"Hay que cambiar el sello mecánico de la bomba centrífuga **P-101** (agua caliente de proceso, 60 °C,
45 psig). Tú eres el mecánico asignado. Aísla todas las energías antes de intervenir."

## Entorno (`src/world/loto/`)
Casa de bombas pequeña (≈ 14 × 10 m) + cuarto eléctrico contiguo con puerta.
- **Skid** con bomba centrífuga horizontal + motor eléctrico + guarda del acople
  (reutilizar el constructor de bomba de `R\mr-twin\src\geometry\equipment.js`).
- Línea de **succión** con válvula de compuerta (volante), línea de **descarga** con válvula de compuerta y
  check, **válvula de purga** a un drenaje con balde, **manómetro** en la carcasa.
- **Botonera local** (arranque verde / parada roja) junto a la bomba.
- **Cuarto eléctrico**: CCM con 6 interruptores rotulados (P-101, P-102, P-103, VENT-01, ILUM-02, TOMA-04).
  En práctica/evaluación el orden de los rótulos se baraja con la semilla.
- **Estación de bloqueo** en la pared: candados personales (rojo, con nombre del aprendiz), candados
  genéricos de "prestar" (amarillos, NO válidos), tarjetas "PELIGRO – NO OPERAR", cadena/cubre-volante para
  válvulas, probador de tensión, caja de bloqueo grupal.
- **Tablero de permisos** con el permiso de trabajo y la orden de trabajo.
- **NPC operador** (en la puerta del cuarto de control) — se le notifica por radio o en persona.
- Un **candado del electricista** ya puesto en la caja grupal (para el error "retirar candado ajeno").

## Fases y pasos
| Fase (orden) | Paso | Condición de hecho | Pts |
|---|---|---|---|
| **1. Preparación** (any) | Leer la orden de trabajo | `permiso`/OT leído | 2 |
| | Firmar el permiso de trabajo | `permiso = firmado` | 5 |
| | Notificar al operador que P-101 saldrá de servicio | `radio:llamar(operador)` o `hablar` | 5 |
| | Tomar candado personal + tarjeta + cubre-volantes | inventario | 3 |
| **2. Identificar energías** (any) | Señalar cada fuente en la "matriz de energías" de la tableta: eléctrica (CCM), presión en succión, presión en descarga, energía almacenada en carcasa, térmica (60 °C), mecánica (rotación) | 6 de 6 marcadas | 10 |
| **3. Apagar y aislar** (strict) | Parar la bomba con el pulsador de parada local | `motor = stopped` | 5 |
| | Abrir el interruptor **P-101** en el CCM | `ccm-p101 = off` | 5 |
| | Cerrar válvula de descarga | `v-descarga = closed` | 5 |
| | Cerrar válvula de succión | `v-succion = closed` | 5 |
| **4. Bloquear y etiquetar** (any) | Candado personal + tarjeta en el interruptor | lockpoint con candado propio y tarjeta | 8 |
| | Cubre-volante + candado en succión | idem | 5 |
| | Cubre-volante + candado en descarga | idem | 5 |
| **5. Liberar energía almacenada** (strict) | Abrir la purga hacia el drenaje | `v-purga = open` | 5 |
| | Leer el manómetro: 0 psig | `leer(pi-carcasa)` con lectura 0 | 5 |
| **6. Verificar energía cero** (strict) | Intentar arrancar en la botonera local (no debe arrancar) | `pb-local:start` sin efecto | 8 |
| | Devolver la botonera a parada | `pb-local:stop` | 2 |
| | Probador: probar en fuente conocida → medir bornera (0 V) → probar de nuevo | 3 acciones en orden | 8 |
| **7. Trabajo** | Retirar guarda y cambiar el sello | `sello:desmontar` | 4 |
| **8. Restaurar** (strict) | Reinstalar guarda, retirar herramientas | — | 2 |
| | Avisar al operador que se energizará | radio | 2 |
| | Retirar SOLO tus candados y tarjetas | lockpoints sin candado propio | 3 |
| | Cerrar purga, abrir succión y descarga, cerrar interruptor | estados | 3 |
| | Cerrar el permiso | `permiso = cerrado` | 2 |
Total 100 (ajustar en el archivo si se cambian pasos).

## Errores
| Id | Disparo | Severidad | Consecuencia / mensaje |
|---|---|---|---|
| `sin-permiso` | Primera acción de aislamiento sin permiso firmado | mayor | "Todo trabajo de mantenimiento requiere permiso firmado antes de empezar." |
| `sin-notificar` | Parar la bomba sin notificar al operador | mayor | "Parar un equipo sin avisar afecta el proceso y a otras personas." |
| `interruptor-bajo-carga` | Abrir el interruptor con el motor en marcha | mayor | Arco/ruido en el CCM. "Primero se para con el pulsador normal." |
| `equipo-equivocado` | Bloquear un interruptor distinto a P-101 | mayor | Se detecta en la verificación: la bomba **arranca** al probar → aviso |
| `candado-prestado` | Usar candado amarillo genérico | mayor | "El candado es personal: una persona, un candado, una llave." |
| `tarjeta-sin-candado` | Poner tarjeta sin candado en un punto | mayor | "La tarjeta informa, el candado impide." |
| `purga-con-valvulas-abiertas` | Abrir purga con succión o descarga abiertas | **crítico** | Chorro de agua caliente desde el drenaje → quemadura simulada |
| `trabajo-sin-verificar` | `sello:desmontar` sin completar la fase 6 | **crítico** | **Arranque inesperado** del motor (sonido, rotación, vibración, flash rojo) |
| `trabajo-con-presion` | Desmontar con presión ≠ 0 | **crítico** | Fuga a presión de agua caliente |
| `retirar-candado-ajeno` | Quitar el candado del electricista | **crítico** | "Retirar el candado de otra persona puede matarla. Nunca." |
| `energizar-sin-avisar` | Cerrar interruptor sin avisar / con candados puestos | mayor | — |
| `fuera-de-orden` | Paso de fase strict adelantado | menor | Aviso del orden correcto |

## Variaciones por semilla (práctica/evaluación)
- Posición del interruptor P-101 en el CCM.
- El probador de tensión puede venir **descargado** (falla en la prueba en fuente conocida) → el aprendiz
  debe cambiarlo por el de repuesto; si mide con él → error mayor "probador sin verificar".

## Debrief (puntos clave)
1. Identifica TODAS las energías, no solo la eléctrica.
2. Secuencia: preparar → avisar → apagar → aislar → bloquear/etiquetar → liberar energía almacenada → **verificar** → trabajar.
3. Un candado = una persona = una llave. Nunca se retira el candado de otro.
4. La verificación (intentar arrancar + probar-medir-probar) es la que te salva si aislaste lo equivocado.
