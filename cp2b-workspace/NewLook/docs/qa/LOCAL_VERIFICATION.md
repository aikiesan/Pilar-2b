# Local verification — run the CI checks on your machine

Everything CI runs can be run locally, either directly (Git Bash on Windows,
macOS, Linux) or inside the Docker Desktop containers. One script does it all:
[`scripts/verify-local.sh`](../../scripts/verify-local.sh).

## 0. Get the code

In Git Bash (Windows paths become `/c/Users/...`):

```bash
cd /c/Users/Lucas/Documents/Pilar2b
git fetch origin
git checkout claude/wonderful-brown-5zber2
git pull
cd cp2b-workspace/NewLook
```

## 1. One command

```bash
./scripts/verify-local.sh --install all     # first run: installs deps, then everything
./scripts/verify-local.sh                   # later runs: frontend + backend
./scripts/verify-local.sh frontend          # only the frontend
./scripts/verify-local.sh e2e               # only the browser locale test
```

Each step runs even if an earlier one fails; the summary at the end lists what
passed and what failed, and the exit code is non-zero if anything failed.

| Step | What it proves |
|---|---|
| Typecheck | the code compiles, and every `t('key')` exists in the catalog |
| Lint | ESLint rules (0 errors expected; warnings are pre-existing) |
| i18n | catalogs in sync · no hardcoded Portuguese outside `PENDING` · patch notes bilingual · the scanner's own 18 tests |
| Unit tests | Jest suites (formatters, map metrics, components…) |
| Accessibility tests | axe checks on the UI components |
| Production build | `next build` succeeds — it type-checks files `tsc` alone can miss |
| Backend | Black, isort, Flake8, pytest (no database needed for the default suites) |
| E2E | a real browser opens every route in `ROUTES` under `/en/` and finds no Portuguese UI text |

## 2. Docker Desktop

The frontend image installs npm packages when it is **built**, so rebuild it
after pulling a branch that changes `package.json` (this one removes three
unused packages):

```bash
docker compose build frontend
docker compose up -d
./scripts/verify-local.sh --docker            # frontend + backend inside the containers
```

E2E needs a browser and runs on the host (`./scripts/verify-local.sh e2e`).
The app itself is at <http://localhost:3006/en/map> and
<http://localhost:3006/pt-BR/map>.

## 3. By hand, step by step

### Frontend

```bash
cd frontend
npm ci
npm run typecheck
npm run lint
npm run i18n:check
npm run i18n:scan -- --report     # what is still pending translation, file by file
npm test
npm run build
git checkout -- next-env.d.ts     # `next build` rewrites it; discard that change
```

### Browser locale test

```bash
cd frontend
npx playwright install chromium   # first time only
npx playwright test --project=public e2e/i18n.public.spec.ts
```

Playwright starts `npm run dev` itself on port 3000 (or reuses one already
running).

### Backend

```bash
cd backend
python -m venv venv
source venv/Scripts/activate      # Git Bash on Windows; macOS/Linux: source venv/bin/activate
pip install -r requirements.txt flake8
black . --check && isort . --check-only && flake8 app/ --max-line-length=100 --extend-ignore=E203,W503
pytest -q --no-cov
```

If `pip install` fails on Windows (GDAL, Fiona or Rasterio wheels), use the
Docker route instead — the backend image has them.

## 4. What to look at in the browser

The automated checks read the source and the first render. These are the
places where a person should look, in **both** `/en/` and `/pt-BR/`:

| Where | Check |
|---|---|
| Map → hover a municipality | tooltip label, unit and value in the page's language; "No data"/"Sem dados" where empty |
| Map → click a municipality | profile panel: numbers as `1,234` (en) vs `1.234` (pt-BR); `1.2M` vs `1,2 mi`; "% of total" |
| Map → legend | title and unit follow the selected metric; palette names in daltonic mode |
| Map → left panel → metric buttons | Biomass / Biogas / Biomethane / Bioenergy |
| Advanced analysis → correction factors | slider labels, tooltips, "Resulting FDE", decimals `0.95` vs `0,95` |
| `/en/guide/mapa` · `/en/guide/proximidade` | breadcrumb and "Other topics" in English |
| `/en/guide/does-not-exist` | a 404, not a Portuguese "Tópico não encontrado" |
| Language switcher (EN/PT) | keeps you on the same page |

## 5. Troubleshooting

| Symptom | Fix |
|---|---|
| `browserType.launch: Executable doesn't exist` | `npx playwright install chromium` |
| `next-env.d.ts` shows as modified after a build | `git checkout -- next-env.d.ts` — Next rewrites it between dev and build |
| `AGENTS.md` / `CLAUDE.md` appear in `frontend/` | written by `next dev`; they are git-ignored |
| Typecheck passes locally but fails in CI | fixed: `npm run typecheck` no longer uses the incremental cache |
| `✖ … is clean now — remove it from PENDING` | you finished translating a file: delete its line in `scripts/check-hardcoded-strings.mjs` |
| `✖ hardcoded Portuguese …` in a file you touched | move the string to `messages/*.json`, or mark a proper noun `// i18n-exempt: <reason>` — see [`architecture/I18N_GUIDE.md`](../architecture/I18N_GUIDE.md) |
