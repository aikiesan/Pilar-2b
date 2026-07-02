# PILAR-2b — Improvement Backlog (Lean & Stable)

> Living tracker for the "keep it stable, make it leaner" effort. Purpose: one
> place future sessions can read before re-discovering the same findings, and
> a status ledger so nothing gets fixed twice or silently forgotten.

_Started: 2026-07-01. Last updated: 2026-07-02 (Round 4)._

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
| Frontend `build` | 🔴 Red — root cause was CI-only: `setup-node` pinned Node **18**, while Next.js 16.2 requires **≥20.9.0** (`Error: Process from config.webServer was not able to start`) | **Fixed.** Node 22 across all 4 frontend jobs. Build step confirmed green, `continue-on-error` removed. |
| Frontend `test:e2e:public` | 🔴 **Still red — see "Open decision" section below (now resolved as: soft gate).** Round 3 initially believed a PR #134 run was green (`conclusion: success`) and removed `continue-on-error`, but that reading only reflected the field being masked by `continue-on-error` still being active on that run — the actual logs show 5 failed tests. PR #135's run: 3 failed + 6 flaky, same root cause (CORS against the live production backend). Round 4 re-verified: run 28568906651's E2E step hit the job's 30-minute timeout. | **Softened (Round 4, `718974c`)** — `continue-on-error: true` restored with an inline comment in `ci.yml` stating the exact re-hardening condition: point E2E at a non-production backend with permissive CORS for the test origin (needs a seeded DB — a real project, still open below). |
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

## ⚠️ Open decision: `frontend-e2e` CI gate — RESOLVED (Round 4): softened back

Round 3 removed `continue-on-error` from the E2E step believing it was
verified green — that was based on misreading a check-run's `conclusion`
field instead of its actual logs. The same run's logs show 5 failed tests;
PR #135's run shows 3 failed + 6 flaky. Root cause: CI points the E2E
frontend (`localhost:3000`) at the **live production backend**
(`NEXT_PUBLIC_API_URL: https://newlook-production.up.railway.app` in the
root `.github/workflows/ci.yml`), whose CORS policy correctly rejects
`localhost` as an origin — several tests then time out waiting for
`.leaflet-container` because the map never finishes loading without data.
Pre-existing test-infra issue, not introduced by any Round 3 code change.

**Resolution (Round 4, `718974c`):** `continue-on-error: true` restored on
the E2E step, with the root cause and re-hardening condition documented
inline in `ci.yml`. Round 4 re-verified the red state first: PR #135's
fresh run (28568906651) had its E2E step still running at the job's
30-minute timeout — consistent with many tests waiting out their map-load
timeouts. **Still open (the real fix):** stand up a non-production E2E
backend target (local FastAPI + seeded Postgres in CI, or a staging
deployment) with permissive CORS for the test origin, then remove
`continue-on-error` again. That needs seeded municipality/geometry data —
treat it as its own project, not a cleanup pass.

## Round 3 code review — new findings (not yet fixed)

Full-codebase review pass, separate from the CI-gate work above. Ranked by
severity within each stack.

### Backend

