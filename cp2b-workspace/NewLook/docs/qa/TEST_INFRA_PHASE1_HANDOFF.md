# Test Infrastructure Hardening — Phase 1 Handoff

**Branch:** `claude/test-infra-p1` · **Status after Phase 1:** Jest 146 failing / 445 passing
(down from 205 failing / 370 passing). `tsc --noEmit` clean.

This document is the resume point for the next session. The failures are
**test-infrastructure rot, not product bugs**. No `continue-on-error` masking is
relied upon — CI gating is only turned on once a group is genuinely green.

Run the suite from `cp2b-workspace/NewLook/frontend`:
```
npx jest --ci --maxWorkers=2
```

---

## Done in Phase 1 (committed)

- `__mocks__/lucide-react.js` → Proxy auto-generates any icon mock (was a hardcoded
  allow-list missing Moon/Sun → "Element type is invalid" cascade).
- `MapComponent.test.tsx` → stubbed omitted hooks + `MapToolbar`.
- `LanguageSwitcher.a11y` → mocked `@/navigation` + `useTranslations`/`NextIntlClientProvider`.
- `logger.ts` → dynamic `NODE_ENV` read inside `shouldLog()`.
- `GlobalSearch.tsx` → null-safe `formatBig`; input `type="search"`.

---

## Remaining work (ordered by cost)

### CHEAP — do first (~27 failures)

1. **Stale Supabase auth tests (~15)** — Supabase is deprecated (self-hosted
   Postgres / FastAPI-JWT now). The real `src/contexts/AuthContext.tsx` and
   `src/lib/apiClient.ts` import **no** Supabase.
   - `src/contexts/__tests__/AuthContext.test.tsx` — mocks `@/lib/supabase/client` (does not exist).
   - `src/lib/apiClient.test.ts` — mocks `@supabase/supabase-js` (not installed).
   - **Action:** rewrite against the real provider (React-Query) and the real
     `getAuthHeaders`/`authenticatedFetch` (mock `global.fetch`). Do NOT re-add Supabase mocks.

2. **Stale page-path tests (~6)** — pages moved to `src/app/[locale]/`.
   - `src/app/__tests__/page.test.tsx`, `src/app/dashboard/__tests__/page.test.tsx`,
     `src/app/map/__tests__/page.test.tsx` import `../page`.
   - **Action:** repoint imports to the `[locale]` routes (or relocate the tests).

3. **performance + mapUtils (~6)**
   - `src/lib/performance.test.ts` — `retryOperation` exceeds 5s default (add per-test
     timeout); `memoize` maxCacheSize off-by-one; `logPerformanceMetrics` needs a
     `window.performance` mock.
   - `src/lib/mapUtils.test.ts:~200` — negative-number format mismatch (`-1000` vs
     `-1 m³/year`); reconcile assertion vs `formatNumber` in `src/lib/mapUtils.ts`.

### MEDIUM (~6 failures)

4. **GlobalSearch / LanguageSwitcher leftovers** — tests assume an older component design.
   - GlobalSearch input is gated behind `open` state; tests query for it before opening.
     Open the search (`/` shortcut or click) in the test setup first.
   - LanguageSwitcher test expects a single button; current component renders multiple.
     Scope queries (`getByRole('button', { name: ... })`) to the trigger.

### HIGH — biggest single drop (~115 failures)

5. **7 map-layer suites** (`HeatmapLayer`, `InfrastructureLayer`, `MunicipalityLayer`,
   `ProximityMap`, `RegionMarkersLayer`, `MapBiomasLayer`, `MapComponent`).
   - Root causes: the `next/dynamic` mock returns the import Promise (→ "got object"),
     many Leaflet child components are unmocked, and React-Query hooks need a provider.
   - **Action — build ONE shared map-test harness** instead of per-file patching:
     - Fix the `next/dynamic` mock to resolve the module's `default` synchronously.
     - A `renderWithMapProviders()` wrapping `QueryClientProvider`.
     - Auto-stub `react-leaflet` primitives + local layer children in a shared
       `src/test/mocks/` module imported by all map suites.
   - This is the template; once `MapComponent` passes, the other 6 follow the same harness.

---

## After green

- Restore Jest `coverageThreshold` (currently 70) and run `npm run test:ci`.
- Then Phases 2–5 from the approved plan (`/root/.claude/plans/...` — backend DI seam,
  Supabase purge, repository pattern, backend `calculator_service.py` parity, e2e, CI gating).
- CI: remove the 4 `continue-on-error: true` in `.github/workflows/ci.yml` only after the
  guarded job is green.
