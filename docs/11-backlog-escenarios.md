# 11 — Backlog de escenarios y funciones (después del MVP)

Cada escenario nuevo = `src/scenarios/<id>.js` + `src/world/<id>/` + pruebas. Si necesita un kind nuevo,
agregarlo al motor con sus pruebas (sin romper los existentes).

## Escenarios candidatos
| Escenario | Núcleo didáctico | Kinds nuevos probables |
|---|---|---|
| Permiso de trabajo y ATS | Identificar peligros y controles antes de cualquier tarea | `hazard` (señalar peligro) |
| "Encuentra el peligro" (inspección) | Recorrido libre: detectar condiciones inseguras sembradas por semilla | `hazard` |
| Selección y uso de EPP | Elegir EPP según la tarea y la hoja de seguridad | `ppe` |
| Respuesta a conato de incendio | Alarma, evacuar o atacar; clase de fuego → extintor; técnica PASS | `extinguisher`, `fire` |
| Derrame de sustancia química | SGA/hoja de seguridad, contención, kit antiderrames, reporte | `spill`, `sds` |
| Trabajo en caliente | Permiso, vigía de fuego, retirar combustibles, medición LEL | reutiliza `gasdetector` |
| Izaje de cargas | Inspección de aparejos, señalización, zona de exclusión | `rigging`, `crane` |
| Riesgo eléctrico — 5 reglas de oro | Corte, bloqueo, verificación, puesta a tierra, señalización | `grounding` |
| Evacuación y punto de encuentro | Rutas, conteo, roles de brigada | `exit` |
| Vehículos y peatones en planta | Rutas peatonales, puntos ciegos | `vehicle` |

## Funciones
- Sincronización de resultados con servidor / LMS (xAPI o SCORM), panel web del cliente.
- Modo instructor en vivo: ver progreso del aprendiz en el PC por red local.
- Multiusuario (instructor + aprendiz en la misma escena).
- Voz de instrucciones (pregrabada o TTS) y versión en inglés.
- Variantes por industria (petróleo y gas, minería, energía, alimentos) reutilizando escenarios con otro entorno.
- Editor de escenarios (formulario web que genera el archivo de datos).
