# 06 — Experiencia en VR, interacción y lobby

## Mandos (solo mandos; manos desactivadas como en Smart Plant 3D)
| Control | Acción |
|---|---|
| Stick izquierdo | Caminar (clic = correr) — reutilizar `VRRig` |
| Stick derecho ← → | Giro a saltos de 30° · ↑ mantener/soltar = teletransporte |
| **Gatillo derecho** | Interactuar con lo apuntado (abrir/cerrar, firmar, medir, botones de paneles) |
| **Grip derecho** | Tomar / soltar objeto (candado, tarjeta, detector, arnés, herramienta) |
| Botón A | Usar el objeto en mano sobre lo apuntado (poner candado, conectar eslinga, medir con sonda) · escaleras |
| Botón B | Inventario rápido (siguiente objeto en mano) |
| Botón Y | Mostrar/ocultar la **tableta** de la mano izquierda |
| Botón X | En aprendizaje: repetir la instrucción del paso |

En PC (`FirstPerson` de mr-twin): WASD + ratón; clic = gatillo; E = grip; F = A; Tab = tableta. Todo el
escenario debe poder completarse en PC (es como se prueba sin visor).

## Kit de interacción (`src/interact/`)
Cada objeto interactivo es un componente que:
1. construye su geometría procedural (y su malla de selección invisible en `PICK_LAYER`, como `buildPlant.js`);
2. lee su estado del runner (`useRunState(objId)`) para pintarse (válvula girada, candado puesto, pantalla del detector);
3. traduce la interacción en `run.act(objId, verbo, payload)`.

Lista mínima (Etapa 3): `Valve` (volante gira), `Breaker` (palanca CCM), `PushButton`, `LockPoint`
(muestra candados/tarjetas puestos, con nombre), `Item` (tomable: candado, tarjeta, cubre-volante, sonda,
herramienta), `Gauge` (aguja), `Tester`, `GasDetector` (pantalla con lienzo: O₂/LEL/H₂S/CO + alarma),
`Harness` (inspección por puntos en panel de detalle), `Anchor`, `Barrier`, `Door/Manhole`, `Fan`,
`Ladder` (reutilizar `climbs`), `Npc` (figura simple low-poly + panel de diálogo), `DocumentBoard`
(permiso/ATS con checklist y botón firmar).

**Inventario**: 2 ranuras visibles (mano derecha + cinturón). La tableta muestra el inventario completo.

## Paneles (todos con `Panel3D` de mr-twin)
- **Tableta** (mano izquierda, botón Y), pestañas: *Paso* (instrucción actual, en aprendizaje) · *Pista*
  (práctica, cuesta puntos) · *Checklist* (ATS / matriz de energías / identificación de peligros) ·
  *Inventario* · *Salir/Reiniciar*.
- **Aviso** (franja frente a la vista, 2,5 s): "✔ Paso completado", "⚠ error menor/mayor…".
- **Consecuencia crítica**: efecto (ver abajo) → panel central con *qué pasó*, *por qué*, *qué debiste hacer*
  y botones *Reintentar desde el paso* (aprendizaje/práctica) o *Ver resultado* (evaluación).
- **Debrief** al terminar: puntaje, aprobado/no, tiempo, errores con explicación, puntos clave, botones
  *Repetir* · *Volver al lobby*.
- **Documentos** (permiso, ATS): panel grande con casillas y firma.

## Resaltado y guía (modo aprendizaje)
- Contorno pulsante en el/los objeto(s) del paso actual (reutilizar `makeOutlineMaterial`).
- Flecha flotante si el objetivo está fuera de vista; distancia en metros.

## Efectos de consecuencia (`src/world/effects/`)
| Efecto | Implementación (ligera) |
|---|---|
| `arranque-inesperado` | Motor gira (rotación del acople), oscilador WebAudio de zumbido, vibración háptica, flash rojo en viñeta |
| `quemadura` / `fuga-presion` | Partículas simples (puntos) desde el punto, siseo con ruido blanco WebAudio, flash |
| `caida` | Viñeta fuerte + traslación vertical rápida ≤ 1,5 s **sin rotar** + fundido a negro antes del suelo |
| `desvanecimiento` | Oscurecimiento progresivo de la viñeta, leve balanceo de la viñeta (no de la cámara), audio filtrado (lowpass) |
| `objeto-cae` | Herramienta cae con gravedad simple; golpe sonoro |

Reutilizar la esfera de viñeta/fundido de `VRRig` (`fxMat`) para todo lo visual a pantalla completa.
**Sonido sin archivos**: WebAudio procedural (osciladores/ruido) → offline y ligero.

## Lobby — "Sala de inducción" (`src/world/lobby/`)
Sala simple con logo de Voltac, paneles grandes:
1. **Identificación**: teclado numérico 3D para la **cédula**; si está en el listado (roster) muestra el
   nombre; si no, permite seguir como "invitado" (el registro queda con la cédula).
2. **Escenarios**: tarjetas con título, duración, normas y mejor puntaje del aprendiz.
3. **Modo**: Aprendizaje · Práctica · Evaluación.
4. **Comenzar** → fundido → escenario. **Avisos** previos (altura, oscuridad) cuando aplique.

## Flujo de la app
- **APK / `?app=quest`**: splash (logo, versión, créditos) → lobby → escenario → debrief → lobby.
- **Navegador del visor**: portada 2D con botón "Entrar" → mismo flujo.
- **PC (instructor)**: portada 2D con *Recorrer en PC* y **Panel del instructor** (DOM, no VR): listado de
  aprendices (importar CSV), resultados, exportes y certificados (`docs/07`).

## Comodidad
Teletransporte y giro a saltos por defecto; viñeta al caminar; nada de rotaciones de cámara forzadas;
escenarios con altura avisan antes; botón Y → Salir siempre disponible.
