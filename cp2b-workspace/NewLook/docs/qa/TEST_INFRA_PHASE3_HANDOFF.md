# Test Infrastructure — Phase 3 (Frontend suite fully green)

**Branch:** `claude/test-infra-p3` · **State:** 545 passing / **0 failing**, 22/22 suites.
`tsc --noEmit` clean, `npm run lint` 0 errors.

## What Phase 3 did
- Legacy non-locale `/dashboard` and `/map` pages → replaced with redirects to the
  default locale (preserve bookmarks); deleted their obsolete duplicate tests.
- MapComponent.test.tsx (last failing suite) brought to 33/33:
  - next/dynamic mock now resolves the mocked child SYNCHRONOUSLY by parsing the
    SWC-transpiled `require("./X")` form (previous regex only matched `import(...)`,
    so children never rendered under fake timers).
  - Stubbed the remaining leaflet-dependent dynamic children.
  - Added DesktopLeftPanel's visualization-mode select to the mock (the live UI
    moved it there from LeftFilterPanel).
  - Wrapped timer advances in act(); updated error/no-data assertions to the
    current simplified UI (old copy referenced removed Supabase text).
- Lint: display-name fixes in the react-leaflet mock + AuthContext test wrapper.

## CI gating
- Removed `continue-on-error: true` from the **frontend unit + a11y test steps**
  in root `.github/workflows/ci.yml` — these are now verified green and genuinely
  gate. CI will fail on a broken frontend test.

## Still masked (deliberately — not yet verified here)
- Frontend **e2e** (needs a live server) and **backend pytest** (needs Postgres)
  still have `continue-on-error: true`. Remove once verified green in their envs.
- Backend pytest suite (42 files) has never been confirmed green in this
  workspace (requires the Dockerized PostGIS). Next step toward full readiness.
- E2E coverage is thin (login/map/smoke) — the biogas calculator flow has no e2e.

## Definition of "fully production-ready testing" (remaining)
1. Verify backend pytest green vs docker-compose Postgres; drop its continue-on-error.
2. Add Playwright e2e for the calculator flow; drop e2e continue-on-error.
3. Re-enable Jest coverage threshold gate in CI (currently 70, present but not enforced via test:ci).
