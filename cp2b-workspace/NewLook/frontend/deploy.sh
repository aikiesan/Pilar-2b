#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

npm run build

# Copy static assets and public folder into standalone output.
# Next.js does NOT do this automatically for standalone builds.
cp -r .next/static .next/standalone/.next/static
cp -r public       .next/standalone/public

# Full delete+start ensures PM2 picks up the current ecosystem.config.js
# (including PORT=3002). plain `pm2 restart` keeps stale in-memory config.
pm2 delete pilar-frontend 2>/dev/null || true
pm2 start ecosystem.config.js

echo "✅ Deploy complete"
