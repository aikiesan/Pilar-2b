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
| Frontend | Next.js standalone `server.js` via PM2 (`pilar-frontend`), port **3002** |
| Node | **≥ 20.9** (Next.js 16); CI uses Node 22 |
| Apache proxy | `/pilar2b/api/*` → `:8001` · `/pilar2b/*` → `:3002` |
| Python venv | `backend/.venv/` |
| Migrations | `backend/app/migrations/NNN_*.sql`, applied one by one with `psql` (step 4) |

---

## Step-by-Step Update Procedure

### 1. SSH and navigate

```bash
ssh <user>@cp2b.unicamp.br
cd /var/www/pilar2b/repo
```

### 2. Pull latest code

```bash
OLD=$(git rev-parse --short HEAD); echo "rollback point: $OLD"   # note it down
git restore cp2b-workspace/NewLook/frontend/next-env.d.ts        # `next build` rewrites it
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

List the migration files the pull added (same shell as step 2, so `$OLD` is set):

```bash
cd /var/www/pilar2b/repo
git diff --name-only --diff-filter=A "$OLD" HEAD -- cp2b-workspace/NewLook/backend/app/migrations/
```

If there are new migrations, apply **each new file**, in order, with `psql`:

```bash
cd /var/www/pilar2b/repo/cp2b-workspace/NewLook/backend
export DATABASE_URL=$(grep '^DATABASE_URL' .env | cut -d= -f2-)
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f app/migrations/<NNN_name>.sql
```

> ⚠️ `scripts/cp2b_migrate.py` does **not** apply `app/migrations/`: it re-runs
> two old files (`migrations/012`, `013`) every time. And do not point
> `scripts/run_migrations.py` at this database unless its `schema_migrations`
> table lists every migration already applied — otherwise it would re-apply all
> of them from 001, data updates included. Apply the new file by name, as above,
> and read what it says about being re-runnable before running it twice.

---

### 5. Frontend: `frontend/deploy.sh` (always, when any frontend file changed)

```bash
cd /var/www/pilar2b/repo/cp2b-workspace/NewLook/frontend
./deploy.sh
```

That one command pulls `main` (it stops on local changes or a branch that does
not fast-forward), builds, checks the new build, swaps it in, restarts
`pilar-frontend` and checks it again, through Apache too. If you already
pulled in step 2, it simply finds nothing new to pull.

Why not `npm run build` in place, as this guide used to say:

- **`next build` deletes `.next/` as its first step**, and `.next/standalone` is
  what PM2 runs and what Apache serves at `/pilar2b/_next`. An in-place build
  takes every stylesheet and script away from the live site for the whole
  build, and leaves it that way if the build fails. `deploy.sh` builds in
  `../.deploy/build` and only touches the live site once the new build has
  started and answered on a spare port (3012).
- **New packages.** The old guard `{ test -x node_modules/.bin/next || npm ci; }`
  only reinstalled when `next` itself was missing. The redesign (#244) added
  three packages (`@fontsource-variable/*`, the self-hosted fonts), so that
  guard skipped the install and the build failed. `deploy.sh` reinstalls
  whenever `package-lock.json` changed.
- **`HOSTNAME` must not be `127.0.0.1`.** With it, Next 16 sends the locale
  rewrites of `src/proxy.ts` to `localhost:3002` as if they were external, and
  every page answers 500. `deploy.sh` restarts the process with
  `HOSTNAME=0.0.0.0` (as `pm2 restart --update-env`, so it is stored).
- **`API_INTERNAL_URL=http://127.0.0.1:8001`.** The Next server itself reads the
  API for the landing counts and to resolve `/municipalities/<name>-sp`.
  Without it, it goes out through `https://cp2b.unicamp.br/pilar2b` from inside
  the VM, and if that hairpin fails every municipality page fails.
  `deploy.sh` sets it on the PM2 process.

What it checks, before and after the swap: the main pages answer 200; a
municipality page answers 200 when the API serves `/municipalities/names`; every
`/_next/static` file the landing page asks for, and every font its stylesheets
load, exists where Apache reads it; and Apache serves the page, a stylesheet and
a font. A failure before the swap leaves the live site as it was; a failure
after it puts the previous build back on its own.

Options:

```bash
./deploy.sh --no-pull       # deploy the checkout as it is (no git pull)
./deploy.sh --rollback      # previous build back in seconds; run again to undo
./deploy.sh --recreate-pm2  # recreate pilar-frontend from ../ecosystem.config.js
```

`--recreate-pm2` is needed once if `deploy.sh` stops with "PM2 'pilar-frontend'
runs …, not …/.next/standalone/server.js".

If the build fails, check:
- `node --version` — Next.js 16 needs **≥ 20.9** (`deploy.sh` stops earlier if not).
- `cat .env.local` — `NEXT_PUBLIC_API_URL=https://cp2b.unicamp.br/pilar2b`,
  **without** `/api` at the end (the code appends `/api/v1` itself; `deploy.sh`
  refuses a value ending in `/api`).
- The log above the error; nothing on the live site changed.

---

### 6. Restart the backend (only if backend code or dependencies changed)

```bash
# Restart BY NAME. Do NOT `pm2 reload ecosystem.config.js`: a config reload
# can disturb the other apps on this VM -- cp2b-backend, abiove-*, arqueia-*,
# postgrest-local. The live definition lives in ~/.pm2/dump.pm2 (`pm2 save`).
pm2 restart pilar-backend --update-env
pm2 save
pm2 status
```

The frontend was already restarted by `deploy.sh`.

---

### 7. Smoke checks

```bash
# Everything at once, read-only: deployed commit vs origin/main, PM2, the API
# endpoints the frontend reads, migrations 034-038, pages, redirects, and the
# CSS/JS/fonts as Apache serves them. Exit status 1 when something fails.
/var/www/pilar2b/repo/cp2b-workspace/NewLook/scripts/vm_verify.sh

# Or one by one:
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
/var/www/pilar2b/repo/cp2b-workspace/NewLook/frontend/deploy.sh
/var/www/pilar2b/repo/cp2b-workspace/NewLook/scripts/vm_verify.sh
```

### "How many people visit the site?"

Read-only report of the last 30 days: visits, pages, average visible time,
where visits come from, devices, the share of visitors who accept statistics
and the estimated number of visitors. The anonymous counts start on the day
migration 038 is applied.

```bash
cd /var/www/pilar2b/repo/cp2b-workspace/NewLook/backend
DB=$(grep '^DATABASE_URL' .env | cut -d= -f2-)
PGOPTIONS='-c default_transaction_read_only=on' psql "$DB" -X -P pager=off \
    -v days=30 -f scripts/analytics_report.sql
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
export DATABASE_URL=$(grep '^DATABASE_URL' .env | cut -d= -f2-)
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f app/migrations/<NNN_name>.sql   # each new file, in order
pm2 restart pilar-backend --update-env && pm2 save
```

### "PM2 processes are down"

```bash
pm2 status                    # see what's down
pm2 restart pilar-backend     # restart specific process
pm2 restart pilar-frontend
pm2 save                      # persist config across reboots
```

### "The new frontend is broken — roll back"

```bash
/var/www/pilar2b/repo/cp2b-workspace/NewLook/frontend/deploy.sh --rollback
```

Puts the previous build back (kept in `NewLook/.deploy/previous`) and restarts;
no build, a few seconds. Run it again to return to the newer build. The code
checkout is not changed: fix forward on `main` and run `deploy.sh` again.

---

## Environment Files on the VM

The VM has two `.env` files that are **not tracked in git** (gitignored):

| File | Purpose |
|------|---------|
| `backend/.env` | `DATABASE_URL`, `SECRET_KEY`, `APP_ENV=production` |
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL=https://cp2b.unicamp.br/pilar2b` (no `/api`: the code appends `/api/v1`) |

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
pm2 start ecosystem.config.js   # pilar-backend + pilar-frontend (standalone server.js)
pm2 save
# Run the startup command PM2 prints (if not already registered):
pm2 startup   # then copy-paste and run the printed command as root
```
