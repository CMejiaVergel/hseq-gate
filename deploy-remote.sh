#!/bin/bash
# Se ejecuta EN el VPS (lo lanza deploy.ps1).  Reemplaza SOLO /hseq/; no toca /, /mr/, /pid/,
# /lib/ ni /.well-known/ (assetlinks.json de las apps de Quest).
set -euo pipefail
R="${DT_ROOT:-/var/www/digital-twins}"
cd "$R"
test -f hseq.tmp/index.html || { echo "hseq.tmp/index.html no existe"; exit 1; }
rm -rf hseq.old
if [ -d hseq ]; then mv hseq hseq.old; fi
mv hseq.tmp hseq
rm -rf hseq.old
chmod -R a+rX "$R/hseq"
ls -la "$R/hseq"
