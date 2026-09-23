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

### Phase 4 — Translate the remaining files 🔄

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

Exit criterion: `PENDING` is empty and every public and dashboard route is in
the e2e locale test's `ROUTES`.

### Phase 5 — Backend text that reaches users 🔄

The API returns some display text in Portuguese (proximity residue and
infrastructure names; headers of the municipal dossier CSV/XLSX/PDF). Plan:
stable codes next to every display name so the frontend can translate, and a
`lang` parameter on the exports.

### Phase 6 — English quality pass 🔄

Apply the glossary to the existing `en.json`: one expansion of PILAR-2b and
FDE, SAF → FDE, American spelling, *Sign in/Sign out*, RPO = urban pruning,
key/label mismatches.

### Phase 7 — Validation and tests 🔄

Shared input validators for the forms (sign-in, registration, newsletter,
calculator) with localized messages; tests for each; e2e locale coverage for
every route.

## How to verify locally

See [`qa/LOCAL_VERIFICATION.md`](../qa/LOCAL_VERIFICATION.md).
