# 04 — Escenario 2: Trabajo en alturas — cambio de luminaria en plataforma

> Referencias: Resolución 4272 de 2021 (Colombia, trabajo en alturas desde 2 m), ANSI/ASSP Z359,
> OSHA 1926 Subpart M. Valores numéricos en `src/scenarios/limits.js` marcados `// VALIDAR HSE`.
> **Debe validarlo un profesional HSE** antes de uso oficial.

## Situación
"La luminaria de la plataforma de inspección del rack de tuberías (6 m de altura) está dañada. Debes
cambiarla. Parte de la plataforma tiene un tramo **sin baranda** (en reparación)."

## Entorno (`src/world/alturas/`)
- Rack/estructura metálica con plataforma de rejilla a **6 m**, baranda perimetral salvo un tramo de 3 m
  (borde expuesto, marcado con cinta). Escalera vertical **con jaula** (reutilizar escaleras/jaulas y
  `climbs` de `R\mr-twin\src\plant\walk.js`).
- Luminaria en el extremo cercano al borde expuesto: solo se alcanza estando a < 1 m del borde.
- **Puntos de anclaje**: 1 certificado (placa amarilla "PUNTO DE ANCLAJE 5.000 lb / 22,2 kN"), y
  distractores: tubería de 2", baranda, bandeja portacables.
- **Caseta de EPP**: 3 arneses (uno con defecto según semilla: costura cortada, argolla D deformada o
  etiqueta ilegible/vencida), eslingas con absorbedor (una sin absorbedor), doble eslinga, cascos con y
  sin barbuquejo, bolso de herramientas, amarres de herramienta.
- Conos, cinta y barrera para acordonar el área inferior. NPC compañero que pasa por debajo.
- Tablero con permiso de trabajo en alturas y ATS (análisis de trabajo seguro).

## Fases y pasos
| Fase (orden) | Paso | Pts |
|---|---|---|
| **1. Planear** (any) | Diligenciar ATS en la tableta (peligros: caída de persona, caída de objetos, eléctrico de la luminaria) | 6 |
| | Firmar permiso de trabajo en alturas | 5 |
| | Bloquear el circuito de la luminaria (mini-LOTO: interruptor de alumbrado + candado) | 6 |
| | Acordonar el área bajo la plataforma | 6 |
| **2. Equipo** (any) | Inspeccionar los arneses (puntos: correas, costuras, argollas D, hebillas, etiqueta) y elegir uno sin defectos | 10 |
| | Ponerse y **ajustar** el arnés (pecho y piernas) | 5 |
| | Casco con barbuquejo | 3 |
| | Elegir eslinga con absorbedor (doble para desplazamientos) e inspeccionarla | 6 |
| | Herramientas en bolso con amarres (manos libres para subir) | 5 |
| **3. Cálculo** | Quiz en tableta: requerimiento de claridad de caída. Datos en pantalla: eslinga 1,8 m + elongación absorbedor 1,07 m + estatura bajo el anclaje 1,5 m + margen 0,6 m ≈ 5,0 m < 6 m → **apto** (valores en `limits.js`, VALIDAR HSE) | 6 |
| **4. Acceso** (strict) | Subir por la escalera con jaula con manos libres (3 puntos de contacto) | 5 |
| | En la plataforma, antes de la zona de borde: conectar la eslinga al **punto de anclaje certificado** | 10 |
| **5. Trabajo** | Cambiar la luminaria (herramientas amarradas) | 6 |
| **6. Bajar y cerrar** (strict) | Desconectar solo en zona protegida, bajar, retirar acordonamiento, desbloquear, cerrar permiso | 6 |
| **7. Rescate** (quiz) | "Tu compañero quedó suspendido en el arnés": activar plan de rescate de inmediato (trauma por suspensión); no intentar subir sin equipo | 5 |
Total 100.

## Zonas y reglas espaciales
- **Zona de borde**: volumen a < 1,5 m del tramo sin baranda. Entrar allí sin `anchor = conectado`
  dispara el error crítico de caída. La comprobación es `{ near: ['borde', 1.5] }` evaluada en `tick`.
- Desplazarse entre anclajes con doble eslinga: si en algún momento hay 0 conexiones dentro de la zona → crítico.

## Errores
| Id | Disparo | Severidad | Consecuencia |
|---|---|---|---|
| `borde-sin-conexion` | Entrar a la zona de borde sin estar conectado | **crítico** | **Caída** simulada: la vista desciende rápido (sin rotar, fundido a negro antes del suelo para no marear) + explicación |
| `anclaje-no-certificado` | Conectar a tubería/baranda/bandeja | **crítico** (si luego entra al borde) / mayor (si corrige antes) | "La tubería no está diseñada para detener una caída" |
| `arnes-defectuoso` | Ponerse el arnés con defecto | mayor; **crítico** si luego entra a la zona de borde | Se rompe en la caída simulada |
| `eslinga-sin-absorbedor` | Usar eslinga sin absorbedor | mayor | — |
| `arnes-sin-ajustar` | Subir sin ajustar | mayor | — |
| `subir-con-herramienta-en-mano` | `climb` con herramienta en la mano | mayor | "Tres puntos de contacto: las manos libres" |
| `sin-acordonar` | Empezar el trabajo sin acordonar | mayor; si cae una herramienta sobre el NPC → **crítico** | Objeto que cae y golpea |
| `herramienta-sin-amarre` | Usar herramienta sin amarre | menor (y probabilidad de caída de objeto por semilla) | — |
| `casco-sin-barbuquejo` | — | menor | — |
| `sin-bloqueo-electrico` | Desmontar la luminaria energizada | mayor | Chispa + aviso |

## Comodidad (importante en este escenario)
La "caída" nunca rota la cámara ni la mueve más de ~1,5 s; se usa viñeta fuerte y fundido. Antes del
escenario, aviso en el lobby: "incluye sensación de altura; puedes salir con el botón Y → Salir".

## Debrief
1. Desde 2 m de altura aplica la norma: permiso, ATS, EPP inspeccionado.
2. 100 % de conexión: siempre conectado a un anclaje certificado cuando hay riesgo de caída.
3. Calcula la claridad de caída: un arnés que deja golpear el suelo no sirve.
4. Acordona abajo y amarra herramientas: la caída de objetos también mata.
5. Ten plan de rescate: la suspensión prolongada en el arnés es una emergencia.
