# Roadmap — English parity and lean code (Round 5)

_Written 2026-09-19, on `main` at `7499a6c`. Companion to `IMPROVEMENT_BACKLOG.md`,
whose principles (stability first, one small reversible change per pass, real gates
before code changes, no speculative refactors) apply here unchanged._

## Context

Two goals, deliberately sequenced: **the English site should be genuinely usable**,
and **the codebase should get leaner without destabilising a platform that is live
at cp2b.unicamp.br and INPI-registered**.

The surprise from the audit is that the English problem is *not* a translation
problem. `messages/en.json` is 1053 of 1061 keys and the prose quality is good.
The site reads Portuguese in English because strings never reached the catalog,
because the nav points at the untranslated copy of a page, and because nothing in
CI can fail when English regresses.

## Measured baseline (2026-09-19, run locally)

| Check | Result | Gate today |
|---|---|---|
| `npx tsc --noEmit` (current tsconfig) | **0 errors** | not in CI |
| `npx tsc --noEmit` *including* `e2e/`, `src/test`, `__tests__` | **153 errors** | excluded by tsconfig |
| `npm run lint` | 0 errors, 103 warnings | blocking ✅ |
| `npm run format:check` | **crashes — cannot run at all** (see correction below) | only in the *stale* nested workflow |
| backend `black app/ tests/ --check` | clean (129 files) | blocking ✅ |
| backend `flake8 app/` | 0 findings | blocking ✅ |
| backend `mypy` | **never run — not installed**; strict config exists in `pyproject.toml` | never in CI |
| catalog parity `pt-BR` → `en` | 8 keys missing, 0 extra | no check exists |
| components calling `t()` | 48 of 200 source files | no lint rule |

**Correction (2026-09-22).** The first draft of this table said `format:check`
reported 239 unformatted files. It does not measure formatting at all:
`.prettierrc` declares `"plugins": ["prettier-plugin-tailwindcss"]`, and that
package is in neither `package.json` nor `package-lock.json`, so Prettier dies
loading its own config with `Cannot find package 'prettier-plugin-tailwindcss'` —
on the host and in the container alike. Nobody noticed because the active CI
workflow never runs `format:check`; only the stale nested one did. Item 5 below is
blocked on deciding whether to add the plugin as a devDependency or drop it from
`.prettierrc`. The 239 figure should not be trusted.

Two measurement traps, recorded so nobody re-hits them:

- `black .` from `backend/` reports 90 failures. All 90 are in
  `backend/data/shapefiles/project_map_source/` — a **gitignored vendored copy of
  the old Streamlit V2 app**. CI never sees it. Always scope to `app/ tests/`.
- The last CI failure on any branch (run 34827363526, 2026-09-14) was
  `Frontend - Security Audit` on a dependabot PR. `main` itself was last green on
  2026-09-08. Backend lint is **not** drifting.

## Phase 1 — Gates that can actually fail (DONE 2026-09-19, merged to main)

Nothing here changes product behaviour. It stops English from regressing silently.

**Status: items 1–4 done, plus a fifth gate added in Phase 2 (the
hardcoded-string scan). Verified locally at the end of the session: 710/710 jest
across 33 suites, `tsc` 0 errors, `lint` 0 errors / 103 pre-existing warnings,
`i18n:check` green at 1309 keys, locale spec 8/8.**

Also fixed along the way, because the new locale test found them — the ratchet
below is only green because these were closed:

| Where | Was | Now |
|---|---|---|
| `components/ui/GlobalSearch.tsx` | `"Buscar município"` in the header of **every** page, plus placeholder, 3 aria-labels, the no-results line and `m³/ano` | `common.search.*`, 9 strings |
| `components/map/MapLoadingSkeleton.tsx` | `"Carregando Mapa Interativo"` + 3 progress steps + `"5.571 municípios do Brasil"` | `Map.loading.*`, 5 strings |
| `map/DesktopLeftPanel.tsx`, `map/MobileBottomSheet.tsx` | `'Potencial Biomassa'` hardcoded beside a `t('colorModes.biogas')` sibling | `Map.colorModes.biomass` |
| `dashboard/technology-routes/page.tsx` | Portuguese footer note in an already-translated component | `calculator.footer_note` |
| `messages/pt-BR.json` | `calculator.results.entendaCenarios` — rendered nowhere | deleted rather than translated |

Two findings worth carrying forward:

- **`components/map/ClientOnlyMap.tsx` is dead** — nothing imports it. It holds a
  third copy of the map loading UI (also Portuguese). Delete it in Phase 4.