| # | Severity | Where | Problem |
|---|---|---|---|
| 1 | **Critical** | `app/routers/calculator.py:138-190` (`GET`/`DELETE /calculator/leads/{lead_id}`) | **No authentication at all.** `lead_id` is a plain sequential int; anyone can enumerate it to read (name, email, IP, user-agent, referrer) or delete any data subject's record. Verified directly, not just agent-reported. Ironic given the file's own docstring frames these as LGPD data-subject access/erasure rights — meant to be exercisable *only by* the data subject, currently exercisable by anyone *on* any subject. May be live on the production backend right now. **Fixed (Round 4, `419a280`)** — both endpoints now require the lead's own e-mail as a verification factor (matched case-insensitively in the SQL WHERE); mismatch is indistinguishable from a nonexistent id (404 / `deleted=false`), so no existence oracle. First unit-test file for the router added (11 tests). |
| 2 | High | `app/routers/technology_routes.py:239` | `get_technology_by_id` joins a table literally named `references`, which no migration creates (only `residuo_references`/`technology_references`/`scientific_references` exist) — sibling endpoint `get_all_technologies` correctly uses `residuo_references`. This endpoint 500s on every call. **Fixed (Round 4, `76460c9`)** — table name corrected to `residuo_references` (which has the `doi`/`url` columns the query selects); regression test added. |
| 3 | High | `app/api/v1/endpoints/codigestion.py:17-22,58-64,91-102,180-190` | `_cluster_cache`/`_cn_profile_cache` are unbounded module-level dicts (no size/TTL limit, unlike the bounded `LRUCache` in `services/cache_service.py`); `min_biomass_tons` has no upper bound so a caller can mint unlimited cache entries; `DELETE /clusters/cache` has no auth either. Unauthenticated memory-exhaustion vector. **Fixed (Round 4, `479cfc1`)** — `_cluster_cache` is now an `LRUCache` (max 64, 1h TTL); `min_biomass_tons` capped at 1,000,000 t/yr; cache flush requires `get_current_user`. Also discovered: `tests/integration/endpoints/test_codigestion_endpoint.py` is `--ignore`d by `pytest.ini` (it patches endpoint-module attributes that never existed and fails at patch time) — CI has never run it. |
| 4 | Med-High | `app/routers/technology_routes.py:149-162` | N+1 query in `get_all_technologies` — one extra `SELECT` per row instead of a single batched `IN (...)` query. **Fixed (Round 4, `c3d6afa`)** — single `ANY(%(tech_ids)s)` query grouped in Python; regression test asserts exactly 2 queries. |
| 5 | Med-High | `app/services/proximity_service.py:503-523,577-578` | Same N+1 pattern in `correlate_mapbiomas_residuos` (one query per land-use class), wrapped in a bare `except Exception: log` with no re-raise — a partial DB failure returns a 200 with silently incomplete data. **Fixed (Round 4, `2d33306`)** — all residue names resolved up front and fetched in one `IN (...)` query; DB work is now all-or-nothing, and a DB error degrades to an explicitly empty result with an `"error"` marker instead of silently partial data. First unit tests for the method added. |
| 6 | Medium | `app/core/database.py:88-139` | `get_db()`'s `except` only catches `psycopg2.Error`; any other exception (e.g. `HTTPException`) skips rollback and falls through to an unconditional `conn.commit()` in `finally`. `get_db_transaction()` (same file) correctly catches broad `Exception`. No live write path currently uses `get_db()`, but it's a footgun if one ever does. |
| 7 | Medium | `app/main.py:55-70` | `allow_origin_regex` (`new-look.*\.vercel\.app` etc.) + `allow_credentials=True` — Vercel lets anyone deploy a project under an arbitrary name matching that pattern (e.g. `new-look-anything.vercel.app`), granting credentialed cross-origin access. |
| 8 | Medium | `app/middleware/rate_limit.py:25-40` | `get_client_ip` trusts a client-supplied `X-Forwarded-For` unconditionally — an attacker can bypass `login_limiter`'s 3/min brute-force throttle on `/auth/login` by varying the header per request. (The separate global limiter in `middleware/rate_limiter.py` correctly uses `request.client.host` — inconsistency between the two layers.) |
| 9 | Medium | `app/api/v1/endpoints/analysis.py:52-84` and `88-120` | `FRONTEND_CODE_TO_STREAM` dict is defined twice, verbatim, back to back — a landmine if one copy is edited without the other. |
| 10 | Low-Med | `app/middleware/validation.py:276-307` | `validation_middleware`'s injection-detection only inspects query params, never the JSON body — most state-changing POST/PUT/PATCH traffic gets none of the claimed "SQLi/CMDi defense-in-depth." |
| 11 | Low-Med | 46 occurrences across `analysis.py`, `codigestion.py`, `geospatial.py`, `intermediate_regions.py`, `mock_geospatial.py`, `municipalities.py`, `proximity.py`, `residuos.py`, `scientific.py`, `technology_routes.py`, `mapbiomas_service.py` | Raw exception text (`detail=f"...{str(e)}"`) leaked into HTTP responses — inconsistent with the more defensive generic-message pattern used elsewhere in the same files. |
| 12 | Low | `app/services/proximity_service.py:193` | Re-reads and re-parses the full state shapefile from disk on every `/proximity/analyze` call, unlike `geospatial.py`'s `_load_geo_gdf()` which caches it module-level. |

