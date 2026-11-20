# Repository maintenance

## History rewrite of 2026-11-20

On 2026-11-20 the commit messages on `main` were rewritten to follow
[Conventional Commits](https://www.conventionalcommits.org/) in English, before the platform was
presented at FOSS4G. Until then commits, pull requests, branches and milestones used an internal naming
scheme in Portuguese, which was dropped.

Only the messages changed. Every rewritten commit keeps the same tree (same files, byte for byte), the
same parents in the same order, and the same author, committer and dates. `git diff` between the old and
the new tip of `main` is empty. The live branches were rebuilt on the new `main` the same way and renamed
to `<type>/<short-description>`.

Old commit hashes quoted elsewhere (reports, issues, notes) can be translated with
[`sha-map-2026-11-20.csv`](sha-map-2026-11-20.csv), which lists `old_sha,new_sha,old_subject,new_subject`
for every commit on `main`. The archived repository this one was imported from (commit `aa8e0873`) was
not touched.

The convention is documented in [CONTRIBUTING.md](../../CONTRIBUTING.md), checked locally by
`.githooks/commit-msg` and in CI by `.github/workflows/commitlint.yml`.
