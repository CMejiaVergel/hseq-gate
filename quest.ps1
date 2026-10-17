# HSEQ Gate en las Meta Quest, desde el PC (usa el adb de Meta Quest Developer Hub)
#
#   .\quest.ps1                abre la app en las gafas conectadas
#   .\quest.ps1 -Install       instala (o actualiza) quest-apk\HSEQGate.apk y la abre
#   .\quest.ps1 -Stop          cierra la app
#   .\quest.ps1 -PullResults   trae al PC los resultados exportados en las gafas
#                              (/sdcard/Download/hseqgate-*.json -> resultados-quest\)
#
# Gafas por USB, o sin cable: en Developer Hub activa "ADB over Wi-Fi" una vez con el cable puesto.
# Si PowerShell bloquea el script:  powershell -ExecutionPolicy Bypass -File .\quest.ps1
param([switch]$Install, [switch]$Stop, [switch]$PullResults)

$pkg = 'co.com.voltac.hseqgate'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$adb = @(
  'C:\Program Files\Meta Quest Developer Hub\resources\bin\adb.exe',
  (Join-Path $env:USERPROFILE '.bubblewrap\android_sdk\platform-tools\adb.exe')
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $adb) { throw 'No encuentro adb.exe (instala Meta Quest Developer Hub).' }

$dev = & $adb devices | Select-String -Pattern '\tdevice$'
if (-not $dev) { throw 'No hay gafas conectadas. Conectalas por USB (o ADB over Wi-Fi) y acepta la depuracion dentro del visor.' }

if ($Stop) { & $adb shell am force-stop $pkg; Write-Host 'App cerrada.'; return }

if ($PullResults) {
  $out = Join-Path $dir 'resultados-quest'
  New-Item -ItemType Directory -Force $out | Out-Null
  $files = & $adb shell 'ls /sdcard/Download/hseqgate-*.json 2>/dev/null'
  if (-not $files) { Write-Host 'No hay exportaciones en las gafas. En el visor: Panel del instructor -> Exportar JSON.'; return }
  foreach ($f in ($files -split "`n" | Where-Object { $_.Trim() })) { & $adb pull $f.Trim() $out | Out-Null; Write-Host "  $($f.Trim())" }
  Write-Host "Resultados en $out. Importalos en el PC: Panel del instructor -> Exportar / importar -> Importar JSON."
  return
}

if ($Install) {
  $apk = Join-Path $dir 'quest-apk\HSEQGate.apk'
  if (-not (Test-Path $apk)) { throw "No existe $apk (ver docs\10-despliegue-y-apk.md)" }
  Write-Host 'Instalando...'
  & $adb install -r $apk
  if ($LASTEXITCODE -ne 0) { throw 'Fallo la instalacion.' }
}

& $adb shell am start -n "$pkg/.LauncherActivity" | Out-Null
Write-Host 'HSEQ Gate abierta en las gafas. Ponte el visor.'
