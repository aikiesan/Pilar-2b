#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

npm run build

cp -r .next/static .next/standalone/.next/static
cp -r public       .next/standalone/public

pm2 restart pilar-frontend

echo "✅ Deploy complete"