- **`app/[locale]/cite/page.tsx` carried its own inline `T` object** keyed by
  locale instead of using the catalogs — a third i18n mechanism, covering only
  half its own page. Migrated to `pages.cite.*` in Phase 2.

1. ✅ **Catalog parity check.** `frontend/scripts/check-i18n-parity.mjs`, exposed as
   `npm run i18n:check`, blocking in `frontend-lint-and-build`. Checks key parity in
   both directions, ICU placeholder drift, and empty values. Proven to fail by
   injecting one of each defect before wiring it in.
   One calibration note: the placeholder regex must require `{name}` or `{name,`.
   Matching `\{(\w+)` alone picks up words inside plural branch bodies, so
   `{count, plural, =0 {no municipality}...}` reports a phantom "no" argument and
   every plural in the catalog fails against its translation.
2. ✅ **Fixed the 8 missing EN keys.** The 7 live `calculator.step2.*` keys are
   translated (`StepAtividade.tsx:45,400` renders them); `calculator.results.entendaCenarios`
   was referenced nowhere, so it was deleted from `pt-BR.json` instead.
3. ✅ **Replaced the vacuous EN test.** New `e2e/i18n.public.spec.ts` asserts
   *negatively* — no Portuguese UI chrome in `document.body.innerText` on `/en/`
   routes. Three things make it hold up: it reads `innerText` not `page.content()`
   (the HTML carries RSC payloads and API JSON full of legitimate Portuguese
   domain values); the marker list excludes proper nouns like "Resíduos", which
   appear inside the platform's registered Portuguese name on `/en/cite`; and a
   companion test asserts the markers still fire on `/pt-BR/map`, so the list
   can never quietly stop matching. `ROUTES` is a ratchet — `/en/map`,
   `/en/dashboard`, `/en/dashboard/technology-routes`, `/en/sobre` today; add each
   page as Phase 2 extracts it. It runs **blocking** in `frontend-e2e`, ahead of the
   soft broad suite, because it reads catalog text and not the CORS-blocked API.
   `e2e/smoke.spec.ts` now asserts `<html lang>` instead of its old word list.
4. ✅ **`tsc --noEmit` in CI** as `npm run typecheck`, blocking. Was already green.
4b. ✅ **`__mocks__/next-intl.js`** — adding `useTranslations` to any component used
   to kill its whole test suite at import time with `SyntaxError: Unexpected token
   'export'`, pointing at the component rather than the real cause (next-intl ships
   ESM jest does not transform). One shared mock, same precedent as the
   `lucide-react.js` beside it, replaces the per-file `jest.mock` that three suites
   were already carrying. It returns the key; suites that assert on real copy — e.g.
   `MunicipalityDetailUX.test.tsx` — opt into `src/test/mocks/next-intl-real.js`,
   which resolves against the actual pt-BR catalog. That suite passing is also an
   independent check that the extracted Portuguese matches the original wording
   byte for byte.
5. **Do not gate `format:check` yet** — it currently crashes rather than checks (see the correction above). First add `prettier-plugin-tailwindcss` as a devDependency or remove it from `.prettierrc`; only then measure. Then run one mechanical
   `prettier --write` pass as its own isolated commit, confirm the suite is still
   green, *then* add the gate. Mixing it with any other change makes review impossible.
6. **Install and run `mypy` once**, report the count into this file, and add it
   `continue-on-error: true` with the re-hardening condition written inline — the
   discipline `IMPROVEMENT_BACKLOG.md` already sets for `frontend-e2e`.

## Phase 2 — The English defects that users actually hit

**Status 2026-09-19: items 7, 10 and the whole public surface are done. Items 8
(number formatting) and 9 (locale negotiation) remain.**

### Correction to this roadmap's first draft

The first draft said `/about` and `/sobre` were "two hand-maintained translations
of one page" and proposed deleting `about/page.tsx`. **That was wrong and would
have destroyed content.** The actual layout:

- `app/[locale]/page.tsx` re-exports the **map** — the map is the front door.
- `/sobre` is the former marketing home: hero, features, CTA. Already translated.
- `/about` is a separate institutional page — coordinator bio, mission/vision/values,
  8 thematic axes, São Paulo potential, partnerships, NIPE history, timeline.

Both are legitimate and linked from different places. `/about` was **translated**,
not deleted. Verify before deleting a page that merely looks duplicated.

### Done

