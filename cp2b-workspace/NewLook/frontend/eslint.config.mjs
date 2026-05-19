import nextConfig from 'eslint-config-next';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'e2e-results/**',
      'e2e/**',
      '__mocks__/**',
    ],
  },
  // next/core-web-vitals already registers: react, react-hooks, import, jsx-a11y, @next/next, @typescript-eslint
  ...nextConfig,
  // Turns off rules that conflict with Prettier formatting
  prettier,
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'debug'] }],
      // Downgrade from error (next default) to warn for interactive element rules
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/label-has-associated-control': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
      // React Compiler rules (eslint-plugin-react-hooks v5) — downgraded to warn.
      // React Compiler (Forget) is not enabled in this project (strictMode: false for Leaflet compat).
      // Address these in a dedicated React Compiler adoption sprint.
      'react-hooks/static-components': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/component-hook-factories': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/globals': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/error-boundaries': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-render': 'warn',
      'react-hooks/config': 'warn',
      'react-hooks/gating': 'warn',
    },
  },
  {
    files: ['src/**/*.test.{js,jsx,ts,tsx}', 'src/**/__tests__/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/no-noninteractive-element-interactions': 'off',
    },
  },
];
