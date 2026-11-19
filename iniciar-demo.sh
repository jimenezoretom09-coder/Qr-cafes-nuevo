#!/usr/bin/env bash
# RMS Cafés — demo local (Mac/Linux). En Windows usa iniciar-demo.bat.
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null; then
  echo "Falta Node.js. Descárgalo de https://nodejs.org (versión LTS) y vuelve a intentar."
  exit 1
fi
[ -d node_modules ] || npm install
node scripts/demo-local.mjs