7. ✅ **`/about` translated.** A `pages.about.*` namespace already existed, fully
   written in both locales, and the page simply never used it — 43 keys sitting
   unused while 728 lines of Portuguese were hardcoded beside them. Extended to 75
   keys and wired up. Where the existing catalog wording differed from what was on
   screen, **the catalog was changed to match the page**: translating a page must
   not silently reword the Portuguese site. Both locales now render 197 identical
   visible lines. The file dropped 728 → 647 lines because three prose arrays
   (timeline, axes, partnerships) moved to the catalog, leaving only icons,
   colours and hrefs in code.
   One real bug fixed on the way: `partner.type === 'Internacional'` selected the
   badge colour, so the Portuguese label was doing double duty as a key —
   translating it would have silently changed the colours. Now `typeKey`.
10. ✅ **Public surface extracted** — `/en/map`, `/en/dashboard`,
    `/en/dashboard/technology-routes`, `/en/sobre`, `/en/about`, `/en/guide`,
    `/en/cite` all pass the locale gate. Components: `GlobalSearch` (9 strings, in
    the header of every page), `MapLoadingSkeleton`, `MunicipalityProfilePanel`
    (37), `InfrastructureLayer` (popups), `ThematicMapBar`, guide index + layout,
    and `cite/page.tsx` — which carried its **own inline `T` object** keyed by
    locale, a third i18n mechanism, now on the catalogs.
    Reuse over addition: `MunicipalityProfilePanel` reads the existing
    `Map.residues.*` for all 12 residue names, and the scenario suffix now reads
    `Map.scenario_{id}` instead of the Portuguese `SCENARIO_LABEL` map.
    `InfrastructureLayer` also closed backlog **FE #8**: its seven near-identical
    popup templates were built by string interpolation with no escaping. They are
    now one `popupRow`/`popupTitle` code path with `escapeHtml`.

### The gate that catches what e2e cannot

The locale e2e test only sees page load. Popups, expandable panels and empty
states are invisible to it — which is exactly how `MunicipalityProfilePanel` and
`InfrastructureLayer` stayed entirely Portuguese underneath a passing `/en/map`.
`scripts/check-hardcoded-strings.mjs` (`npm run i18n:scan`, folded into
`i18n:check`) scans the already-translated files for Portuguese in JSX text and
localized attributes. Static, no browser, no backend, so it runs **blocking** in
the lint job. It is a ratchet over `CLEAN_FILES` — add a file the moment it is
finished. `i18n-exempt` in a same-line comment allows a genuine proper noun.

### Deliberate non-translation

`components/map/ReferencesPanel.tsx` is a bibliographic catalogue of official
Brazilian datasets — "IBGE - Produção Agrícola Municipal (PAM)", "SNIS", "EPE -
Linhas de Transmissão". Those names stay Portuguese: a researcher needs the real
name to find the source. Only its chrome labels ("Descrição:", "Observações:")
should move, and that is still open.

### Still open

8. **Locale-aware number formatting.** 14 bare `toLocaleString()` (host locale)
   plus ~25 hardcoded to a fixed locale, and `src/lib/mapUtils.ts` uses `'en-US'`
   while everything else uses `'pt-BR'` — the two "centralized" formatters
   disagree with the rest of the codebase. Many sit in module-level helpers that
   cannot call a hook, so this needs the seam built first (`useFormatter()` from
   next-intl, threaded through `mapUtils.ts`). Its own pass, as the backlog says.
9. **Locale negotiation.** Still no `middleware.ts` despite
   `localePrefix: 'always'`; `next.config.js:22` hard-redirects `/` → `/pilar2b/pt-BR`
   regardless of `Accept-Language`. Deferred deliberately: middleware interacts
   with the `/pilar2b` basePath and the Apache reverse proxy in production, so it
   needs testing against a production-like path, not just localhost.
10b. **Dashboard sub-pages** — `proximity`, `advanced-analysis`,
    `scientific-database` (23 Portuguese text nodes), plus
    `components/fde/MethodologyModal.tsx` (19) and
    `components/proximity/ResultsCards.tsx` (11).

## Phase 3 — Domain labels (decided: key stays, label is looked up)

The canonical engine writes Portuguese values that are used as **both** lookup keys
and display text. The rule is: **the stored string stays the identifier, forever, and
is never "tidied"** — it is what the pipeline, the DB and the published figures agree on.
Display text is a separate lookup.

`src/lib/typologyScale.ts` on current `main` **already does this** for regime —
`REGIME_COLORS` keyed by `N-deficit | sweet | N-excess`, with a parallel
`REGIME_LABELS` map holding the Portuguese. That is the pattern; it just stops there.

