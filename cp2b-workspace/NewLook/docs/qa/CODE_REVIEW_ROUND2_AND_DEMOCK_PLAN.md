# Code Review — Round 2 & "No-Mock" Test Strategy

> Hands-on second-pass review focused on the **computational core** and the
> **test suite quality** (the explicit ask: *"no mock tests"*). Written during the
> FOSS4G/DBFZ travel window; the behaviour-changing fixes below are flagged
> **DO-ON-VM** because the travel sandbox cannot run the Python suite (broken
> `cryptography` native binding — `import jwt` panics, which also blocks the auth
> tests). Companion docs: `docs/qa/TESTING.md`, `TEST_STRUCTURE.md`,
> `TEST_INFRA_PHASE2_HANDOFF.md`, `COVERAGE_STATUS.md`.

---

## TL;DR

1. **The computational core is solid and genuinely well-tested.** The FDE engine,
   forward engine, canonical-parameter loader, co-digestion pure functions,
   map-metrics, and the input-validation service are covered by **real, no-mock
   unit tests** that call the actual functions and assert real numeric/branching
   behaviour. No bugs found in this layer in Round 2.
2. **Two real (low-severity) issues in `validation_service.py`** — dead code with
   thresholds that contradict the live check, and a longitude-degree approximation
   that ignores latitude. Both have precise fixes below; both are **DO-ON-VM**
   because they touch tested behaviour.
3. **The endpoint/integration tests are "mock-theater."** The files under
   `tests/integration/endpoints/` mock a *Supabase client* and feed hand-written
   rows, then assert on those same rows. The real endpoints use **psycopg2 +
   PostGIS**, not Supabase, so these tests largely exercise serialisation shape,
   not the real query path. The real-DB path **exists** (`TEST_DATABASE_URL`-gated
   fixtures) but CI never provides a database, so every real integration test
   `pytest.skip`s. **This is the heart of the "no mock tests" gap.**
4. **Concrete de-mock plan** (staged, low-risk) is in §4, with a ready-to-adopt CI
   job in the appendix.

---

## 1. Computational core — verified solid (no changes needed)

Reviewed first-hand; coverage is real, not mocked:

| Area | Source | Test | Verdict |
|------|--------|------|---------|
| Input validation | `app/services/validation_service.py` | `tests/unit/services/test_validation_service.py` (333 lines) | Real, exhaustive — boundary, type, ocean-heuristic, buffer-overlap, end-to-end. Pins behaviour incl. the inconsistency in §2. |
| Co-digestion pure logic | `app/services/codigestion_service.py` (`_haversine_km`, `_UnionFind`, `_weighted_cn`, `_improvement_score`, `_blend_ratio`, `_build_spatial_groups`) | `tests/unit/services/test_codigestion_service.py` | Pure functions tested **directly** with real inputs. Correct. `_build_spatial_groups` intentionally drops singletons (a cluster needs ≥2). DB-touching wrappers are mocked — acceptable, the logic lives in the pure helpers. |
| Map metrics | `app/services/map_metrics.py` | `tests/unit/services/test_map_metrics.py` | Clean. Stored-biogas envelope is intentionally FDE-only. |
| FDE / forward engine / canonical params | `app/services/*`, `feedstocks.yaml` pipeline | `test_fde_traceability.py`, `test_biogas_forward.py`, `test_canonical_loader.py`, `test_kinetics_invariants.py` | Real invariant + traceability tests. Strong. |
| Validators (schema layer) | `app/middleware/validation.py` | `tests/integration/test_data_integrity.py` (validator-layer half) | Real, no DB — WGS-84 bounds enforced at the Pydantic/validator layer. |

**Takeaway:** the science is trustworthy. The test debt is concentrated entirely
in the HTTP/DB-integration layer (§3).

---

## 2. Real issues found in `validation_service.py` (DO-ON-VM)

