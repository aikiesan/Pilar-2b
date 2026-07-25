# PILAR-2b Subpath Migration Plan

## cp2b.unicamp.br/pilar2b

**Goal:** Move PILAR-2b from the broken pilar2b.cp2b.unicamp.br subdomain setup to running cleanly under cp2b.unicamp.br/pilar2b, served by the same Apache instance and certificate as cp2bfun.

**Prerequisites before starting:**

* SSH access to the VM with sudo ✓  
* Both repos cloned on the VM (or you can clone fresh)  
* Node.js 20+ and Python 3.11+ installed on VM  
* Apache2 already running and serving cp2b.unicamp.br ✓

---

## Phase 1 — Reconnaissance on the VM (30 min)

Before touching any code, map out what's actually running.

\# What's listening on which ports?

sudo ss \-tlnp | grep \-E '80|443|3000|3001|8000'

\# Is Apache running and what config is active?

sudo apache2ctl \-S

sudo cat /etc/apache2/sites-enabled/\*.conf

\# What Node/Python processes are running?

pm2 list         \# if pm2 is installed

sudo systemctl list-units \--type=service | grep \-E 'cp2b|pilar'

\# Where are the current cp2bfun files deployed?

ls /var/www/

\# Check Apache modules needed for proxying are enabled

apache2ctl \-M | grep \-E 'proxy|rewrite|headers'

**What you're looking for:**

* Confirm cp2bfun frontend is at /var/www/cp2b/frontend/dist (or wherever)  
* Confirm Express backend is running on :3001  
* Confirm no PILAR-2b process is running yet  
* Confirm proxy, proxy\_http, headers, rewrite Apache modules are enabled

If proxy modules are missing, enable them now:

sudo a2enmod proxy proxy\_http headers rewrite

sudo systemctl reload apache2

---

## Phase 2 — PILAR-2b Backend (FastAPI) Setup (1–2 hours)

### 2a. Clone / update the repo on the VM

cd /opt   \# or wherever you want to host it

sudo git clone https://github.com/aikiesan/Pilar-2b.git pilar2b

\# OR if already cloned:

cd /opt/pilar2b && sudo git pull

### 2b. Set up Python environment and install dependencies

cd /opt/pilar2b/cp2b-workspace/NewLook/backend

python3 \-m venv venv

source venv/bin/activate

pip install \-r requirements.txt

### 2c. Create the .env file for the backend

sudo nano .env

Minimum required variables:

DATABASE\_URL=\<your Supabase connection string\>

SUPABASE\_URL=\<your Supabase URL\>

SUPABASE\_KEY=\<your Supabase anon key\>

ALLOWED\_ORIGINS=https://cp2b.unicamp.br

**Important:** ALLOWED\_ORIGINS must include https://cp2b.unicamp.br — this is what fixes the CORS issue when requests come from the new URL.

### 2d. Test the FastAPI backend manually

source venv/bin/activate

uvicorn app.main:app \--host 127.0.0.1 \--port 8000

\# In another terminal:

curl http://localhost:8000/health

If it returns a healthy response, kill it and proceed.

### 2e. Create a systemd service for FastAPI

sudo nano /etc/systemd/system/pilar2b-api.service

\[Unit\]

Description\=PILAR-2b FastAPI Backend

After\=network.target

\[Service\]

User\=www-data

WorkingDirectory\=/opt/pilar2b/cp2b-workspace/NewLook/backend

ExecStart\=/opt/pilar2b/cp2b-workspace/NewLook/backend/venv/bin/uvicorn app.main:app \--host 127.0.0.1 \--port 8000

Restart\=on-failure

RestartSec\=5

Environment\=PYTHONUNBUFFERED\=1

\[Install\]

WantedBy\=multi-user.target

sudo systemctl daemon-reload

sudo systemctl enable pilar2b-api

sudo systemctl start pilar2b-api

sudo systemctl status pilar2b-api

---

