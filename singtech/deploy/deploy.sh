#!/usr/bin/env bash
# Ships the app to the GPU box and restarts it. Run from singtech/: ./deploy/deploy.sh
# .env.local is copied once by hand (secrets); this script never sends or prints it.
set -euo pipefail
HOST=manan@buildabot.lykoi-typhon.ts.net
rsync -az --delete --exclude node_modules --exclude .next --exclude .data --exclude .env.local --exclude .git --exclude tsconfig.tsbuildinfo ./ "$HOST:~/singtech-app/"
ssh "$HOST" 'set -e; cd ~/singtech-app
  export PATH=$HOME/.local/pnpm/bin:$HOME/.local/share/fnm/node-versions/v20.20.2/installation/bin:$PATH CI=true
  pnpm install --frozen-lockfile --reporter=append-only >/tmp/pnpm-install.log 2>&1
  pnpm run build >/tmp/next-build.log 2>&1
  cp deploy/singtech-web.service ~/.config/systemd/user/ && systemctl --user daemon-reload
  systemctl --user enable --now singtech-web >/dev/null 2>&1; systemctl --user restart singtech-web
  sleep 4; curl -s -o /dev/null -w "local %{http_code}\n" http://127.0.0.1:3000/'
curl -s -o /dev/null -w "public %{http_code}\n" https://singtech.manansethia.com/
