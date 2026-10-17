# 00 — Visión y alcance

## Problema
La inducción y el reentrenamiento en tareas de alto riesgo (energías peligrosas, alturas, espacios
confinados) se hacen hoy con charlas, videos o en campo real. Las charlas no generan memoria de
procedimiento; el campo real expone a la persona (y al equipo) justo cuando menos sabe.

## Propuesta
**HSEQ Gate**: la persona se pone unas Meta Quest 3S y entra a un entorno industrial a escala real. Allí
ejecuta el procedimiento completo con las manos (mandos): pide el permiso, inspecciona el EPP, aísla
energías, pone su candado, mide gases, se conecta al punto de anclaje… El sistema:
- **guía** (modo aprendizaje), **sugiere** (práctica) o **solo observa** (evaluación);
- detecta **errores críticos** y muestra su **consecuencia simulada** (arranque inesperado, caída
  detenida o no, desvanecimiento por atmósfera), seguida de la explicación;
- **evalúa** con puntaje, tiempo y lista de errores, y deja un **registro** por persona.

"Gate" = la puerta que hay que cruzar (aprobar) antes de hacer la tarea real.

## Usuarios
| Rol | Qué hace |
|---|---|
| **Aprendiz** (operador, técnico, contratista) | Recorre escenarios en VR, recibe retroalimentación |
| **Instructor HSE** | Lanza sesiones, proyecta lo que ve el aprendiz (cast), revisa resultados |
| **Cliente / empresa** | Compra el paquete; quiere evidencia de entrenamiento (registros, certificado) |

## Alcance del MVP (lo que debe estar al llegar al punto de revisión)
1. **Lobby** (sala de inducción) en VR: identificación del aprendiz, selección de escenario y modo.
2. Tres escenarios completos, cada uno en los 3 modos:
   - **LOTO** — mantenimiento de una bomba centrífuga con motor eléctrico (`docs/03`).
   - **Alturas** — cambio de una luminaria / inspección en plataforma elevada (`docs/04`).
   - **Espacios confinados** — ingreso a un tanque para inspección (`docs/05`).
3. Motor de escenarios por datos (`docs/02`): agregar un escenario = escribir un archivo de datos +
   su entorno procedural.
4. Evaluación y registros locales, exportables (CSV/JSON) y certificado imprimible (`docs/07`).
5. Funciona sin conexión tras la primera carga (PWA) y como APK inmersivo de Quest (`docs/10`).
6. Rendimiento estable a 72 Hz en Quest 3S (`docs/09`).

## Fuera del MVP
Multiusuario, backend/LMS (SCORM/xAPI), voz sintetizada, seguimiento de manos, más escenarios
(ver `docs/11`), edición de escenarios por interfaz.

## Principios
- **Procedimiento antes que espectáculo**: cada interacción representa una decisión real del procedimiento.
- **El error enseña**: un error crítico se ve y se explica; no solo resta puntos.
- **Configurable por HSE**: pasos y umbrales en datos, revisables por un experto sin tocar el motor.
- **Ligero**: geometría procedural, cero modelos pesados, offline.