## Phase 3 — PILAR-2b Frontend (Next.js) Code Changes (2–4 hours)

This is the most delicate phase. Work locally on your dev machine, test, then deploy to the VM.

### 3a. Add basePath to next.config.js

Open cp2b-workspace/NewLook/frontend/next.config.js and add basePath:

const nextConfig \= {

 basePath: '/pilar2b',        // ← ADD THIS LINE

 turbopack: {},

 // ... rest of config unchanged

}

### 3b. Fix the next-intl routing middleware

Open cp2b-workspace/NewLook/frontend/src/config/i18n.ts.

The localePrefix: 'always' setting needs to be aware of the basePath. Check if there's a middleware file at src/middleware.ts — if so, it should not need changes since next-intl respects basePath automatically. But **test this first** — navigate to localhost:3000/pilar2b/pt-BR/dashboard locally and confirm routing works before deploying.

If locale redirects break, change localePrefix from 'always' to 'as-needed' as a fallback:

localePrefix: 'as-needed'

### 3c. Fix all hardcoded URLs

Search and replace https://pilar2b.vercel.app with https://cp2b.unicamp.br/pilar2b in:

* src/app/sitemap.ts  
* src/app/robots.ts  
* src/app/\[locale\]/layout.tsx (JSON-LD schema.org block)

In next.config.js, update the fallback API URL:

NEXT\_PUBLIC\_API\_URL: process.env.NEXT\_PUBLIC\_API\_URL || 'https://cp2b.unicamp.br/pilar2b/api',

### 3d. Build the Next.js app

cd cp2b-workspace/NewLook/frontend

npm install

NEXT\_PUBLIC\_API\_URL\=https://cp2b.unicamp.br/pilar2b/api npm run build

Watch for build errors. The most likely failure point is next-intl complaining about basePath — fix as described in 3b if needed.

### 3e. Deploy the built app to the VM

Copy the standalone output to the VM:

\# On your local machine:

rsync \-avz .next/standalone/ user@vm-ip:/opt/pilar2b-frontend/

rsync \-avz .next/static/ user@vm-ip:/opt/pilar2b-frontend/.next/static/

rsync \-avz public/ user@vm-ip:/opt/pilar2b-frontend/public/

### 3f. Create a systemd service for Next.js

On the VM:

sudo nano /etc/systemd/system/pilar2b-frontend.service

\[Unit\]

Description\=PILAR-2b Next.js Frontend

After\=network.target

\[Service\]

User\=www-data

WorkingDirectory\=/opt/pilar2b-frontend

ExecStart\=/usr/bin/node server.js

Restart\=on-failure

RestartSec\=5

Environment\=NODE\_ENV\=production

Environment\=PORT\=3000

Environment\=HOSTNAME\=127.0.0.1

Environment\=NEXT\_PUBLIC\_API\_URL\=https://cp2b.unicamp.br/pilar2b/api

\[Install\]

WantedBy\=multi-user.target

sudo systemctl daemon-reload

sudo systemctl enable pilar2b-frontend

sudo systemctl start pilar2b-frontend

sudo systemctl status pilar2b-frontend

\# Verify it's listening:

curl http://localhost:3000/pilar2b

---

## Phase 4 — Apache Configuration (1–2 hours)

### 4a. Edit the existing Apache vhost

sudo nano /etc/apache2/sites-enabled/cp2b.conf

Add these blocks **before** the existing SPA catch-all rewrite rule:

\# ── PILAR-2b API (FastAPI on :8000) ──────────────────────────────────

ProxyPreserveHost On

\# API routes first (more specific)

ProxyPass /pilar2b/api/ http://127.0.0.1:8000/api/

ProxyPassReverse /pilar2b/api/ http://127.0.0.1:8000/api/

\# ── PILAR-2b Frontend (Next.js standalone on :3000) ──────────────────

\# Next.js static assets

ProxyPass /pilar2b/\_next/ http://127.0.0.1:3000/pilar2b/\_next/