11. Give `TIPOLOGIA_COLORS` the same treatment (its 7 keys are still
    `Cana-de-açúcar`, `Pecuário`, … serving double duty), then move both
    `*_LABELS` maps out of the module and into the message catalogs under a
    `domain.*` namespace, resolved with `t()` at the render site.
12. Same shape for `src/data/residueFactors.ts` (machine keys are already English:
    `category: 'urban' | 'livestock'`; only the display `name` is Portuguese) and for
    the presentation strings in `src/lib/mapMetrics.ts` (`'Sem dados'` in the map
    legend) and `src/data/thematicPresets.ts`.
13. **Backend label leaks.** These return Portuguese display text over JSON:
    - `app/api/v1/endpoints/analysis.py:535-580` — `/analysis/residue-config` returns
      `label` next to a stable English `key`. The frontend should translate off `key`
      and ignore `label`; consumed at `frontend/src/services/analysisApi.ts:238`.
    - `app/api/v1/endpoints/geospatial.py:1018-1148` — scenario metadata and the note
      string, **duplicating** `Map.scenario_real_tip` / `Map.scenario_served_note`
      which already exist in both catalogs. Two sources of truth; keep the catalog.
    - `app/api/v1/endpoints/geospatial.py:1148` — a Portuguese *error* string
      (`"Erro ao carregar dados - usando valores padrão"`) surfaced to users.
    - `app/api/v1/endpoints/proximity.py:399-471` — infrastructure type names and
      descriptions rendered directly in the proximity results UI.
    HTTP exception messages are already English; no change needed there.

## Phase 4 — Lean code (all four cleanups approved)

14. **Delete `cp2b-workspace/NewLook/.github/workflows/`.** GitHub only reads workflows
    at the repo root, so this 8.8 KB file is dead config that reads like it is live —
    still pinned to Node 18, and it is the one that carries `format:check` and
    `test:e2e:chromium`. `IMPROVEMENT_BACKLOG.md` opens by warning that a previous
    round nearly edited it by mistake. Zero risk, highest confusion-per-byte in the repo.
15. **Rewrite `cp2b-workspace/NewLook/.cursorrules`** — it still describes the
    Streamlit V2 stack, not Next.js/FastAPI, and is indexed in
    `docs/DOCUMENTATION_INDEX.md` as the AI coding ground truth. While there:
    **add a root `CLAUDE.md`** — there is currently none anywhere in the repo, which
    is why every session re-derives the same layout gotchas.
16. **Remove the legacy non-locale route trees.** `src/app/dashboard/` (290 lines) and
    `src/app/map/` (345 lines) sit outside `[locale]`, import no translations, and
    duplicate `[locale]/dashboard/page.tsx` (283) and `[locale]/map/page.tsx` (75, which
    correctly delegates to `MapComponent`). Their tests add 950 more lines
    (`app/map/__tests__/page.test.tsx` 518, `app/dashboard/__tests__/page.test.tsx` 432).
    **~1,585 lines.** All in-app links go through next-intl's locale-prefixing `Link`,
    so these should be unreachable — **verify against the production URL before deleting**,
    since there is no middleware and locale resolution here is non-standard.
17. **Dead test triage.** `backend/pytest.ini` `--ignore`s four integration endpoint
    files (analysis, codigestion, geospatial, municipalities) and `testpaths` excludes
    `backend/tests/api/` entirely — including three parallel implementations of one
    thing: `test_municipalities.py`, `test_municipalities_fixed.py`,
    `test_municipalities_working.py`. Counting the `--ignore`d integration file and the
    live `tests/unit/test_municipalities_logic.py`, that is **five** test files for one
    router. Decide per file: fix or delete. Today "944 passing" hides ~15 files that
    have never executed.
18. **Deterministic analysis outputs.** `analysis/build_aneel_biogas_gd.py:76-83` —
    `by_sub` and `by_cls` lack the `.sort_values("total_kw", ascending=False)` that
    `by_state` has at line 73. The committed
    `analysis/data/05h_aneel_biogas_gd_summary.csv` does not match what the script
    emits, which is exactly the phantom diff sitting uncommitted in the working tree
    right now. Add the two sorts; regenerate; the diff should then be empty on a re-run.
    Audit the other 21 `to_csv` call sites in `analysis/` for the same class of bug.

## Phase 5 — SOLID, once the net above holds

Sequenced deliberately last: `IMPROVEMENT_BACKLOG.md`'s own principle is that a
refactor is only safe when a regression would actually be caught.

