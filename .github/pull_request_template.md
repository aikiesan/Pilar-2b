## Summary

<!-- What does this PR change and why? Link the plan item it advances
     (docs/planning/BRAZIL_EXPANSION_ROADMAP.md §…, IMPROVEMENT_BACKLOG.md, …). -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] **Data ingestion** (fill in the Data lineage section below)
- [ ] Documentation update
- [ ] Refactoring / performance improvement
- [ ] Dependency update
- [ ] CI / tooling

## Testing

<!-- Paste the actual result lines ("1028 passed"), not just checkmarks. -->

- [ ] Tests pass locally (`npm test` / `pytest`)
- [ ] New tests added where applicable
- [ ] E2E tests verified for UI changes
- [ ] Affected flow exercised end-to-end (describe how)

## Data lineage (delete this section unless the PR ingests or changes data)

- [ ] Follows the ingestion contract (`backend/ingest/`, **one source per PR**)
- [ ] All 8 validation gates pass; ingest report committed at
      `docs/data/ingest_reports/<source>_<year>.md`
- [ ] `docs/data/METADATA.json` entry complete — version/collection, reference
      year, URL, DOI, retrieval date; **no `VERIFY` placeholders**
- [ ] Raw snapshot path documented (`data/raw/<source>/<year>/`, immutable)
- [ ] Unit conversions happen in exactly one place, with a comment
- [ ] Headline platform numbers unchanged, or every change explained in the
      ingest report (regression gate)

## Checklist

- [ ] Code follows project style (ESLint / Black / isort / flake8)
- [ ] Self-review completed
- [ ] Documentation updated (if needed)
- [ ] No secrets or credentials included (placeholders use bare `${VAR:?}` form)
- [ ] Migrations numbered sequentially; breaking changes called out in the summary
