# Internationalization (i18n) guide

PILAR-2b ships in two locales, **pt-BR** (default) and **en**. Every string a
user can read — on screen, in a tooltip, in an `aria-label`, in an exported
file — must exist in both. This guide is the contract for keeping it that way:
where text lives, how to write it, which checks enforce it, and the English
terminology the platform uses.

- Plan and progress: [`planning/ROADMAP_2026-09_EN_AND_LEAN.md`](../planning/ROADMAP_2026-09_EN_AND_LEAN.md)
- Library: [next-intl](https://next-intl.dev) v4, locale-prefixed routes (`/en/…`, `/pt-BR/…`)

---

## 1. Where text lives

| Kind of text | Where | How to read it |
|---|---|---|
| UI copy: labels, buttons, headings, messages, tooltips, `aria-label`s | `frontend/messages/pt-BR.json` + `en.json` | `const t = useTranslations('ns'); t('key')` (server: `await getTranslations('ns')`) |
| Shared vocabulary: residue names, sectors, units, actions, empty states | the same catalogs: `Map.residues.*`, `common.sectors.*`, `common.units.*`, `common.actions.*`, `common.states.*` | reuse these keys — do not add a new "Close" or "No data" |
| Record-level content in data modules (a residue's name, the justification for each FDE factor) | next to the record, as `{ 'pt-BR': '…', en: '…' }` | `const localize = useLocalize(); localize(record.name)` — see `src/lib/localized.ts` |
| Numbers, percentages, money, dates | never in copy | `const format = useFormat(); format.compact(v)` — see `src/lib/format.ts` |
| Codes the backend sends (`ALTO`, `MEDIO`, `Agrícola`) | stay in code, mapped to a catalog key | e.g. `getPotentialCategoryKey()` → `t(\`potentialCategory.${key}\`)` |
| Citations, paper titles, proper nouns, official dataset names | in code, marked `// i18n-exempt: <reason>` | rendered as published, in every locale |

**Registries hold no display text.** `lib/mapMetrics`, `lib/biomassAvailability`
and `data/scenarioFactors` describe how a thing is read, converted and coloured;
what it is *called* is copy and lives in the catalogs (`Map.metrics.<key>`,
`Map.residues.<type>`, `Map.scenario_<key>`). Components look it up —
`useMetricText()` does it for metrics.

### Numbers

Always format through `useFormat()` (components) or `createFormatters(locale)`
(code outside React, e.g. Leaflet popups built as HTML strings):

| Call | en | pt-BR |
|---|---|---|
| `format.number(1234567)` | 1,234,567 | 1.234.567 |
| `format.number(2.5, { decimals: 2, minDecimals: 2 })` | 2.50 | 2,50 |
| `format.compact(1234567)` | 1.2M | 1,2 mi |
| `format.percent(45.23)` (percentage points) | 45.2% | 45,2% |
| `format.currency(1234567)` (BRL) | R$1,234,567 | R$ 1.234.567 |
| `format.date('2026-09-23')` | September 23, 2026 | 23 de setembro de 2026 |
| any formatter with `null`/`NaN` | — | — |

Never write `toLocaleString('pt-BR')`, `toFixed(1) + 'M'`, or a unit inside a
number string. Format the number, then append the translated unit
(`${format.compact(v)} ${tCommon('units.t_year')}`).

### Keys

- Namespaces follow the feature: `Map`, `pages.<page>`, `analysis`, `calculator`,
  `charts`, `guide`, … Keys are `snake_case`; group related keys in an object.
- Interpolate with ICU arguments, never by concatenation:
  `"metric_potential": "{metric} potential"` / `"Potencial de {metric}"`.
  Word order differs between the languages, so a sentence must be one key.
- Plurals use ICU: `"{count, plural, one {# municipality} other {# municipalities}}"`.
- A key stored as data is typed against the catalog, so a typo fails the
  typecheck:

  ```ts
  import type { Messages } from '@/types/i18n'
  type Step2Key = keyof Messages['calculator']['step2']
  const OPTIONS: { labelKey: Step2Key }[] = [{ labelKey: 'swine' }]
  t(`step2.${option.labelKey}`)
  ```

---

## 2. The checks

All run in CI (`frontend-lint-and-build`) and locally:

| Command | What it catches |
|---|---|
| `npm run typecheck` | a `t('key')` that does not exist in the catalog (typed via `src/types/next-intl.d.ts`) |
| `npm run i18n:check` | the five checks below, in one go |
| └ `check-i18n-parity.mjs` | a key present in one catalog only, ICU placeholder drift, empty values |
| └ `check-hardcoded-strings.mjs` | Portuguese UI text hardcoded in any file under `src/` (TypeScript AST; see `scripts/lib/portuguese-scan.mjs`) |
| └ `i18n-unused-keys.mjs --strict` | a catalog key no source file reads — delete it, or read it where it belongs |
| └ `check-patch-notes.mjs` | a patch-notes entry missing a locale |
| └ `npm run i18n:test` | the scanner's own unit tests |
| `npm run i18n:unused` | the same unused-key check, as a report |
| `npx playwright test e2e/i18n.public.spec.ts` | Portuguese UI chrome rendered on `/en/` pages, in a real browser (signed-in pages with `E2E_OPEN_MODE=1`, see `docs/qa/LOCAL_VERIFICATION.md`) |

The hardcoded-string scan started as a ratchet: `PENDING` in
`scripts/check-hardcoded-strings.mjs` listed the files not translated yet, and
it is now **empty** — every source file is held to the rule. Keep it that way:
a new file never goes on the list. Accented place names in English text ("the
municipalities of São Paulo") do not count as Portuguese.

To keep a genuine Portuguese literal, mark it with a reason, on the same line or
the line above:

```tsx
const state = 'São Paulo' // i18n-exempt: proper noun
{/* i18n-exempt: person's name */}
<p>Bruna de Souza Moraes</p>
```

A bare `i18n-exempt` without a reason is rejected.

---

## 3. Translating a file

1. `npm run i18n:scan -- --report` lists every file with hardcoded Portuguese.
2. For each string: reuse a shared key if one fits (§1), otherwise add a key
   under the file's feature namespace in **both** catalogs, in the same place.
3. Replace ad-hoc number formatting with `useFormat()`.
4. Text that comes from the backend is data, not copy: show a code's label
   from the catalog (e.g. `auth.errors.<code>`), a record's own name through
   its English field (`nome_en`, via `useResidueName()`), and never an API
   error message verbatim.
5. `npm run typecheck && npm run i18n:check && npm test`.
6. Check the page in both locales (`/en/…` and `/pt-BR/…`), including popups,
   empty states and error states — the e2e test only sees the initial render.

Tests that assert on visible text can use the real catalog:
`jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))`.
The default mock (`__mocks__/next-intl.js`) returns the key itself.

---

## 4. English style and glossary

**American English** (the majority form already in the catalog): *color, center,
optimize, analyze, program, fertilizer, mobilization, neighboring*.

**Case.** Page titles, navigation items and section headings in Title Case;
buttons, labels, placeholders, tooltips and messages in sentence case
("Try again", "Export data", "Select a residue…").

**Tone.** Short, concrete, active. Say what happened and what to do:
"The data could not be loaded. Try again." rather than "Error loading data".

### Platform names

| Portuguese | English | Note |
|---|---|---|
| PILAR-2b — Plataforma Inteligente de Localização e Aproveitamento de Resíduos para Biogás e Bioprodutos | PILAR-2b — Intelligent Platform for Locating and Using Residues for Biogas and Bioproducts | one expansion everywhere; in citations the Portuguese name is kept |
| CP2B / CP2Bsd | CP2B | proper noun |
| NIPE-UNICAMP | NIPE-UNICAMP | proper noun |

### Methodology

| Portuguese | English |
|---|---|
| FDE — Fator de Disponibilidade Efetiva | FDE — effective availability factor |
| FC — Fator de Coleta | FC — collection factor |
| FCp — Fator de Competição | FCp — competition factor |
| FS — Fator de Sazonalidade | FS — seasonality factor |
| FL — Fator de Logística | FL — logistics factor |
| SAF | *legacy name for FDE — do not use* |
| potencial teórico / disponível / real | theoretical / available / realistic potential |
| cenário Real / Ideal | Real / Ideal scenario |
| Médio Prazo · Conservador · Otimista · Fronteira do Biogás | Mid-term · Conservative · Optimistic · Biogas Frontier |
| BMP, ST, SV, C:N | BMP, TS, VS, C:N |
| codigestão | co-digestion |
| raio de captação | catchment radius |

### Residues and sectors

| Portuguese | English |
|---|---|
| resíduo | residue (*waste* only in fixed terms: municipal solid waste, organic waste) |
| setor agrícola / pecuário / urbano / industrial / florestal | agricultural / livestock / urban / industrial / forestry sector |
| cana-de-açúcar · bagaço · palha · vinhaça · torta de filtro | sugarcane · bagasse · straw · vinasse · filter cake |
| soja · milho · café · citros | soybean · corn · coffee · citrus |
| dejetos · bovinos (corte/leite) · suínos · aves (postura/corte) | manure · cattle (beef/dairy) · swine · poultry (laying hens/broilers) |
| RSU — resíduos sólidos urbanos | MSW — municipal solid waste |
| FORSU — fração orgânica do RSU | OFMSW — organic fraction of MSW |
| RPO / poda urbana | urban pruning |
| lodo de ETE · ETE | WWTP sludge · WWTP (wastewater treatment plant) |
| digestato · biofertilizante | digestate · biofertilizer |
| safra · entressafra | harvest season · off-season |

### Geography and data

| Portuguese | English |
|---|---|
| município | municipality |
| região imediata / intermediária | immediate / intermediate region (IBGE) |
| estado de São Paulo | São Paulo State |
| habitantes | inhabitants |
| sem dados | No data (`common.states.no_data`); a missing number renders as "—" |

### Units

`t/year`, `m³/year`, `Nm³/day`, `Nm³ CH₄/year`, `MWh/year`, `GWh/year`, `km`,
`km²`, `ha`, `inhab./km²` — from `common.units.*`. Write "tonnes" in prose only.

### Accounts

**Sign in**, **Sign out**, **Create account** — as verbs and on buttons. Not
"Login"/"Logout".