19. **A repository layer for the two worst offenders.** There is no data-access
    abstraction at all — raw psycopg2 via `get_db()`, and **10 of 17 route modules
    contain SQL**: `residuos.py` (27 blocks), `municipalities.py` (14),
    `technology_routes.py` (10), `geospatial.py` (9). Extract `residuos.py` and
    `municipalities.py` as the pattern-setting pair. This is also where the N+1 bug
    class the backlog keeps finding one at a time gets fixed at the source.
20. **Decompose `MapComponent.tsx`** — 1305 lines, up from the 715 the backlog recorded,
    and it gates every map feature. It owns URL-param parsing, global Escape handling,
    map-scope forcing and layer orchestration at once.
    Then `scientific-database/page.tsx` (1540) and `advanced-analysis/page.tsx` (1155).
21. **Collapse the fetch abstractions.** `lib/apiClient.ts`, `lib/apiCache.ts`,
    `lib/apiQueue.ts`, `lib/api/geospatialClient.ts` and six `services/*Api.ts` all
    exist, yet 16 non-test call sites still `fetch` directly —
    `IntermediateRegionBoundaryLayer.tsx`, `RegionChoroplethLayer.tsx`,
    `RegionMarkersLayer.tsx` among them. Pick one seam, move the map layers onto it.
22. **Typecheck the test files** — 153 errors today. Its own project; remove the
    `e2e`, `src/test`, `__tests__` entries from `tsconfig.json`'s `exclude`.

## Still-open from Round 3 (not re-derived — see `IMPROVEMENT_BACKLOG.md`)

Backend #6 `get_db()` rollback footgun · #7 Vercel `allow_origin_regex` +
`allow_credentials` · #8 `X-Forwarded-For` trusted in `rate_limit.py` ·
#9 `FRONTEND_CODE_TO_STREAM` defined twice verbatim (`analysis.py:52` and `:88`) ·
#10 injection checks skip JSON bodies · #11 46 sites leaking `str(e)` ·
#12 shapefile re-read per request. Frontend #5–#10: modal a11y, `mapScope` never
restored, 30s polling regardless of visibility, `bindPopup()` string interpolation,
`AuthContext` wiping `sb-*` keys on mount.

Two of these are only benign **because `app/services/auth_service.py` is mocked**
(every user is `role="admin"`). That is worth confirming as a deliberate pre-launch
state rather than an accident, because it is load-bearing for the severity of #7 and #8.

## Local Docker test harness (added 2026-09-22)

Running the suites against the Docker stack surfaced problems that do not show up
on the host. Each was verified directly, not taken from an agent's report.

### Fixed

- **Every route 500s: a non-atomic write in `next dev` (root cause pinned 2026-09-22).**
  `SyntaxError: Unexpected non-whitespace character after JSON at position N`,
  every route, both locales. Earlier notes blamed a vague "Turbopack cache". The
  exact mechanism: `next dev` rewrites `.next/dev/prerender-manifest.json` as it
  compiles routes, and when several requests hit a cold server at once a shorter
  write lands on a longer one without truncating it. Measured: a 548-byte file
  whose valid JSON ends at byte 543, followed by `58"}}` — the tail of the
  previous write. Every render reads that file, so the whole app stays down until
  `.next` is wiped; it never heals, and deleting just the file mid-run only swaps
  it for `ENOENT`, because Next writes it at startup. Not the Windows bind mount —
  `.next` is an anonymous volume on the container's own filesystem — and not stale
  dependencies (Next is 16.3.5 in container and lockfile alike).
  A `restart` hit it because it keeps the same `.next`; 8 Playwright workers on a
  cold server hit it because that is exactly the concurrent-first-request case.
  Recovery: `docker compose up -d --force-recreate --renew-anon-volumes frontend`.
  Prevention, now automatic: **`e2e/global-setup.ts`** requests every route in
  `e2e/routes.ts` one at a time before any worker starts. Playwright starts
  `webServer` before `globalSetup` (`createPluginSetupTasks` precedes
  `globalSetups` in its runner), so this works in CI and against Docker alike.
  Verified three ways: a freshly recreated cold container on 8 workers went from
  37 failed to **37 passed**; the CI-style path (Playwright spawning its own cold
  host server) passed 37/37 where it used to lose one random route per run; and
  with the manifest corrupted on purpose, the run now stops before any test with
  one message naming the file and the recovery command, instead of 37 failures
  over several minutes of timeouts that all pointed at the map.
  This is very likely a real share of the CI e2e flakiness the backlog attributed
  to CORS alone.
