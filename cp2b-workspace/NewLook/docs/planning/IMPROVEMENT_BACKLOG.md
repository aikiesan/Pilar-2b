# PILAR-2b — Improvement Backlog (Lean & Stable)

> Living tracker for the "keep it stable, make it leaner" effort. Purpose: one
> place future sessions can read before re-discovering the same findings, and
> a status ledger so nothing gets fixed twice or silently forgotten.

_Started: 2026-07-01. Last updated: 2026-07-01 (Round 3)._

## ⚠️ Repo layout gotcha: two `ci.yml` files exist

`cp2b-workspace/NewLook/.github/workflows/ci.yml` is **not** the file GitHub
Actions runs — GitHub only recognizes workflows under `.github/workflows/`
at the **repository root**. The active file is `/.github/workflows/ci.yml`
(repo root); the nested one is a stale leftover (still pinned to Node 18,
different job names/structure) from before this project was folded into
`cp2b-workspace/NewLook/`. All CI gate work in this doc refers to the
**root** file. Round 3 nearly edited the wrong one — check
`git log -- .github/workflows/ci.yml` (root) vs the nested path before
touching either.

## Principles

- **Stability first.** A real CI gate that blocks bad changes matters more
  than any single cleanup. Don't remove code or refactor until the gates
  protecting `main` actually work.
- **One small, reversible change per pass.** Prefer several tiny PRs over one
  large one. Each pass should be independently verifiable and easy to revert.
- **Real gates before code changes.** Don't flip a CI check from soft
  (`continue-on-error: true`) to blocking unless it's currently green —
  verify first, flip second. Flipping a red check to blocking breaks CI for
  unrelated future work, the opposite of "stable."
- **No speculative refactors.** Every item below is tied to something
  observed in the repo, not a hypothetical future need.

## CI gate status (`.github/workflows/ci.yml`)

Most CI jobs were configured with `continue-on-error: true`, so failing
lint/build/test/security steps never actually failed the pipeline — the
workflow always reported green regardless of the real step outcome. Verified
against both a local run and the actual GitHub Actions logs for the latest
`main` run (28453010025, 2026-06-30):

