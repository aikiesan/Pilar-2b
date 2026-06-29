# Post-FOSS4G Development Roadmap

> Written while travelling (FOSS4G Europe 2026, Timișoara). Intended to be picked up
> on the **UNICAMP VM** the following week. Consolidates the pending work into one
> place: auth deployment, the code-review backlog, the FOSS4G-inspired OGC API
> direction, the map-UX fixes, and the global-atlas track.

## Context
The internal-auth groundwork is implemented and committed (real VM-local JWT auth,
roles + clearance, LGPD docs). This roadmap captures everything that should follow,
roughly in priority order, so work can resume immediately on the VM.

---

## Track A — Deploy the internal auth (groundwork done)
See the step-by-step in `docs/deployment/AUTH_VM_DEPLOYMENT.md`.
- [ ] Set a strong `SECRET_KEY` (env) on the VM.
- [ ] Apply migration `backend/app/migrations/020_create_auth_users.sql`.
- [ ] Seed the first admin (`backend/scripts/seed_admin.py`).
- [ ] Gate in-development endpoints with `require_internal` / `require_clearance(2)`
      (`backend/app/middleware/auth.py`).
- [ ] Repurpose the public `register` page into an admin-only "create user" screen
      (`frontend/src/app/[locale]/register/page.tsx`) — registration is now invite-only.
- [ ] Run the auth tests in CI (they could not run in the travel sandbox — broken
      `cryptography` binding): `pytest tests/unit/services/test_auth_service.py
      tests/unit/middleware/test_auth_dependencies.py
      tests/integration/endpoints/test_auth_endpoint.py` + frontend `npm test`.

## Track B — Code-review backlog (from the deep review)
> Full Round-2 write-up + the "no-mock" test strategy:
> `docs/qa/CODE_REVIEW_ROUND2_AND_DEMOCK_PLAN.md` (computational core verified
> solid; real `validation_service` fixes queued DO-ON-VM; endpoint tests are
> mock-theater — staged plan + ready CI PostGIS job to run them for real).
- [ ] **De-mock the endpoint/integration tests** — stand up a PostGIS service in
      CI (`TEST_DATABASE_URL`), seed minimal fixtures, re-point `test_geospatial.py`
      first, then the rest (see the Round-2 doc, §4 / appendix).
- [ ] **`validation_service.py` fixes (DO-ON-VM):** reconcile dead
      `is_point_in_ocean()` with the live ocean check; fix the 111 km/deg longitude
      approximation in `check_buffer_overlap` (scale by `cos(lat)` / use EPSG:31983).
- [ ] **A3 — SQL identifier allowlist.** Several endpoints build SQL with f-strings
      interpolating column names (`analysis.py`, `geospatial.py`, `statistics.py`,
      `codigestion_service.py`, `proximity_service.py`). Values are currently
      enum/allowlist-constrained (not openly injectable), but centralise a strict
      identifier allowlist and never interpolate request-derived identifiers.
- [ ] **A4 — `print()` → logger** (17 sites in `app/`); `print` bypasses the PII
      log-redaction filter. Narrow the broadest `except Exception` blocks in the
      auth/DB paths.
- [ ] Confirm `geospatial._fetch_municipalities_db(columns)` only ever receives
      server constants.

## Track C — OGC API adoption (FOSS4G / pygeoapi) ★ high value
The pygeoapi workshop is the strategic win: it gives the open, standards-based,
interoperable API layer the platform needs (QGIS/GEE, World Biogas Atlas, DBFZ).
- [ ] **Spike pygeoapi over the existing PostGIS** → OGC API – Features for
      `municipalities` + `residuos` (config-driven YAML; runs alongside FastAPI).
- [ ] **Vector tiles** (OGC API – Tiles / MVT) to replace full-GeoJSON loads →
      mobile/performance win (ties to Track D).
- [ ] **OGC API – Processes**: expose the FDE forward engine / proximity / calculator
      as standardised async jobs (reusable, citable).
- [ ] **Records / STAC + Zenodo DOI** → FAIR catalogue + citation traceability.
- [ ] Evaluate pygeoapi access control for non-public (internal) collections — pairs
      with the new internal-auth gating.

## Track D — Map UX fixes
- [ ] Heatmap & bubble layers: normalise heat intensity; scale bubble radius by
      √value with min/max clamp; ensure layer cleanup on data change.
- [ ] **Display tiers**: when "Biomass" is selected, show the correct quantity, not
      biogas — a metric cascade `residue mass (t) → dry matter (TS) → volatile
      solids (VS) → CH₄ → biogas → biomethane`, driving legend/tooltip/profile panel.
- [ ] Mobile-first: consolidate floating controls into the bottom sheet; larger touch
      targets (also a WCAG AA target-size win); verify reflow at 320px.

## Track E — Global Biogas Atlas (BEPE moonshot)
- [ ] Generalise the PILAR-2b forward engine to ingest **FAOSTAT** production +
      **IPCC** residue/manure factors → per-country biogas potential profiles.
- [ ] Pilot ~10–15 countries; harmonise chemical parameters; release Atlas v1.

## Track F — Compliance & accessibility (carry-over)
- [ ] WCAG **AA** pass (non-text contrast, reflow, target sizes, status messages).
- [ ] LGPD: UNICAMP DPO sign-off; ROPA + DPIA; retention TTL on `calculator_leads`
      and deactivated `auth_users`.

## Track G — DBFZ collaboration & BEPE (from the Leipzig mission)
Strong, recurring openness from DBFZ (GIS, Sustainability, DataLab) to host research
and co-propose funded projects. Vehicle: a FAPESP **BEPE** (up to 12 months).
- [ ] Align the BEPE research-plan scope with Dr. Friederike Naegeli de Torres (DBFZ WG GIS)
      — confirm the anchor theme and the "moonshot" (global biogas profiles DB, Track E).
- [ ] Request the **DBFZ acceptance letter** (host group + supervisor).
- [ ] Draft the **FAPESP BEPE research plan** in the 3-front structure
      (continuation → feasible 1-year → moonshot), emphasising the "why DBFZ / why there".
- [ ] Agree a lightweight **Letter of Intent / MoU** and a GDPR-aware **data-sharing
      protocol** (ranges/encryption/aggregation; Zenodo DOI) for the World Biogas Atlas.
- [ ] Explore a **€20–30k co-funded micro-project** with the GIS group.
- [ ] First joint artefact candidate: a shared **Biogas Data Dictionary** (units, parameter
      definitions, range format) to fix the category-inconsistency problem they flagged.
> Concept notes (personal, not in-repo): BEPE 3-front plan, strategic goals, the global
> biogas database, and the iteration decks shared during the trip.

---

## Suggested sequencing
1. **A** (deploy auth) → unblocks internal tooling.
2. **C spike** (pygeoapi Features + vector tiles) → biggest architectural payoff +
   fixes map perf (overlaps D).
3. **D** (map UX + display tiers) → user-visible quality.
4. **B** (tech-debt) in parallel, low-risk.
5. **E / F** as the longer research + compliance tracks.

> Field notes from the workshops: `CP2B_FOSS4G_workshops_watchlist.pdf` (personal).
