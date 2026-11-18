# December 2026 playbook — Papers, yearly-refresh runbook, 2027 runway

## Weeks 1–2 — freeze and reproduce (papers)

1. **Data freeze**: tag the repo (`data-freeze-2026`) and the DB state
   (pg_dump archived). After the freeze, ingests target next year's cycle.
2. **Zero placeholders**: `grep -c VERIFY docs/data/METADATA.json` → 0.
   Every promoted source has version, reference year, URL, DOI, retrieval date.
3. **Reproduce every number**: extend `run_manuscript_validation.py` so each
   figure/table in both papers regenerates from the frozen DB with one
   command; commit outputs + checksums under `analysis/outputs/paper_freeze/`.
   Any figure that can't be regenerated gets fixed *now*, not in review.
4. Reconciliation appendix from the ingest reports: per-source verdicts,
   explained regressions, the ANEEL unit-audit note, MapBiomas C10.1
   statement — reviewers get lineage, not promises.
5. Submit: the FDE/SP paper (CEUS revision or new venue) and the national
   platform paper. FOSS4G Europe 2026 material refreshed with national maps.

## Week 2–3 — the January playbook (yearly refresh runbook)

6. Write `docs/data/YEARLY_REFRESH_RUNBOOK.md`: ordered source list with
   expected release months (PAM ~Sep, SIGA continuous, SNIS ~Dec, MapBiomas
   ~Aug…), per-source snapshot → gates → promote → tile rebuild →
   regression-explained diffs.
7. **Dry-run it**: re-run 2 already-promoted sources end-to-end pretending
   it's January (new snapshot dir, same loaders). Time it; fix every manual
   step that isn't in the runbook. Target: one source refreshed < 1 hour of
   hands-on time.
8. Automate the boring rim: `make refresh SOURCE=x YEAR=2026` wrapping
   fetch→validate→report; tile rebuild as `make tiles YEAR=2026`.

## Week 3 — infrastructure & grid-connection layers

9. National infrastructure ingests (schema already exists from SP:
   `gas_pipelines`, `power_transmission_lines`, `power_substations`):
   ANEEL/ONS transmission + EPE Webmap pipelines, national extent.
   Distance-to-grid per municipality precomputed (feeds 2027 siting).

## Week 4 — 2027 runway

10. Write `docs/planning/2027_GRID_SITING_DESIGN.md`: H3 hexgrid resolution
    choice (~res 7 ≈ 5 km²), per-cell inputs (feedstock density kernel,
    restricted-area mask, distance to grid/pipeline/demand, readiness),
    multi-criteria scoring with per-cell explainability, compute strategy
    (PostGIS + H3 bindings vs offline batch → PMTiles).
11. Retro the year against the roadmap indicator table (fill the December
    column; write the "what the indicators say" paragraph).
12. Draft the 2027 roadmap skeleton (grid siting, OGC API/pygeoapi Track C,
    Global Biogas Atlas/BEPE Track E, live INMET/ANA layers).

## Exit criteria

- [ ] Both papers submitted; reproduction pipeline green from the frozen DB
- [ ] METADATA.json: zero VERIFY placeholders
- [ ] Yearly-refresh runbook dry-run completed (< 1 h/source hands-on)
- [ ] National infrastructure layers live; distance-to-grid precomputed
- [ ] 2027 siting design doc + roadmap skeleton merged
- [ ] Indicator table December column filled — targets hit or explained
