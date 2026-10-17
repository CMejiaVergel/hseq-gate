# 10 — Despliegue, PWA y APK

> Todo lo de este documento que **publica o firma** lo ejecuta o aprueba el dueño en la Etapa 9.
> El asistente deja los scripts listos y probados en seco.

## Web
- Ruta propuesta (por defecto): **https://digital-twins.voltac.com.co/hseq/** en el mismo VPS y raíz nginx
  que Smart Plant 3D (`/var/www/digital-twins/hseq`). Alternativa: subdominio propio
  (`hseq.voltac.com.co`) → requiere DNS + bloque nginx + certificado; decisión del dueño.
- `deploy.ps1` / `deploy-remote.sh` adaptados de `R\` para subir solo `app/dist` a `hseq.tmp` y reemplazar
  `hseq` (no tocar `/`, `/mr/`, `/pid/`, `/.well-known/`). Ejecutar con
  `powershell -ExecutionPolicy Bypass -File .\deploy.ps1` (la política de PowerShell del PC bloquea scripts).

## PWA
`public/manifest.json` (id `/hseq/`, `start_url ./`, colores `#0b1220`, `ovr_package_name`
`co.com.voltac.hseqgate`, iconos 192/512/maskable) y `public/sw.js` (copiar de R, `VERSION = 'hseqgate-v1'`,
navegación red-primero, assets con hash caché-primero, jsdelivr caché-primero). Servir el manifiesto como
`.json` (nginx da `application/json`).

## APK de Quest (mismo proceso que Smart Plant 3D)
Paquete **`co.com.voltac.hseqgate`**, modo **immersive** (en modo 2D Horizon OS no expone WebXR), `startUrl`
`/hseq/?app=quest` (App.jsx entra solo a VR con ese parámetro), `enableXRScene: true` no es necesario
(sin MR) → `false`, sin Horizon Billing, sin micrófono ni geolocalización.

Pasos para el dueño (con lo aprendido; ver `R\ESTADO.md`):
1. `npm.cmd install -g @meta-quest/bubblewrap-cli` (usar `npm.cmd`: la política de PowerShell bloquea `npm.ps1`).
2. En `quest-apk\`: `bubblewrap.cmd init --manifest=https://<dominio>/hseq/manifest.json --metaquest`.
   Respuestas: Application ID `co.com.voltac.hseqgate` · modo **immersive** · orientación landscape · sin
   billing/geolocalización/micrófono · XR Scene **No** · keystore `android.keystore`, alias `android`.
3. Si falla al crear la llave (`keytool` no está en PATH), crearla así (pide la contraseña en pantalla):
   `& "$env:USERPROFILE\.bubblewrap\jdk\jdk-17.0.11+9\bin\keytool.exe" -genkeypair -alias android -keystore android.keystore -validity 20000 -keyalg RSA -keysize 2048 -dname "cn=Carlos Mejia, ou=Voltac Systems, o=Voltac Systems, l=Cartagena, c=CO"`
4. `bubblewrap build` falla con Node 24 (`spawn EINVAL`) → compilar a mano:
   ```
   $env:JAVA_HOME = "$env:USERPROFILE\.bubblewrap\jdk\jdk-17.0.11+9"; $env:ANDROID_HOME = "$env:USERPROFILE\.bubblewrap\android_sdk"
   .\gradlew.bat assembleRelease
   & "$env:ANDROID_HOME\build-tools\34.0.0\zipalign.exe" -f -p 4 app\build\outputs\apk\release\app-release-unsigned.apk app-release-aligned.apk
   & "$env:ANDROID_HOME\build-tools\34.0.0\apksigner.bat" sign --ks android.keystore --ks-key-alias android --out HSEQGate.apk app-release-aligned.apk
   ```
5. **assetlinks.json**: el dominio ya tiene `/.well-known/assetlinks.json` de Smart Plant 3D. **No
   sobrescribirlo**: agregar una segunda entrada al arreglo con `co.com.voltac.hseqgate` y la huella SHA-256
   de la nueva llave (`apksigner verify --print-certs HSEQGate.apk`).
6. Instalar/probar: `quest.ps1 -Install` (adb de Meta Quest Developer Hub).
7. Tienda: crear la app "HSEQ Gate" en el Developer Dashboard (organización Voltac Systems, acuerdo ya
   aceptado) → subir el APK al canal **ALPHA** → invitar correos. Subir `appVersionCode` en cada envío.

**La llave y su contraseña nunca van al repo ni al chat.** Copia de seguridad fuera del PC.

## Estado preparado en la Etapa 8 (listo para el dueño)
| Pieza | Estado |
|---|---|
| `deploy.ps1` + `deploy-remote.sh` | Adaptados a `/hseq/` (reemplazo de `hseq.tmp` → `hseq`, sin tocar `/`, `/mr/`, `/pid/`, `/lib/`, `/.well-known/`). Probado en seco: `powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -SkipBuild -DryRun`. **No ejecutado.** |
| `quest.ps1` | Paquete `co.com.voltac.hseqgate`; `-Install`, `-Stop`, `-PullResults` (trae `/sdcard/Download/hseqgate-*.json` a `resultados-quest\`). Sintaxis verificada; adb de Developer Hub encontrado. |
| `quest-apk\twa-manifest.json` | Modo **immersive**, `startUrl /hseq/?app=quest`, XR Scene no, sin notificaciones/micrófono/billing, `appVersionCode 1`, llave relativa `android.keystore` (alias `android`). |
| PWA | `manifest.json` (`ovr_package_name co.com.voltac.hseqgate`), `sw.js` `hseqgate-v1`; la prueba de humo verifica registro y **carga sin conexión**. |

Orden exacto para el dueño (en `HSEQ Gate\`):
```
powershell -ExecutionPolicy Bypass -File .\deploy.ps1          # 1. publicar /hseq/ (compila y prueba antes)
cd quest-apk
bubblewrap.cmd update                                          # 2. genera el proyecto Android desde twa-manifest.json
                                                               #    (si pide init: bubblewrap.cmd init --manifest=https://digital-twins.voltac.com.co/hseq/manifest.json --metaquest)
# 3. crear la llave (paso 3 de arriba) y compilar/firmar a mano (paso 4) → quest-apk\HSEQGate.apk
# 4. assetlinks.json: AGREGAR la entrada de co.com.voltac.hseqgate (paso 5), sin borrar la de Smart Plant 3D
cd ..
powershell -ExecutionPolicy Bypass -File .\quest.ps1 -Install  # 5. instalar y abrir en las gafas
```

**Pendiente de verificar en el visor real** (no se puede en el PC): que desde el APK inmersivo el panel del
instructor pueda descargar el JSON; si no, la vía es abrir `https://digital-twins.voltac.com.co/hseq/` en el
navegador del visor (mismo origen → mismos datos de IndexedDB… **verificar**: el APK TWA y el navegador
pueden no compartir almacenamiento) y exportar desde ahí; luego `quest.ps1 -PullResults`.
