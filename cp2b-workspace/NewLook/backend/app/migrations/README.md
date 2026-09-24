# Database migrations

Numbered SQL files, applied in order, that build the PILAR-2b schema and its
reference data on PostgreSQL + PostGIS. Numbers have gaps (002, 007–011): files
merged or dropped before this became the migrations directory.

## How they are applied

| Where | How | What records it |
|---|---|---|
| Docker (local) | `docker compose up`: the `db-migrations` service runs `scripts/run_migrations.py --seed` — every pending file in name order, then the seeders | `schema_migrations`: one row per file name, so each file runs once |
| VM (production) | by hand, each new file by name with `psql` — [`docs/VM_UPDATE_GUIDE.md`](../../../docs/VM_UPDATE_GUIDE.md), step 4 | nothing: the guide lists the files the pull added (`git diff --diff-filter=A` against the commit before it) |

Two things to know:

- **Do not point `run_migrations.py` at the VM database.** The VM has no
  complete `schema_migrations` table, so the runner would take every file from
  001 as pending and re-apply them, data updates included.
- **The runner marks a file as applied when it fails with "already exists" or
  "duplicate".** The failed file's transaction is rolled back, so none of its
  other statements run either. Write migrations with `IF NOT EXISTS` / `ON
  CONFLICT` so they never take that path.

## Writing one

1. Take the next free number and say what it does: `034_municipality_xyz.sql`.
2. Start with a header comment: why it exists, what it changes, whether it is
   safe to re-run, and a query that checks the result (see 032 and 033).
3. Make it safe to re-run: `CREATE … IF NOT EXISTS`, `ON CONFLICT DO NOTHING`,
   updates that only fill empty values and never overwrite a hand-made one.
4. **Never edit a migration that has been applied anywhere.** Fix it with the
   next one: 033 names the residue 032 missed on production.
5. Data loaded from files goes in a seeder under `scripts/`, listed in
   `SEEDERS` in `run_migrations.py`. Their order matters; that file says why.
6. Test it on a scratch database: apply it, apply it again (it must change
   nothing), and run the header's check query.

## `backend/migrations/` (legacy)

An older directory of SQL applied by hand, with numbers that clash with these.
The Docker runner does not read it. What still matters there:

- `012_cp2b_residue_streams.sql`, `013_cp2b_municipality_summary.sql`: tables
  for the CP2B 2023 residue streams and the municipality summary (cluster
  columns), created by `scripts/cp2b_migrate.py` and filled by
  `scripts/cp2b_load_data.py`. The map works without them; the GeoJSON then
  lacks the cluster columns and the backend logs a warning.
- `007_intermediate_regions.sql`: used by `scripts/load_national_intermediate_data.py`.
