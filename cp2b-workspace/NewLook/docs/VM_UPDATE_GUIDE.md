# PILAR-2b — VM Update Guide (Unicamp / Apache2 / Debian)

This guide covers updating the running production deployment on the Unicamp VM.
The database is already loaded; only code and dependency updates are needed.

---

## Environment

| Component | Detail |
|-----------|--------|
| Server | Debian, Apache2 reverse proxy |
| Deploy path | `/var/www/pilar2b/repo/cp2b-workspace/NewLook` |
| Backend | FastAPI via PM2 (`pilar-backend`), port **8001** |
| Frontend | Next.js via PM2 (`pilar-frontend`), port **3002** |
| Apache proxy | `/pilar2b/api/*` → `:8001` · `/pilar2b/*` → `:3002` |
| Python venv | `backend/.venv/` |
| Latest migration | `013_cp2b_municipality_summary.sql` |

---

## Step-by-Step Update Procedure

### 1. SSH and navigate

```bash
ssh <user>@cp2b.unicamp.br
cd /var/www/pilar2b/repo
```

### 2. Pull latest code

```bash
git pull origin main
```

Note what changed in the pull output — this determines which steps below are needed.

---

### 3. Backend: install new Python dependencies (only if `requirements.txt` changed)

```bash
cd /var/www/pilar2b/repo/cp2b-workspace/NewLook/backend
source .venv/bin/activate
pip install -r requirements.txt --quiet
```

---

### 4. Database: apply new migrations (only if new `.sql` files landed in `backend/app/migrations/`)

Check for new migrations since last deploy:

```bash
git log --oneline --diff-filter=A -- 'backend/app/migrations/*.sql' | head -10
```

If there are new migrations, run the migration runner:

```bash
cd /var/www/pilar2b/repo/cp2b-workspace/NewLook/backend
source .venv/bin/activate

# cp2b_migrate.py reads DATABASE_URL from the environment or backend/.env
DATABASE_URL=$(grep DATABASE_URL .env | cut -d= -f2-) \
  python scripts/cp2b_migrate.py
```

> **Never re-run migrations that already ran** — `cp2b_migrate.py` tracks applied
> migrations and skips already-applied ones, but double-check with the script output.

---

### 5. Frontend: rebuild (always required when any frontend file changed)

```bash
cd /var/www/pilar2b/repo/cp2b-workspace/NewLook/frontend

# Install any new npm packages.
#
# NOT `--omit=dev`: typescript is a devDependency, so that flag produces a tree
# that cannot build. The guard also self-heals a node_modules that has gone
# incomplete on its own -- observed 2026-09-21, where node_modules/next existed
# but node_modules/next/dist/bin/next did not and the build died with
# `sh: 1: next: not found`.
{ test -x node_modules/.bin/next || npm ci; }

# Build for production, then re-sync the standalone assets IN THE SAME CHAIN.
npm run build

# Re-sync the standalone assets. `next build` regenerates .next/standalone but
# does NOT place static/ or public/ inside it, so this copy is part of the build,
# not an optional extra. Skipping it leaves every CSS/JS chunk 404ing.
rm -rf .next/standalone/.next/static .next/standalone/public
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
```

Expected output ends with: `✓ Compiled successfully`

> ⚠️ **Never run `npm run build` on its own.** Each build replaces `.next/static`
> with freshly hashed chunks while the running server keeps serving from
> `.next/standalone/.next/static`. Build without the copy above and the live site
> stays up but loses every stylesheet and script. Keep the `&&` chain intact: it
> also means a failed build never deletes a working standalone bundle.

If the build fails, check:
- `cat .env.local` — is `NEXT_PUBLIC_API_URL` set to `https://cp2b.unicamp.br/pilar2b/api`?
- Node version: `node --version` (need ≥ 18.18)

---

### 6. Restart processes

