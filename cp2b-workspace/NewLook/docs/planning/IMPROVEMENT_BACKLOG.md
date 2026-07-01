# PILAR-2b — Improvement Backlog (Lean & Stable)

> Living tracker for the "keep it stable, make it leaner" effort. Purpose: one
> place future sessions can read before re-discovering the same findings, and
> a status ledger so nothing gets fixed twice or silently forgotten.

_Started: 2026-07-01. Last updated: 2026-07-01 (Round 2)._

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
| Frontend `build` / `test:e2e:public` | 🔴 Red — but root cause was CI-only: `setup-node` pinned Node **18**, while Next.js 16.2 requires **≥20.9.0** (`Error: Process from config.webServer was not able to start`) | **Fixed** — bumped `node-version` to `'22'` across all 4 frontend jobs (lint-and-build, test, security, e2e). Build step continue-on-error removed (verified green locally with the same env vars CI uses). **E2E left soft** — Node fix should unblock it, but a live green CI run hasn't been observed yet; remove `continue-on-error` from `frontend-e2e` once the next `main` run confirms it's green. |
| Frontend `lint` | 🔴 Red — 2 real ESLint errors (`react/display-name` in `src/contexts/__tests__/AuthContext.test.tsx:20` and `src/test/mocks/react-leaflet.js:54`), plus ~91 warnings (mostly `react-hooks/set-state-in-effect`, `jsx-a11y/*`) | **Fixed (Round 2)** — named the wrapper component / added `displayName`; `npm run lint` now exits 0 (0 errors, 91 pre-existing warnings that don't block). `continue-on-error` removed. |
| Frontend unit tests (`npm test`) | 🔴 Red — 24–26 failing tests across 3–4 suites. Notable: `src/app/dashboard/__tests__/page.test.tsx` (`Target container is not a DOM element` — a test setup/teardown issue, not a product bug), `src/lib/performance.test.ts` `isOnline` tests (flaky — asserts on real `navigator.onLine`, environment-dependent) | Still open. **Next step:** fix the dashboard test's render/cleanup between cases, and make the `isOnline` tests mock `navigator.onLine` instead of reading the real value. |
| Backend `black --check` | 🔴 Red — 121 files would reformat, across almost the *entire* backend tree (`app/`, `scripts/`, `tests/`), not just tests as first estimated | **Fixed (Round 2)** — ran `black .` across the whole tree as its own commit. Pure formatting, verified with the full unit suite before/after (796 passed both times). `continue-on-error` removed. |
| Backend `isort --check-only` | 🔴 Red — ~30 files with unsorted imports across `app/` and `tests/` | **Fixed (Round 2)** — ran `isort .` (after black, then re-ran black to settle any back-and-forth). `continue-on-error` removed. |
| Backend `flake8` | 🔴 Red — 491 violations | **Improved (Round 2), still soft.** After the black/isort pass the count dropped to **74**: 54× `E501` (long lines), 14× `E402` (stray mid-file imports, mostly `app/routers/technology_routes.py` and `app/main.py`), 3× `E722` (bare `except:`), 2× `W293`, 1× `W291`. Worst offenders now: `app/api/v1/endpoints/geospatial.py` (22), `app/main.py` (11), `app/routers/technology_routes.py` (7), `app/api/v1/endpoints/scientific.py` (7). **Next step:** these need individual judgment (especially the `E722` bare excepts — check what they're swallowing before narrowing), not a mechanical pass. |
| Backend `bandit` SAST | 🔴 Red — 27 findings (0 high, 19 medium, 8 low severity). `pyproject.toml` has a `[tool.bandit]` section meant to skip `B101`/`B601` and exclude tests, but the CI invocation (`bandit -r app/ -f json ...`) doesn't reference it and Bandit isn't auto-loading it | Left soft. **Next step:** investigate why the configured skips aren't applied (likely needs `--configfile pyproject.toml` or a `.bandit` file), then triage the real findings once noise is filtered. |
| Backend `pytest` (`backend-test`) | ✅ Already a hard gate (no `continue-on-error`), confirmed passing on `main` | No change — already real. Note: `pytest.ini` sets `--cov-fail-under=40`, while `pyproject.toml`'s `[tool.pytest.ini_options]` documents 80%. `pytest.ini` wins (pytest precedence), so the *actual* enforced floor is 40%, not the 80% implied by the docs — worth reconciling so the two files don't disagree. |
| Frontend `npm audit` (`frontend-security`) | ✅ Already a hard gate, confirmed passing | No change. |

## Fixed bugs (closed)

| Item | What was wrong | How it was found / fixed |
|---|---|---|
| `app/routers/technology_routes.py` — 9 live endpoints crashed on every call | create/delete custom technology; create/update/delete/list user routes; get route by ID; get public routes; get route by share token all referenced undefined names `db` and `text` (SQLAlchemy-style API), while this project uses raw psycopg2 via `get_db()`/`get_db_transaction()`. Compounding bugs in the same code: SQL used SQLAlchemy `:name` binds instead of psycopg2 `%(name)s`; row access used attribute style (`row.id`) instead of the `RealDictCursor` dict style (`row['id']`); `current_user['id']` was used against a Pydantic `UserProfile` model (needs `current_user.id`); `update_route`'s "nothing to update" branch called `get_route_by_id(route_id, db, current_user)` against a 2-arg function. Zero test coverage existed — `tests/unit/routers/test_technology_routes.py` explicitly documented routing around the 9 broken endpoints rather than fixing them. | Found while re-verifying the flake8 F821 backlog item (37 "undefined name" hits, all in this one file). Fixed by matching the file's own working pattern (`health_check`, `get_all_technologies`, etc.). Added `get_db_transaction` mocking to `tests/conftest.py`'s shared fixture and 19 new unit tests (happy path / 404 / 403-ownership per endpoint) — no live Postgres needed. Full suite: 796 passed, 0 failed. |
| `frontend/src/components/ui/ErrorBoundary.tsx` (59 lines) — dead code | Unreferenced anywhere in `src/`; the one actually used app-wide is `frontend/src/components/ErrorBoundary.tsx`. | Deleted after a second grep confirmed zero references. |

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
