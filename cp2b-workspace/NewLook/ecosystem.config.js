// PM2 Ecosystem Config — pilar.cp2b.unicamp.br
// Usage:
//   First deploy:  pm2 start ecosystem.config.js
//   Restart:       pm2 restart pilar-backend pilar-frontend
//   Save:          pm2 save
//   On boot:       pm2 startup (run the printed command as root)

const REPO_ROOT = '/var/www/pilar2b/repo/cp2b-workspace/NewLook';

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
      name: 'pilar-frontend',
      script: 'npm',
      args: 'run start',
      cwd: `${REPO_ROOT}/frontend`,
      autorestart: true,
      watch: false,
      max_memory_restart: '1500M',
      env: {
        NODE_ENV: 'production',
        PORT: '3002',
        HOSTNAME: '127.0.0.1',
      },
    },
  ],
};