Low severity, but real. Both are pinned by the current test suite, so a fix must
update tests in the same change — hence DO-ON-VM (can't run pytest in the sandbox).

### 2.1 `is_point_in_ocean()` is dead code **and** disagrees with the live check
- `validate_coordinates()` (line ~70) uses the inline heuristic
  `lng > -44.5 and lat < -23.5`.
- `is_point_in_ocean()` (line ~214) uses `lng > -44.2 and lat < -23.0` (plus a
  southern-coast clause). **It is never called** from the validation path.
- Worse, its eastern clause is effectively unreachable inside valid SP bounds:
  `validate_coordinates` already rejects anything with `lng > -44.2`
  (`SAO_PAULO_BOUNDS["max_lng"] == -44.2`) *before* any ocean check, so a point
  that satisfies `is_point_in_ocean`'s eastern clause can never be a "valid SP"
  point in the first place. The two functions encode **different coastlines**.
- **Recommendation:** make `is_point_in_ocean()` the single source of truth and
  call it from `validate_coordinates()`, or delete it. Reconcile the thresholds
  (the −44.2/−23.0 + Cananéia southern clause is the more considered one). Then
  update `TestIsPointInOcean` + the ocean cases in `TestValidateCoordinates`
  accordingly. **Behaviour change → needs the suite to run → DO-ON-VM.**

### 2.2 `check_buffer_overlap()` uses a flat 111 km/degree for longitude
- `radius_deg = radius_km / 111.0` is then applied to a **circular** `point.buffer()`
  in lng/lat space (line ~122). 111 km/deg holds for latitude everywhere, but for
  **longitude** the real value is `111 · cos(lat)`. At SP latitudes (~−22°),
  `cos ≈ 0.927`, so east/west extent is **under-estimated by ~7–8%** — the
  "extends beyond state" warning fires slightly late in the E/W directions.
- It's a *warning-only* heuristic (not a hard gate), so impact is cosmetic, but
  the fix is cheap: scale the x-radius by `1/cos(radians(lat))`, or build the
  buffer in the projected CRS already used elsewhere (UTM **EPSG:31983**) for an
  exact metric circle. **DO-ON-VM** (touches `TestCheckBufferOverlap`).

> Both are deliberately **not** changed in this pass — I won't ship behaviour
> changes to tested code I can't run. They're queued for the VM, where
> `pytest tests/unit/services/test_validation_service.py` gates the change.

---

## 3. The "mock-theater" inventory (why endpoint tests prove little)

**Pattern.** Files in `tests/integration/endpoints/` (`test_municipalities.py`,
`test_maps.py`, `test_analysis.py`, `test_statistics.py`, `test_residuos.py`,
`test_geospatial.py`, `test_scientific.py`, `test_codigestion_endpoint.py`) build
a `TestClient(app)` and then:
- create a **`Mock()` Supabase client** and a `sample_*_data` list of dicts, and
- assert the endpoint returns those same dicts.

Two problems:
1. **Wrong seam.** The endpoints query **PostGIS via psycopg2** (see
   `geospatial.py`, `analysis.py`, `statistics.py`), not Supabase. The Supabase
   mock often isn't even on the code path; what actually feeds the handler is the
   **autouse `mock_db_connection`** fixture in `conftest.py`, which patches a
   shared `MagicMock` cursor (`_SHARED_MOCK_CURSOR`). So the test asserts against
   data it itself injected through a mock cursor — a tautology.
2. **No real SQL is exercised.** Column lists, joins, PostGIS functions
   (`ST_AsGeoJSON`, buffers, `ST_DWithin`), and the f-string-built identifiers
   flagged as **A3** in the Round-1 backlog are **never run**. A typo'd column or
   a broken spatial predicate passes CI today.

**What the mocks *do* cover (keep):** response envelope shape, pagination math,
status codes, Pydantic (de)serialisation, and error-branch handling. That's worth
keeping as fast unit tests — but it is **not** integration testing, and the file
names/`@pytest.mark` overstate it.

**The real path already exists.** `conftest.py` provides `db_connection` /
`db_transaction` fixtures gated on `TEST_DATABASE_URL` (else `pytest.skip`), and
`test_data_integrity.py` is written to use them. CI just never sets the variable
or stands up a database, so **0 real integration tests run**.

---

## 4. De-mock plan ("no mock tests") — staged, low-risk

The goal is a real PostGIS-backed integration tier that actually runs the SQL,
without destabilising the existing green unit pipeline.

### Stage 1 — Stand up a real test database in CI *(infra; appendix has the YAML)*
- Add a `postgis/postgis:15-3.4` **service container** to a new
  `backend-integration-test` job; export `TEST_DATABASE_URL` pointing at it.
- Apply schema with the existing runner (`scripts/cp2b_migrate.py`) or
  `psql -f app/migrations/0*.sql` in order, then seed the **minimum** rows the
  endpoint tests need (a handful of municipalities + residue rows — far less than
  the full data import; no shapefiles/GDAL required for the query-shape tests).
- Keep this job **non-gating at first** (not in `summary.needs`) so newly-running
  real tests surface honestly without blocking merges on day one; **promote to
  required once green.** *(Authored but unvalidated from the travel sandbox —
  first run on CI/VM is expected to reveal real failures; that is the point.)*

### Stage 2 — Re-point the endpoint tests at the real DB
- Convert one suite first as the template — **`test_geospatial.py`** is the best
  pilot (it has the most real SQL/PostGIS to validate). Drop the Supabase mock and
  the `sample_*_data`; instead seed fixtures via `db_transaction` (auto-rollback)
  and assert the handler's real output.
- Split each file: keep the shape/serialisation checks as `@pytest.mark.unit`
  (mock cursor is fine there); move anything that asserts *data/SQL correctness*
  into `@pytest.mark.database` real tests. Rename so the marker matches reality.

### Stage 3 — Run the auth tests for real (already rewritten, never run)
- `test_auth_service.py`, `test_auth_dependencies.py`, `test_auth_endpoint.py`
  were rewritten to be real (no-mock-DB via a `FakeCursor`, real bcrypt + PyJWT).
  They **could not run in the sandbox** (`import jwt` panics on the broken
  `cryptography` binding). Run them in the Stage-1 job:
  `pytest tests/unit/services/test_auth_service.py
  tests/unit/middleware/test_auth_dependencies.py
  tests/integration/endpoints/test_auth_endpoint.py`.

### Stage 4 — Fold in the Round-1 backlog while the real harness exists
- With real SQL now executing, the **A3** f-string identifiers (`analysis.py`,
  `geospatial.py`, `statistics.py`, `codigestion_service.py`,
  `proximity_service.py`) get real regression cover; add an allowlist + a test
  that an out-of-allowlist column is rejected, not interpolated.
- **A4**: `print()` → `logger` (17 sites) so PII redaction applies; narrow the
  broadest `except Exception` in the auth/DB paths.

---

## 5. Suggested sequencing
1. **Stage 1** (CI PostGIS service + minimal seed) — unblocks everything; no app code risk.
2. **Stage 3** (auth tests) — they already exist; just need the DB + working `jwt`.
3. **§2 fixes** (validation_service) — small, now runnable against the suite.
4. **Stage 2** (convert `test_geospatial.py`, then the rest) — the real win.
5. **Stage 4** (A3/A4) — hardening, with real regression cover behind it.

---

## Appendix — ready-to-adopt CI job (validate on first run)

Add to `.github/workflows/ci.yml`. Intentionally **not** added to `summary.needs`
yet; promote once green. `<bootstrap schema + seed>` = run `cp2b_migrate.py`
against `$TEST_DATABASE_URL` (enable the `postgis` extension first) and insert the
minimal fixture rows, or load a committed `tests/fixtures/seed_min.sql`.

```yaml
  backend-integration-test:
    name: Backend - Integration (real PostGIS)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend
    services:
      postgres:
        image: postgis/postgis:15-3.4
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        ports: ['5432:5432']
        options: >-
          --health-cmd "pg_isready -U test"
          --health-interval 10s --health-timeout 5s --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.10'
          cache: 'pip'
          cache-dependency-path: './backend/requirements.txt'
      - run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
      - name: Bootstrap schema + seed
        env:
          TEST_DATABASE_URL: postgresql://test:test@localhost:5432/test_db
        run: |
          psql "$TEST_DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS citext;"
          # <bootstrap schema + seed> e.g.:
          # python scripts/cp2b_migrate.py --database-url "$TEST_DATABASE_URL"
          # psql "$TEST_DATABASE_URL" -f tests/fixtures/seed_min.sql
      - name: Run real integration + auth tests
        env:
          TEST_DATABASE_URL: postgresql://test:test@localhost:5432/test_db
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db
          SECRET_KEY: test-secret-key-for-ci-testing-only-change-me-32
        run: pytest -v -m "database or integration" --no-header
```

> Note on Stage 1 scope: the **query-shape** endpoint tests need only a small seed
> (municipalities + residues). The **data-correctness** tests (real totals) would
> need the full import pipeline (shapefiles, GDAL, `cp2b_migrate.py` data steps) —
> defer those to a heavier nightly job, not the per-PR gate.
