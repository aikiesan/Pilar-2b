module.exports = {
  // Format and lint TypeScript and JavaScript files
  '*.{js,jsx,ts,tsx}': [
    'prettier --write',
    'eslint --fix',
    'git add'
  ],

  // Format JSON, CSS, MD files
  '*.{json,css,md}': [
    'prettier --write',
    'git add'
  ],

  // Run type checking for TypeScript files
  '*.{ts,tsx}': [
    () => 'tsc --noEmit'
  ],

  // Run tests for changed test files
  '*.test.{js,jsx,ts,tsx}': [
    'jest --bail --findRelatedTests --passWithNoTests'
  ],

  // Run accessibility tests for changed components
  'src/components/**/*.{tsx,ts}': [
    'npm run test:a11y -- --bail --findRelatedTests --passWithNoTests'
  ]
}