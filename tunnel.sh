#!/usr/bin/env bash
# Expõe o servidor local (./run.sh prod) na internet com HTTPS pelo Tailscale Funnel
# e grava o endereço público em pages/index.html (a página do GitHub Pages).
# Pode rodar de novo: pula o que já está feito. Pede a senha do sudo na primeira vez.
#   ./tunnel.sh         liga o Funnel
#   ./tunnel.sh off     desliga o Funnel
set -euo pipefail

cd "$(dirname "$0")"
PORT="${PORT:-3000}"

if [[ "${1:-}" == "off" ]]; then
  tailscale funnel --https=443 off
  echo "Funnel desligado."
  exit 0
fi

# 1. Instalar e ligar o serviço
if ! command -v tailscale >/dev/null; then
  echo "Instalando o Tailscale..."
  sudo pacman -S --needed --noconfirm tailscale
fi
if ! systemctl is-active --quiet tailscaled; then
  sudo systemctl enable --now tailscaled
fi

# 2. Entrar na conta (abre/mostra um link para fazer login no navegador)
if ! tailscale status >/dev/null 2>&1; then
  echo "Faça login na conta Tailscale pelo link abaixo:"
  sudo tailscale up
fi

# 3. Deixar o seu usuário controlar o Tailscale sem sudo (para o funnel e para o off)
if ! tailscale funnel status >/dev/null 2>&1; then
  sudo tailscale set --operator="$USER"
fi

# 4. Funnel: https://<pc>.<tailnet>.ts.net → http://127.0.0.1:$PORT
#    Na primeira vez, o Tailscale mostra um link para ativar HTTPS/Funnel na conta.
tailscale funnel --bg "$PORT"

URL="https://$(tailscale status --json | node -e '
  let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
    process.stdout.write(JSON.parse(s).Self.DNSName.replace(/\.$/, ""));
  });')"

# 5. Gravar o endereço na página do GitHub Pages
sed -i "s|^    const APP_URL = '[^']*';|    const APP_URL = '$URL';|" pages/index.html

echo
echo "Endereço público: $URL"
echo "Gravado em pages/index.html. Para o link do GitHub Pages redirecionar para ele:"
echo "  git add pages/index.html && git commit -m 'Endereço do servidor' && git push"
echo
echo "O servidor precisa estar rodando:  ./run.sh prod"
