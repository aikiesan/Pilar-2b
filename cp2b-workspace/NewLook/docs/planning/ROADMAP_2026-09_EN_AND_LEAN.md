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
  `residuos.nome_en`; the kinetics and references endpoints return it.
  **Apply the migration on the database** — until then the English site shows
  the Portuguese residue names (the frontend falls back to `nome`).
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
- Test files are not type-checked (`tsconfig.json` excludes them): 117 type
  errors remain, mostly partial fixtures (`{ name, total_biogas_m3_year }` for a
  full `MunicipalityProperties`), writable `NODE_ENV`, and missing `jest-axe`
  types. Fixing them would let CI type-check the tests too.

## How to verify locally

See [`qa/LOCAL_VERIFICATION.md`](../qa/LOCAL_VERIFICATION.md).