### Frontend

| # | Severity | Where | Problem |
|---|---|---|---|
| 1 | High | `app/[locale]/dashboard/advanced-analysis/page.tsx:348-428` | `fetchAllData`'s debounced filter-change effect has no request-id/AbortController guard — two filter changes within one round-trip can race, silently showing stats for a filter combo the user isn't looking at anymore. Same bug class as the retry-after-error fix this session, unaddressed here. **Fixed (Round 4, `1e6b09a`)** — monotonic request-id ref; stale responses dropped after the `Promise.allSettled`. |
| 2 | High | `app/[locale]/dashboard/proximity/page.tsx:123-151` | `handleMapClick` clears state but doesn't cancel the in-flight `analyzeProximity` request — clicking a second point while the first is still loading can display point-A's results while point-B is shown as selected. **Fixed (Round 4, `dbd05c4`)** — map clicks bump a request-id ref that invalidates in-flight analyses (results, errors, and loading flag all dropped when superseded). |
| 3 | High | `components/map/MunicipalityLayer.tsx:195-213` | Popup `createRoot(container)` per popup open, never `root.unmount()`'d — leaks a React root per municipality click over a long session; only spot in the codebase with this pattern. **Fixed (Round 4, `a73d73a`)** — root unmounted on the layer's `popupclose` event (deferred one tick). |
| 4 | High | `components/map/ExportControl.tsx:170-200` | `exportToPNG` doesn't await/wrap `canvas.toBlob(callback)` — the "Download iniciado!" success toast fires before the blob/link/click actually run, so a slow or failed render still shows success with no file downloaded; the `throw` inside the callback also escapes the surrounding `try/catch`. **Fixed (Round 4, `cc33fc6`)** — `toBlob` promisified and awaited; failures now surface through the existing error path. |
| 5 | Medium | `ComparisonPanel.tsx`, `ExportControl.tsx`, `CodigestionDetailPanel.tsx` | Modal-style panels with no `role="dialog"`/`aria-modal`, no focus trap, no component-level Escape handling (the only Escape listener is global, in `MapComponent.tsx`, and only closes municipality selection). |
| 6 | Medium | `components/map/MapComponent.tsx:291-306` | Enabling the intermediate-regions layer force-sets `mapScope` to `'brazil'`; disabling it again never restores `'sp'` — map stays zoomed out with no visible reason. |
| 7 | Medium | `app/[locale]/dashboard/scientific-database/page.tsx:189-346,480-490` | Unconditional `setInterval(fetchAllData, 30000)` re-runs ~8 API calls every 30s regardless of tab visibility, plus no de-dup against the manual refresh button. |
| 8 | Medium | `components/map/InfrastructureLayer.tsx:317-417`, `CodigestionClusterLayer.tsx:86-98` | Popup/tooltip HTML built via raw string interpolation into `bindPopup()`/`bindTooltip()` — low exploitability today (source is static shapefiles/backend-computed labels) but a stored-XSS vector waiting for any future user-editable field. |
| 9 | Low | `contexts/AuthContext.tsx:35-40` | Unconditionally wipes all `sb-*-auth-token` localStorage keys on every mount — dead code today (no live Supabase client anywhere), but will silently nuke real sessions the moment Supabase auth is reintroduced. |
| 10 | Low | `components/map/MapComponent.tsx:106-116` | URL-param readers re-parse `window.location.search` every render but are only consumed once (as `useState` initializers) — harmless today, but misleadingly named and will confuse whoever expects them to react to navigation. |

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