- **Hot reload does not work over the Windows bind mount.** An edit made while the
  container runs never triggers a recompile (nothing in the logs). Source changes
  reach the container only on recreate.
- **The locale e2e suite passed on a broken app.** With every page returning 500,
  it reported 7 of 8 green: "no Portuguese on this page" is trivially true of an
  error page. It now asserts status `< 400` and a minimum rendered-text length
  before the locale check, and was re-proven to fail against a dead target.
- **Redundant dev server.** `playwright.config.ts`'s `webServer` is independent of
  `baseURL`, so testing Docker on :3006 still spawned a second server on :3000.
  New opt-out `PLAYWRIGHT_SKIP_WEBSERVER=1`. Deliberately *not* inferred from
  `PLAYWRIGHT_BASE_URL`: CI sets that explicitly and does need its server.
- **16 canonical-parameter guards silently skipped in the container.**
  `tests/unit/test_canonical_parameters.py` hand-counted `parents[3]`, which is
  `/` inside Docker (compose binds `./backend` as `/app`), so it looked for
  `/data/canonical_parameters/feedstocks.yaml`, skipped, and never went red. These
  are the BMP/TS/VS physical-bounds and citation-integrity checks. Now uses
  `canonical_loader.resolve_feedstocks_path()` — the app's own resolver, whose
  Docker layout `test_canonical_loader.py` already covers. Host 16/16, and 16/16
  with `CANONICAL_PARAMETERS_PATH` set.

### Open — reported, deliberately not changed

- **Compliance tests are host-only by design.** `tests/compliance/*` read
  `frontend/src/...` and `backend/app/main.py` from the full repo layout, which the
  backend container does not have. 17 fail in the container; 20/20 pass on the host.
  Path resolution cannot fix this — the frontend files are genuinely absent.
- **CI never runs the database tests.** They gate on `TEST_DATABASE_URL`
  (`tests/conftest.py:240`); CI's backend-test job sets only `DATABASE_URL`, so they
  skip despite the job provisioning PostGIS. Not flipped on, because the CI database
  is empty and they would fail against an unseeded schema — which would turn a green
  gate red. Needs a migrate-and-seed step first.
- **`municipalities.ibge_code` is nullable.** `001_initial_schema.sql:22` declares
  `VARCHAR(7) UNIQUE` with no `NOT NULL`, and nothing later adds it; Postgres UNIQUE
  admits many NULLs. For the join key of the whole dataset — and given the SP-only
  source-file trap, where MG joins silently fall back to placeholders — that deserves
  a migration. It must first confirm zero NULLs in the live data, so it is not
  written blind.
- **`flake8` is not in `requirements.txt`.** CI installs it ad hoc. It belongs in a
  dev requirements file rather than the runtime one the production image is built from.
- **SP C:N data is absent locally.** Migration 031 is applied and its columns exist,
  but `cn_harm`/`regime_harm` are filled for 0 rows. Half of this is now fixed:
  `ffc97fc` wired the typology loaders into `run_migrations.py --seed`. The other
  half is data, not code — `load_dossier_sp_indices.py` reads
  `backend/data/raw/dossie_sp/2026/dossier_municipios.csv`, which is gitignored
  (`backend/data/raw/*`) and absent from any fresh clone, so the seed warns and
  moves on. The beta C:N and typology map modes show no SP data locally until that
  file is copied in. Production is unaffected if the VM has it.

## Verification

- `cd cp2b-workspace/NewLook/frontend && npm run lint && npx tsc --noEmit && npm test`
- `npm run i18n:check` (new) — must fail if a `pt-BR` key has no `en` counterpart
- `npm run test:e2e:public` — the `/en/` negative assertion must fail when a
  Portuguese string is reintroduced into an English page. Verify by temporarily
  reverting one extracted string.
- `cd cp2b-workspace/NewLook/backend && python -m black app/ tests/ --check && python -m flake8 app/ --max-line-length=100 --extend-ignore=E203,W503 && python -m pytest`
- `python analysis/build_aneel_biogas_gd.py && git diff --exit-code analysis/data/05h_aneel_biogas_gd_summary.csv`
- Manual: load `/en/dashboard/technology-routes`, step 2 — livestock options must
  read English, not raw key names.

## Keeping this alive

Same rule as `IMPROVEMENT_BACKLOG.md`: when an item is done, mark it with the
commit that closed it rather than deleting the row.
