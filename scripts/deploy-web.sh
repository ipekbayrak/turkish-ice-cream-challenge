#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export PATH="/Users/mustafa/.nvm/versions/node/v24.12.0/bin:$PATH"

echo "==> Building production web bundle (iPhone / Android / Desktop)..."
npm run build

echo "==> Syncing dist/ to hetzner-1 (ipekbayrak.com.tr/dondurma & dondurma.ipekbayrak.com.tr)..."
rsync -avz --delete "$ROOT_DIR/dist/" root@46.224.237.129:/srv/ipekbayrak/dist/dondurma/
ssh root@46.224.237.129 "cd /srv/ipekbayrak/dist && ln -sfn dondurma maras && ln -sfn dondurma turkish-ice-cream"

echo "==> Live URLs:"
echo "  - https://dondurma.ipekbayrak.com.tr"
echo "  - https://ipekbayrak.com.tr/dondurma/"
echo "  - https://ipekbayrak.com.tr/maras/"
echo "  - https://ipekbayrak.com.tr/turkish-ice-cream/"
