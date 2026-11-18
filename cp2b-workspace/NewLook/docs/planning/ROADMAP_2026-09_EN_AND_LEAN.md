# Roadmap — September 2026: a fully English platform, and a leaner codebase

> Referenced by `.github/workflows/ci.yml` and `frontend/e2e/i18n.public.spec.ts`.
> How-to for contributors: [`architecture/I18N_GUIDE.md`](../architecture/I18N_GUIDE.md).

## Goals

1. **100% of the platform usable in English.** Every string a user reads on
   `/en/…` — pages, popups, tooltips, empty and error states, exported files —
   in English, with numbers and dates in English conventions.
2. **Better English.** One term per concept, one expansion per acronym,
   American spelling, consistent case (see the glossary in the i18n guide).
3. **Lean, coherent code.** No dead modules, one formatter instead of
   twenty-five, registries without display text, checks that fail loudly.
4. **Every guarantee enforced by a check**, so it survives the next feature.

## Starting point (main @ 5e798ef)

| Measure | Value |
|---|---|
| Frontend source files (non-test) | 207 |
| Unreachable from any route | 40 modules + 2 legacy routes + 1 debug page |
| Files the hardcoded-string check covered | 12 (allowlist) |
| Files with hardcoded Portuguese (AST scan) | 69 |
| Private number formatters | ~25, hardcoding `'pt-BR'` or `'en-US'` |
| Message keys checked against the catalog at compile time | 0 |
| Unit tests | 710 frontend (128 of them on dead code) · 1150 backend |

## Where it ended (branch `claude/wonderful-brown-5zber2`)

| Measure | Start | Now |
|---|---|---|
| Frontend source files (non-test) | 207 | 174 |
| Files with hardcoded Portuguese (AST scan) | 69 | **0** — `PENDING` is empty |
| Private number formatters | ~25 | 0 — everything goes through `useFormat()` |
| Message keys checked at compile time | 0 | all (typed `t()`) |
| Catalog keys no source file reads | unknown | **0** of 1,751 — enforced by `i18n:check` |
| Unit tests | 710 frontend · 1150 backend | 727 frontend · 1173 backend, none on dead code |
| e2e locale routes | 7 | 15 public + 5 signed-in (open mode) |

Diff since `5e798ef`: 248 files, +11.7k / −25.5k lines.

## Phases

### Phase 1 — Lean: remove what nothing uses ✅

- 40 unreachable modules, the legacy `src/app/{dashboard,map}` routes (the i18n
  proxy redirected away from them), the `/[locale]/test` debug page, a stale
  copy of the workflows under `cp2b-workspace/NewLook/.github/`, and three npm
  packages with zero imports (`reactflow`, `clsx`, `class-variance-authority`).
- Dead catalog namespaces (`Home`, `About`, `Dashboard`, `Login`, `Register`,
  `Settings`, `_DEPRECATED_STUBS`, `dashboard_page`, `map_page`,
  `technology_routes`): 1388 → 1266 keys.
- `npm run i18n:unused` reports catalog keys no source file reads.

### Phase 2 — Foundations ✅

- `src/lib/format.ts` + `useFormat()`: locale-aware number, compact, percent,
  currency and date formatting; missing values render as "—".
- `src/lib/localized.ts` + `useLocalize()`: `{ 'pt-BR', en }` fields for
  record-level content in data modules.
- Registries hold no display text: metric, palette, residue and scenario names
  moved to the catalogs (`Map.metrics`, `Map.palettes`, …); `useMetricText()`.
- Shared vocabulary for new work: `common.actions`, `common.states`,
  `common.sectors`, `common.units`.

### Phase 3 — Gates ✅

- **Typed messages** (`src/types/next-intl.d.ts`): `npm run typecheck` fails on
  a `t('key')` that is not in the catalog.
- **AST scan of every file** for hardcoded Portuguese, with a shrinking
  `PENDING` ratchet and reasoned `i18n-exempt:` markers; 18 unit tests.
- `npm run typecheck` runs without the incremental cache, so local results
  match CI.

### Phase 4 — Translate the remaining files ✅

`npm run i18n:scan -- --report` is the live inventory. Work is grouped by
feature so each group can be reviewed end to end:

