<!-- Title: Conventional Commits, in English, imperative, at most 72 characters.
     It becomes the squash commit on main ("Squash and merge").
     e.g. feat(map): highlight the searched municipality
          fix(topology): repair shared borders after simplification
     Branch: <type>/<short-description>, e.g. feat/map-search-highlight
     Types and scopes: CONTRIBUTING.md, "Commit messages and pull requests". -->

## Summary

<!-- What changes and why. Link the plan item it advances, if any. -->

Fixes #

## Spatial impact

<!-- Delete this section if the PR touches no CRS, geometry, tiles or map rendering. -->

- **CRS:** <!-- unchanged / reprojected from … to … -->
- **Bounding box / extent:** <!-- unchanged / changed (before → after) -->
- **Null or empty geometries:** <!-- how they are handled; counts before and after -->
- **Rendering performance:** <!-- payload size, vertex count, tile size, timings -->

## Data / parameters touched

<!-- Delete this section if no data or canonical parameter changes. -->

- [ ] `data/canonical_parameters/` changed (list the parameters and the source of each value)
- [ ] New or corrected source (ingest report in `docs/data/ingest_reports/`, entry in `docs/data/METADATA.json`, no `VERIFY` placeholders)
- [ ] Raw snapshot path documented (`data/raw/<source>/<year>/`, immutable)
- [ ] Headline platform numbers unchanged, or every change explained

## Tests

<!-- Paste the actual result lines ("1028 passed"), not only checkmarks. -->

- [ ] `npm test` / `pytest` pass locally
- [ ] New tests added where applicable
- [ ] E2E checked for UI changes
- [ ] Affected flow exercised end to end (describe how)

## Screenshots

<!-- Before / after for any UI or map change. Delete if not applicable. -->

| Before | After |
|---|---|
|  |  |

## Checklist

- [ ] Review findings resolved or answered before merge
- [ ] No secrets or credentials (placeholders use the bare `${VAR:?}` form)
- [ ] Migrations numbered sequentially; breaking changes marked with `!` and called out above
