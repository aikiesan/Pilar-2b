#!/bin/bash
set -e

FRONTEND=/var/www/pilar2b/repo/cp2b-workspace/NewLook/frontend

echo "==> Building Next.js..."
cd $FRONTEND
npm run build

echo "==> Copying static assets to standalone..."
cp -r $FRONTEND/.next/static/ $FRONTEND/.next/standalone/.next/static/
cp -r $FRONTEND/public/ $FRONTEND/.next/standalone/public/

echo "==> Restarting PM2..."
pm2 restart pilar-frontend

echo "==> Done! Checking port..."
sleep 3
ss -tlnp | grep node