```bash
cd /var/www/pilar2b/repo/cp2b-workspace/NewLook

# Restart the two PILAR processes BY NAME.
#
# Do NOT use `pm2 reload ecosystem.config.js`. That file declares
# `script: 'npm', args: 'run start'`, but the process actually running is
# `.next/standalone/server.js` (confirm with `pm2 describe pilar-frontend`).
# Reloading from the file would replace the running server with a different
# one. The live definition lives in ~/.pm2/dump.pm2, which `pm2 save` writes.
#
# Naming them also protects the other apps on this VM -- cp2b-backend,
# abiove-*, arqueia-*, postgrest-local -- which a config reload could disturb.
pm2 restart pilar-backend --update-env
pm2 restart pilar-frontend --update-env
pm2 save

# Confirm both processes are online
pm2 status
```

Expected output shows `pilar-backend` and `pilar-frontend` both in **online** status.

---

### 7. Smoke checks

```bash
# Backend health
curl -s http://localhost:8001/health | python3 -m json.tool

# Frontend response (via Apache proxy)
curl -sI https://cp2b.unicamp.br/pilar2b | head -5

# Check for Python errors in backend log
pm2 logs pilar-backend --lines 30 --nostream

# Check for Node errors in frontend log
pm2 logs pilar-frontend --lines 20 --nostream
```

---

### 8. Apache check (only if `next.config.js` or Apache vhost changed)

```bash
sudo apache2ctl configtest
sudo systemctl status apache2
```

---

## Quick Reference — Common Scenarios

### "I just merged a sprint with frontend changes only"

```bash
cd /var/www/pilar2b/repo
git restore cp2b-workspace/NewLook/frontend/next-env.d.ts
git pull origin main
cd cp2b-workspace/NewLook/frontend
{ test -x node_modules/.bin/next || npm ci; } && npm run build \
  && rm -rf .next/standalone/.next/static .next/standalone/public \
  && cp -r .next/static .next/standalone/.next/static \
  && cp -r public .next/standalone/public \
  && pm2 restart pilar-frontend --update-env && pm2 save
pm2 logs pilar-frontend --lines 10 --nostream
```

### "I added a new Python endpoint"

```bash
cd /var/www/pilar2b/repo
git pull origin main
cd cp2b-workspace/NewLook/backend
source .venv/bin/activate
pip install -r requirements.txt --quiet
cd ..
pm2 reload pilar-backend --update-env
pm2 logs pilar-backend --lines 10 --nostream
```

### "There are new database migrations"

```bash
cd /var/www/pilar2b/repo
git pull origin main
cd cp2b-workspace/NewLook/backend
source .venv/bin/activate
DATABASE_URL=$(grep DATABASE_URL .env | cut -d= -f2-) \
  python scripts/cp2b_migrate.py
pm2 reload pilar-backend --update-env
```

### "PM2 processes are down"

```bash
pm2 status                    # see what's down
pm2 restart pilar-backend     # restart specific process
pm2 restart pilar-frontend
pm2 save                      # persist config across reboots
```

### "Need to roll back to previous commit"

```bash
# Find the commit to roll back to
git log --oneline -10

# Roll back code (replace <hash> with target commit)
git checkout <hash> -- cp2b-workspace/NewLook/frontend/src
git checkout <hash> -- cp2b-workspace/NewLook/backend/app

# Rebuild and restart
cd cp2b-workspace/NewLook/frontend
{ test -x node_modules/.bin/next || npm ci; } && npm run build \
  && rm -rf .next/standalone/.next/static .next/standalone/public \
  && cp -r .next/static .next/standalone/.next/static \
  && cp -r public .next/standalone/public \
  && pm2 restart pilar-frontend --update-env && pm2 save
```

---

## Environment Files on the VM

The VM has two `.env` files that are **not tracked in git** (gitignored):

| File | Purpose |
|------|---------|
| `backend/.env` | `DATABASE_URL`, `SECRET_KEY`, `APP_ENV=production` |
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL=https://cp2b.unicamp.br/pilar2b/api` |

If these are ever lost, recreate from the example templates:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# Then edit both files with the actual credentials
```

---

## PM2 Startup (first-time or after reboot)

If PM2 is not running after a server reboot:

```bash
cd /var/www/pilar2b/repo/cp2b-workspace/NewLook
pm2 start ecosystem.config.js
pm2 save
# Run the startup command PM2 prints (if not already registered):
pm2 startup   # then copy-paste and run the printed command as root
```