| Group | Main files |
|---|---|
| Map shell and controls | `MapComponent`, `DesktopLeftPanel`, `LeftFilterPanel`, `FloatingControlPanel`, `MobileBottomSheet`, `ComparisonPanel`, `ExportControl`, legends; `data/thematicPresets`, `data/brazilStates`, `lib/{mapScope,typologyScale,plantLayers,featureFlags}` |
| Map layers | `MunicipalityLayer`, `HeatmapLayer`, `BubbleChartLayer`, `ProximityMap`, co-digestion layers, `IntermediateRegionsMapLayer` |
| Scientific database | `dashboard/scientific-database`, `data/scientificData`, `services/scientificApi`, `ReferencesModal`, `types/scientific` |
| Advanced analysis | `dashboard/advanced-analysis`, `data/residueFactors`, analysis components and charts, `services/residuosApi` |
| Proximity, municipality, calculator | `dashboard/proximity`, `services/proximityApi`, `municipality/[ibge_code]`, technology-routes steps and engine |
| Static pages and shell | privacy, terms, accessibility, settings, error boundary, footer, newsletter |

Exit criterion met: `PENDING` is empty and every route is in the e2e locale
test (signed-in pages in open mode, see `e2e/i18n.public.spec.ts`).

Along the way the scientific database was rebuilt on backend data only (the
bundled snapshot, with sample entries and made-up DOIs, is gone) and several
functional bugs surfaced by the translation were fixed; the commit messages on
the branch list them.

### Phase 5 — Backend text that reaches users ✅

- Stable codes next to display text, worded by the frontend: proximity
  errors and land-use classes, sign-in/sign-up errors (`detail.code`).
- `lang=en|pt-BR` on the municipal dossier exports (CSV, XLSX, PDF).
- English residue names: migration `032_residuos_nome_en.sql` fills
  `residuos.nome_en`, and `033_residuos_nome_en_citrus_industrial.sql` the one
  name 032 could not match on the production database; the kinetics and
  references endpoints return it. **Apply both on the database** — until then
  the English site shows the Portuguese residue names (the frontend falls back
  to `nome`).
- The API's own messages are English (validation, rate limiting, summary
  labels); nothing on the page shows backend prose untranslated.

### Phase 6 — English quality pass ✅

Glossary applied to `en.json`: one expansion of PILAR-2b, SAF → FDE, American
spelling, *Sign in/Sign out*, typographic ellipses, CH₄ with its subscript,
"—" for missing values, current copyright year.

### Phase 7 — Validation and tests ✅

Shared validators (`src/lib/validation.ts`) for sign-in, registration,
newsletter and calculator, with localized messages; unit and component tests
that render the real catalog; e2e locale coverage for every route.

`npm run typecheck` covers the tests and e2e specs too
(`tsconfig.typecheck.json`). Their 117 type errors are fixed, most of them
partial fixtures, now built with `municipalityProps()`. That surfaced a real
bug: the municipality geometry type left out the Polygon the API sends for a
municipality without an outline, and the bubble layer skipped those
municipalities.

## Open items for the team

Content and data questions the work surfaced but did not decide:

- **Landing page claims**: "All platform data is available for free
  download" and "GeoJSON and Shapefile export", while exports are off in the
  beta (`lib/featureFlags`) and there never was a Shapefile export; "Create a
  free account", while accounts are by invitation; "MapBiomas … 10 m", while
  the data-sources modal says 30 m (Landsat).
- **FDE source sheet** (`backend/data/FDE_Disponibilidade_Residuos_CP2B.xlsx`):
  its FDE column disagrees with its own factors for cattle manure (19.32 vs
  21.42), dairy whey (17.81 vs 18.53) and two more rows; the platform computes
  FDE from the factors.
- **References**: the database links papers to a residue, not to a parameter,
  and `has_validated_params` is now shown as "Validated data" rather than
  "Peer-reviewed". Per-parameter provenance would need a column for it.
- The newsletter form still simulates its submission.

## How to verify locally

See [`qa/LOCAL_VERIFICATION.md`](../qa/LOCAL_VERIFICATION.md).

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

