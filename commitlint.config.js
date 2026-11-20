// Commit message rules for PILAR-2b. Same type list as the Data_Biogas repository.
// The local hook (.githooks/commit-msg) applies the same subject rules.
// Full guide: CONTRIBUTING.md, "Commit messages and pull requests".
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'data', 'docs', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'],
    ],
    'header-max-length': [2, 'always', 72],
    'subject-full-stop': [2, 'never', '.'],
    // Scopes taken from the repository tree. A new scope only warns, so a new
    // module is not blocked; add it here in the same PR.
    'scope-enum': [
      1,
      'always',
      [
        // layers and services
        'frontend', 'backend', 'api', 'db', 'migrations', 'ingest', 'analysis',
        // product areas
        'map', 'explore', 'profile', 'calculator', 'comparison', 'dashboard', 'mandate',
        'sources', 'params', 'bivariate', 'i18n', 'a11y', 'auth',
        // geospatial
        'crs', 'tiles', 'topology', 'geoserver', 'ogc',
        // tests, build and operations
        'e2e', 'deps', 'dependabot', 'docker', 'deploy', 'ci', 'hooks', 'release',
        // repository and docs
        'repo', 'readme', 'contributing', 'changelog', 'maintenance',
      ],
    ],
  },
};
