# Test Infrastructure Hardening — Phase 2 Handoff

**PR:** #83 (`claude/test-infra-p2`) · **State at close:** 33 failing / 564 passing
(started this phase at 146 failing / 462 passing). `tsc --noEmit` clean.

Phase 2 root-caused and fixed the map-suite blocker plus several stale-test and
real-bug classes. The remaining 33 failures are isolated to **3 suites** and are
deliberately deferred to a follow-up PR (one of them needs a product decision).

Run from `cp2b-workspace/NewLook/frontend`: `npx jest --ci --maxWorkers=2`

---

## Done in Phase 2 (PR #83)

- **react-leaflet/leaflet global mocks** (`src/test/mocks/*`, wired via
  `moduleNameMapper`) — fixed the module-instance skew where the component and
  test resolved different copies, so mocked `GeoJSON`/`MapContainer` rendered
  nothing. Unblocked the whole map-suite class.
- Removed `jest.mock('react-dom/client')` from MunicipalityLayer — it crippled
  `@testing-library/react`'s own `render()` (which uses `createRoot`).
- MunicipalityLayer 27/27, HeatmapLayer 31/31, MapBiomasLayer 29/29,
  InfrastructureLayer/RegionMarkers/ProximityMap green.
- LanguageSwitcher.a11y rewritten for the real two-button toggle group.
- apiClient/AuthContext rewritten off Supabase (Phase 2 first commits).
- performance + mapUtils + GlobalSearch green.
- **Real fixes shipped** (not just tests): `getResidueBiomassTons` null guard
  (`biomassAvailability.ts`); GlobalSearch `aria-label` on input + listbox,
  `role="presentation"` on the keyboard-hint row, null-safe `formatBig`,
  `type="search"`; logger dynamic env read.

---

## Remaining (follow-up PR) — 33 failures in 3 suites

### 1. `src/components/map/MapComponent.test.tsx` (~9)
Stale i18n string assertions. The next-intl mock resolves real pt-BR strings,
but a few asserts target text that moved namespace or is hardcoded (e.g.
"Nenhum Dado Disponível", "Possíveis causas:"). Fix: align the assertions with
the current `Map.errors.*` keys / actual rendered copy. Low effort.

### 2 & 3. `src/app/dashboard/__tests__/page.test.tsx` (~13) and `src/app/map/__tests__/page.test.tsx` (~11)
These test the **legacy non-locale pages** `src/app/dashboard/page.tsx` and
`src/app/map/page.tsx`. The live app uses the `[locale]/` versions
(`src/app/[locale]/dashboard/page.tsx`, `.../map/page.tsx`). 

**Needs a product decision before fixing:**
- If the non-locale pages are dead code → delete both pages **and** their tests.
- If they're intentionally kept (e.g. a non-i18n fallback) → fix the tests:
  the map page test uses its own `next/dynamic` stub (so real leaflet testids
  never appear) and a `mapRef` lacking `getZoom/setView`; the dashboard test
  asserts hardcoded formatted numbers ("175.000") that no longer match.

Recommendation: confirm the legacy pages are unused, then delete pages+tests in
the follow-up (removes 24 failures and dead code in one move).

---

## After green
- Restore Jest `coverageThreshold` (70) and run `npm run test:ci`.
- CI: remove the 4 `continue-on-error: true` in `.github/workflows/ci.yml`
  once the suite is fully green.
- Then the backend phases (DI seam, repository pattern, calculator parity) per
  the approved plan.
