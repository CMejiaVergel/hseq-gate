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
