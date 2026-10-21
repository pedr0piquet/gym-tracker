#!/usr/bin/env bash
# Sobe o servidor do Gym Tracker.
#   ./run.sh         modo desenvolvimento (reinicia sozinho ao salvar o código)
#   ./run.sh prod    modo produção (cookie Secure; use atrás do túnel HTTPS)
# Variáveis opcionais: PORT (padrão 3000), HOST (padrão 127.0.0.1), DB_PATH.
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v node >/dev/null; then
  echo "Node não encontrado. Instale com: sudo pacman -S nodejs npm" >&2
  exit 1
fi

# Instala as dependências na primeira vez ou quando o package.json mudar
if [[ ! -d node_modules || package.json -nt node_modules ]]; then
  echo "Instalando dependências..."
  npm install
  touch node_modules
fi

# Cria o banco (se preciso) e atualiza o catálogo; pode rodar sempre
npm run --silent seed

if [[ "${1:-}" == "prod" ]]; then
  export NODE_ENV=production
  exec npm start
else
  exec npm run dev
fi
