// PM2 Ecosystem Config — pilar.cp2b.unicamp.br
// Usage:
//   First deploy:  pm2 start ecosystem.config.js
//   Restart:       pm2 restart pilar-backend pilar-frontend
//   Save:          pm2 save
//   On boot:       pm2 startup (run the printed command as root)
//   Frontend:      frontend/deploy.sh builds, swaps in and restarts it

// This file's directory: /var/www/pilar2b/repo/cp2b-workspace/NewLook on the VM.
const REPO_ROOT = __dirname;

module.exports = {
  apps: [
    {
      name: 'pilar-backend',
      script: `${REPO_ROOT}/backend/.venv/bin/uvicorn`,
      args: 'app.main:app --host 127.0.0.1 --port 8001 --workers 2',
      cwd: `${REPO_ROOT}/backend`,
      interpreter: 'none',
      autorestart: true,
      watch: false,
      max_memory_restart: '1500M',
      env: {
        APP_ENV: 'production',
        DEBUG: 'false',
      },
    },
    {
      // The standalone server (next.config.js output: 'standalone'); `next start`
      // does not serve that output. Apache reads /pilar2b/_next from the same
      // .next/standalone directory.
      name: 'pilar-frontend',
      script: `${REPO_ROOT}/frontend/.next/standalone/server.js`,
      cwd: `${REPO_ROOT}/frontend`,
      autorestart: true,
      watch: false,
      max_memory_restart: '1500M',
      env: {
        NODE_ENV: 'production',
        PORT: '3002',
        // Not 127.0.0.1: Next 16 then proxies the locale rewrites of
        // src/proxy.ts to localhost:3002 and every page answers 500.
        HOSTNAME: '0.0.0.0',
        // The Next server reads the API directly (landing counts, municipality
        // pages), not through the public https address (src/lib/serverApi.ts).
        API_INTERNAL_URL: 'http://127.0.0.1:8001',
      },
    },
  ],
};
