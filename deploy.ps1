# Despliegue de HSEQ Gate a https://digital-twins.voltac.com.co/hseq/
# (mismo VPS y raiz nginx que Smart Plant 3D; NO toca /, /mr/, /pid/, /lib/ ni /.well-known/)
#
# Lo ejecuta el DUENO en la Etapa 9 (punto de revision), en el PC, NO dentro de una sesion SSH:
#   powershell -ExecutionPolicy Bypass -File .\deploy.ps1              compila, prueba y sube
#   powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -SkipBuild   sube sin recompilar
#   powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -DryRun      solo muestra lo que haria
param([switch]$SkipBuild, [switch]$DryRun)

$key  = Join-Path $env:USERPROFILE '.ssh\voltac_vps'
$vps  = 'root@158.220.113.5'
$root = '/var/www/digital-twins'
$base = 'https://digital-twins.voltac.com.co'
$dir  = Split-Path -Parent $MyInvocation.MyCommand.Path

function Step($t)     { Write-Host ''; Write-Host "== $t" -ForegroundColor Cyan }
function Check($what) { if ($LASTEXITCODE -ne 0) { throw "Fallo: $what (codigo $LASTEXITCODE)" } }
function Run($desc, [scriptblock]$cmd) { if ($DryRun) { Write-Host "  (simulado) $desc" } else { & $cmd; Check $desc } }

if (-not $DryRun -and -not (Test-Path $key)) { throw "No encuentro la llave SSH: $key" }
if (-not (Test-Path (Join-Path $dir 'deploy-remote.sh'))) { throw 'Falta deploy-remote.sh' }

if (-not $SkipBuild) {
  Step 'Compilando la app (npm run build) y probando (npm test)'
  Push-Location (Join-Path $dir 'app')
  try { npm.cmd run build; Check 'npm run build'; npm.cmd test; Check 'npm test' } finally { Pop-Location }
}
$dist = Join-Path $dir 'app\dist'
if (-not (Test-Path (Join-Path $dist 'index.html'))) { throw 'No hay app\dist. Ejecuta sin -SkipBuild.' }

Step 'Subiendo app\dist a hseq.tmp'
Run 'preparar carpeta temporal' { ssh -i $key $vps "rm -rf $root/hseq.tmp" }
Run 'subir dist' { scp -i $key -r $dist "${vps}:$root/hseq.tmp" }
Run 'subir script remoto' { scp -i $key (Join-Path $dir 'deploy-remote.sh') "${vps}:/tmp/hseq-remote.sh" }

Step 'Aplicando en el servidor (reemplazo de /hseq/)'
Run 'script remoto' { ssh -i $key $vps "tr -d '\r' < /tmp/hseq-remote.sh | bash; rc=`$?; rm -f /tmp/hseq-remote.sh; exit `$rc" }

if ($DryRun) { Write-Host ''; Write-Host 'Simulacion terminada: no se subio nada.' -ForegroundColor Yellow; return }

Step 'Verificando'
$bad = 0
foreach ($p in '/hseq/', '/hseq/manifest.json', '/hseq/sw.js', '/hseq/icons/icon-512.png', '/mr/', '/') {
  $code = curl.exe -s -o NUL -w '%{http_code}' "$base$p"
  $ok = ($code -eq '200'); if (-not $ok) { $bad++ }
  $color = 'Red'; if ($ok) { $color = 'Green' }
  Write-Host ('  {0,-26} {1}' -f $p, $code) -ForegroundColor $color
}
$html = (curl.exe -s "$base/hseq/") | Out-String
if (-not $html.Contains('/hseq/assets/')) { $bad++; Write-Host '  contenido /hseq/ INCORRECTO' -ForegroundColor Red } else { Write-Host '  contenido /hseq/ correcto' -ForegroundColor Green }
Write-Host ''
if ($bad -eq 0) { Write-Host 'Despliegue correcto: https://digital-twins.voltac.com.co/hseq/' -ForegroundColor Green } else { Write-Host "Hay $bad verificaciones fallidas." -ForegroundColor Red; exit 1 }