ProxyPassReverse /pilar2b/\_next/ http://127.0.0.1:3000/pilar2b/\_next/

\# All other /pilar2b routes go to Next.js

ProxyPass /pilar2b http://127.0.0.1:3000/pilar2b

ProxyPassReverse /pilar2b http://127.0.0.1:3000/pilar2b

**Critical ordering:** The /pilar2b/api/ and /pilar2b/\_next/ rules MUST come before the generic /pilar2b rule. Apache matches top-to-bottom.

### 4b. Test and reload Apache

sudo apache2ctl configtest   \# Must say "Syntax OK"

sudo systemctl reload apache2

### 4c. Smoke test

\# From the VM itself:

curl \-I http://localhost/pilar2b

curl \-I http://localhost/pilar2b/api/health

\# From your browser:

\# https://cp2b.unicamp.br/pilar2b

\# https://cp2b.unicamp.br/pilar2b/api/health

---

## Phase 5 — Add the Button to cp2bfun (30 min)

Open the cp2bfun home page component (likely cp2b\_web/src/pages/Home.jsx) and add a prominent card or button:

\<a href\="/pilar2b" className\="btn btn-primary btn-lg"\>

 Acessar PILAR-2b →

\</a\>

Rebuild and redeploy cp2bfun static files:

npm run build

sudo cp \-r dist/\* /var/www/cp2b/frontend/dist/

---

## Phase 6 — End-to-End Verification Checklist

Go through each of these manually in the browser:

* não concluído  
* https://cp2b.unicamp.br loads the cp2bfun home page normally  
* não concluído  
* The new PILAR-2b button on the home page is visible  
* não concluído  
* Clicking the button navigates to https://cp2b.unicamp.br/pilar2b  
* não concluído  
* The PILAR-2b map page loads (tiles appear, no blank screen)  
* não concluído  
* Language switcher works (URL changes to /pilar2b/en/...)  
* não concluído  
* Proximity analysis runs (click a point on the map, results appear)  
* não concluído  
* https://cp2b.unicamp.br/pilar2b/api/health returns JSON  
* não concluído  
* No mixed-content warnings in browser console (all requests are HTTPS)  
* não concluído  
* cp2bfun's own routes still work: /sobre, /pesquisa, /equipe

---

## Known Failure Points & Fixes

| Symptom | Likely cause | Fix |
| :---- | :---- | :---- |
| /pilar2b returns 404 | Apache proxy rule not loaded | sudo systemctl reload apache2, check apache2ctl \-S |
| Map loads but API calls fail | CORS rejection | Check ALLOWED\_ORIGINS in FastAPI .env, restart pilar2b-api |
| Page loads but no styles | \_next/static proxy rule missing or wrong | Verify the \_next ProxyPass rule is above the generic one |
| Locale redirect loop | next-intl \+ basePath conflict | Switch localePrefix to 'as-needed', rebuild, redeploy |
| 502 Bad Gateway | Next.js or FastAPI service not running | sudo systemctl status pilar2b-frontend pilar2b-api |
| cp2bfun routes broken | Apache rewrite order wrong | Make sure all /pilar2b\* proxy rules come before the SPA fallback |

---

## Time Budget for Tomorrow

| Phase | Estimated time |
| :---- | :---- |
| Phase 1 — VM recon | 30 min |
| Phase 2 — FastAPI setup | 1–2 hours |
| Phase 3 — Next.js code \+ build | 2–4 hours |
| Phase 4 — Apache config | 1–2 hours |
| Phase 5 — cp2bfun button | 30 min |
| Phase 6 — Verification \+ debugging | 1–3 hours |
| **Total** | **\~6–12 hours** |

Go in order. Don't skip Phase 1 — knowing exactly what's on the VM before touching config files saves a lot of debugging time.

---

*Good luck tomorrow. Start a new session with SSH access open and share what Phase 1 reveals — the recon output will tell us if anything needs adjusting before we touch code.*  