| Check | Real status (verified) | Action taken |
|---|---|---|
| Frontend `test:a11y` | ✅ Green (49/49 tests) | **Hardened** — `continue-on-error` removed |
| Backend `safety check` | ✅ Green (0 vulnerabilities, 114 packages scanned) | **Hardened** — `continue-on-error` removed |
| Frontend `build` / `test:e2e:public` | 🔴 Red — but root cause was CI-only: `setup-node` pinned Node **18**, while Next.js 16.2 requires **≥20.9.0** (`Error: Process from config.webServer was not able to start`) | **Fixed.** Node 22 across all 4 frontend jobs (already in place going into Round 3). **E2E hardened (Round 3)** — confirmed the latest PR #134 CI run (`frontend-e2e`, run 28518416082) completed with `Run E2E tests (public pages)` conclusion `success`; removed `continue-on-error`. |
| Frontend `lint` | 🔴 Red — 2 real ESLint errors (`react/display-name` in `src/contexts/__tests__/AuthContext.test.tsx:20` and `src/test/mocks/react-leaflet.js:54`), plus ~91 warnings (mostly `react-hooks/set-state-in-effect`, `jsx-a11y/*`) | **Fixed (Round 2)** — named the wrapper component / added `displayName`; `npm run lint` now exits 0 (0 errors, 91 pre-existing warnings that don't block). `continue-on-error` removed. |
| Frontend unit tests (`npm test`) | 🔴 Red — 24 failing tests across `dashboard/__tests__/page.test.tsx`, `map/__tests__/page.test.tsx`, and `components/map/MapComponent.test.tsx` (this last one didn't even load — `jest.mock('./MapToolbar')` for a component that no longer exists) | **Fixed (Round 3).** All 597 tests across 24 suites pass now. Root causes, none were `isOnline`/`navigator.onLine` (that suite was already stable — re-ran it 3x, no flakiness observed): (1) **real product bugs** — both `dashboard/page.tsx` and `map/page.tsx`'s fetch functions never called `setError(null)` on a successful retry, so "Tentar Novamente" kept showing the stale error screen; (2) **dashboard test leak** — a test replaced `document.createElement`/`body.appendChild`/`removeChild` with raw `jest.fn()` assignments instead of `jest.spyOn`, so RTL's own container-append returned `undefined` (breaking that test) and the monkey-patch leaked into every later test in the file; switched to spies (auto-restored by `restoreMocks: true`); (3) **map page test** — its `next/dynamic` mock replaced every dynamic import with one generic stub, making the carefully-written `react-leaflet` mock immediately below it dead code; rewrote the dynamic mock to actually resolve and render what the loader returns; (4) **MapComponent test** — dead `./MapToolbar` mock (component removed, mock never cleaned up) crashed the whole suite at load; once fixed, further issues were a dead `./LeftFilterPanel` mock (component only imported for a type now — `DesktopLeftPanel` is what's actually rendered and needed the interactive elements moved onto it), un-awaited `waitFor()` calls whose dangling rejections got misattributed to later tests, `jest.advanceTimersByTime()` outside `act()`, and `window.location` (URL-synced filter state) leaking between tests in the same file. Two pt-BR-formatted number assertions (`"175.000"`/`"100.000"`) were also just wrong — the app renders `toLocaleString()` with no locale arg, i.e. en-US (`"175,000"`), matching `mapUtils.ts`'s formatters which use `'en-US'` explicitly. `continue-on-error` removed from the frontend unit-test CI step. |
| Backend `black --check` | 🔴 Red — 121 files would reformat, across almost the *entire* backend tree (`app/`, `scripts/`, `tests/`), not just tests as first estimated | **Fixed (Round 2)** — ran `black .` across the whole tree as its own commit. Pure formatting, verified with the full unit suite before/after (796 passed both times). `continue-on-error` removed. |
| Backend `isort --check-only` | 🔴 Red — ~30 files with unsorted imports across `app/` and `tests/` | **Fixed (Round 2)** — ran `isort .` (after black, then re-ran black to settle any back-and-forth). `continue-on-error` removed. |
| Backend `flake8` | 🔴 Red — 491 violations | **Fixed (Round 3), hardened.** Down to 0 from 74 (post black/isort). `E402` (14): two files had a stray statement (`logging.getLogger(__name__)` / a misplaced `import json`) splitting the import block in two — moved both after all imports. `E722` (3, all in `scientific.py`): checked what each bare `except:` actually swallows before narrowing — `safe_float`/`safe_int` only wrap `float()`/`int()`/`re.search()` conversions (`ValueError`/`TypeError`/`AttributeError`), the kinetics JSON parse only wraps `json.loads()` (`json.JSONDecodeError`). `W291`/`W293` (3, `scientific.py`): trailing whitespace inside a triple-quoted SQL string — stripped, doesn't touch SQL semantics. `E501` (54): pure line-wrapping; black doesn't reformat string-literal contents, so long SQL query strings and f-string messages were untouched by the earlier black pass. Verified the biggest one (`geospatial.py`'s 22-line GeoJSON query) is textually unchanged modulo whitespace via a normalized diff against the pre-edit version. `continue-on-error` removed from the backend flake8 CI step. |
| Backend `bandit` SAST | 🔴 Red — 27 findings (0 high, 19 medium, 8 low severity). `pyproject.toml` has a `[tool.bandit]` section meant to skip `B101`/`B601` and exclude tests, but the CI invocation (`bandit -r app/ -f json ...`) doesn't reference it and Bandit isn't auto-loading it | **Root cause found (Round 3), still soft.** `bandit -r app/` never passed `-c`/`--configfile`, so `pyproject.toml`'s `[tool.bandit]` was silently ignored — added `-c pyproject.toml` to the CI step. Triaged all 27 findings with the config now applied (see "Bandit findings triage" below) — none need a code fix, but the finding count itself doesn't drop to 0 (the skips don't cover any of the 27), so flipping to blocking now would just fail on already-triaged noise. Left `continue-on-error` in place; a future pass could add targeted `# nosec` suppressions to the confirmed-false-positives so the gate can go blocking and any *new* finding would actually stand out. |
| Backend `pytest` (`backend-test`) | ✅ Already a hard gate (no `continue-on-error`), confirmed passing on `main` | **Reconciled (Round 3).** `pytest.ini` (project root) is the file pytest actually loads; `pyproject.toml`'s `[tool.pytest.ini_options]` (which documented 80%) is never read at all once `pytest.ini` exists. Measured real coverage locally (unit + integration, no live DB): **58.68%**, 944 passed / 4 skipped — nowhere near 80%. Lowered the (inert) `pyproject.toml` number to 40 to match what's actually enforced, with a comment explaining why the section doesn't take effect. Enforced floor unchanged at 40%. |
| Frontend `npm audit` (`frontend-security`) | ✅ Already a hard gate, confirmed passing | No change. |

### Bandit findings triage (27 total, 0 high / 19 medium / 8 low) — Round 3

| Test ID | Count | Severity | Verdict | Why |
|---|---|---|---|---|
| B608 (SQL injection via string construction) | 17 | Medium | **False positive**, verified all 17 individually | Every dynamic SQL string in `app/` interpolates either a hardcoded/whitelisted identifier (dict lookups like `ALLOWED_SORT_COLUMNS.get(...)`, `column_map[criteria]` gated by FastAPI `enum=[...]`, or constant column lists like `RESIDUE_KEYS`) or a placeholder count (`", ".join("%s" for _ in streams)`) — actual values always go through psycopg2 `%s`/`%(name)s` parameterized placeholders, never raw user input. |
| B104 (hardcoded bind-all-interfaces, `0.0.0.0`) | 2 | Medium | **False positive / accepted risk** | `app/core/config.py` `HOST = "0.0.0.0"` is the standard bind address for a containerized deployment (Docker/Railway/Render) — the real security boundary is the container/network layer, not the bind address. |
| B105 (hardcoded password string) | 4 | Low | **False positive** | All 4 are in `app/models/auth.py`'s Pydantic `json_schema_extra` `example` blocks — OpenAPI/Swagger doc placeholders shown in `/docs`, never used as real credentials. |
| B106 (hardcoded password function arg) | 2 | Low | **Not a bandit false positive — pre-existing, intentional, documented state** | Both are in `app/services/auth_service.py`, whose own module docstring says `"Mocked implementation since Authentication is disabled."` Every endpoint returns `role="admin"` regardless of credentials. This is a real architectural decision already in place (not introduced this session) — flagging here rather than silently changing it, since re-enabling real auth is a product decision, not a lint fix. |
| B110 (try/except: pass) | 2 | Low | **Reviewed, acceptable as-is** | `intermediate_regions.py:199` — best-effort GeoJSON geometry attach, degrades gracefully if not found. `database.py:134` — commit-in-`finally` guarded with an inline comment already explaining why ("Connection might already be in error state"). Both are intentional, low-blast-radius defensive patterns; left untouched. |

## Fixed bugs (closed)

| Item | What was wrong | How it was found / fixed |
|---|---|---|
| `app/routers/technology_routes.py` — 9 live endpoints crashed on every call | create/delete custom technology; create/update/delete/list user routes; get route by ID; get public routes; get route by share token all referenced undefined names `db` and `text` (SQLAlchemy-style API), while this project uses raw psycopg2 via `get_db()`/`get_db_transaction()`. Compounding bugs in the same code: SQL used SQLAlchemy `:name` binds instead of psycopg2 `%(name)s`; row access used attribute style (`row.id`) instead of the `RealDictCursor` dict style (`row['id']`); `current_user['id']` was used against a Pydantic `UserProfile` model (needs `current_user.id`); `update_route`'s "nothing to update" branch called `get_route_by_id(route_id, db, current_user)` against a 2-arg function. Zero test coverage existed — `tests/unit/routers/test_technology_routes.py` explicitly documented routing around the 9 broken endpoints rather than fixing them. | Found while re-verifying the flake8 F821 backlog item (37 "undefined name" hits, all in this one file). Fixed by matching the file's own working pattern (`health_check`, `get_all_technologies`, etc.). Added `get_db_transaction` mocking to `tests/conftest.py`'s shared fixture and 19 new unit tests (happy path / 404 / 403-ownership per endpoint) — no live Postgres needed. Full suite: 796 passed, 0 failed. |
| `frontend/src/components/ui/ErrorBoundary.tsx` (59 lines) — dead code | Unreferenced anywhere in `src/`; the one actually used app-wide is `frontend/src/components/ErrorBoundary.tsx`. | Deleted after a second grep confirmed zero references. |
| `frontend/src/app/dashboard/page.tsx` + `frontend/src/app/map/page.tsx` — retry-after-error never cleared the error | Both pages' fetch functions set `setLoading(true)` at the top of the `try` block but never called `setError(null)`, so a successful retry after a failed fetch kept rendering the old error screen even though `municipalities`/`stats` had already been repopulated. | Found while fixing the "allows retry after error" tests for both pages (they were failing even in isolation, not from test contamination). Fix: add `setError(null)` right after `setLoading(true)`. |

## Other findings (not CI-related, deferred — no code touched this pass)

| Item | Area | Risk to fix | Notes |
|---|---|---|---|
| ~37 ad-hoc `toLocaleString()` / `Intl.NumberFormat` call sites scattered across components vs. the existing centralized formatter in `frontend/src/utils/mapUtils.ts`. | Frontend | Low–Medium | Consolidation touches many files; do as a dedicated, reviewable pass, not mixed with other work. |
| Large files/candidates for decomposition: `frontend/src/app/scientific-database/page.tsx` (1540 lines), `frontend/src/app/advanced-analysis/page.tsx` (1144), `ReferencesModal.tsx` (720), `MapComponent.tsx` (715), `DesktopLeftPanel.tsx` (700), `ResultsCards.tsx` (689); backend `geospatial.py` (867), `technology_routes.py` (853). | Frontend + Backend | Medium–High | Not urgent — none are "broken," just large. Tackle one at a time, after the CI net above is fully solid, so a regression would actually be caught. |
| `frontend/src/services/scientificApi.ts` L790 & L904 (`getChemicalData()`, `getCoDigestionRecommendations()`) return mock data instead of calling the backend. | Frontend | Medium | Needs a real backend endpoint or an explicit decision to keep it mocked (and remove the TODO if so). |
| 4 newsletter-related TODOs (`CookieConsent`, `NewsletterSignup`, `Footer`) + 1 Sentry/error-tracking placeholder in `logger.ts`. | Frontend | Low | Small, isolated; fine to pick off individually. |
| A handful of legitimately-conditional test skips (missing `TEST_DATABASE_URL`, missing canonical YAML fixtures, one PR-gated LGPD test). | Backend/Frontend | N/A | Not a problem — just documented here so nobody "fixes" a skip that's actually correct as-is. |
| `cp2b-workspace/NewLook/.cursorrules` still describes the old Streamlit-based stack (V2), not the current Next.js/FastAPI stack. Misleading for any contributor or AI assistant using it as ground truth. | Docs | Low | Rewrite or remove; low effort, prevents future confusion. |

## How to keep this doc alive

When you pick up an item above: move it from "Left soft" / backlog to a
"done" note with the PR/commit that closed it, rather than deleting the row —
keeps a record of what was actually fixed and when.
