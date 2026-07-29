const nextJest = require('next/jest')

/** @type {import('jest').Config} */
const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],

  // Test patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/**/layout.tsx',
    '!src/app/**/loading.tsx',
    '!src/app/**/not-found.tsx',
    '!src/test/**',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/node_modules/**',
  ],

  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json-summary',
  ],

  coverageDirectory: 'coverage',

  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Module name mapping for path aliases and static assets
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/src/test/__mocks__/fileMock.js',
    '^lucide-react$': '<rootDir>/__mocks__/lucide-react.js',
    // react-leaflet/leaflet are ESM + need browser APIs jsdom lacks; force every
    // importer (component AND test) onto one mock to avoid module-instance skew.
    '^react-leaflet$': '<rootDir>/src/test/mocks/react-leaflet.js',
    '^leaflet$': '<rootDir>/src/test/mocks/leaflet.js',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/app/(.*)$': '<rootDir>/src/app/$1',
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
  ],

  // Transform ignore patterns - Allow ES modules to be transformed
  transformIgnorePatterns: [
    'node_modules/(?!(@testing-library|next-intl|@axe-core|@tanstack)/)',
    '^.+\\.module\\.(css|sass|scss)$',
  ],

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async.
//
// next/jest overwrites transformIgnorePatterns with its own value, so the entry
// in `config` above never reached Jest — which is why next-intl was already
// listed there and the suites still died with "Unexpected token 'export'".
// Resolve the config first, then set the pattern on the result: that is the only
// place it sticks.
//
// next-intl ships ESM and re-exports from use-intl, so both need transforming;
// listing only next-intl moves the same error one package along.
const TRANSFORM_ESM_DEPS = [
  '@testing-library',
  'next-intl',
  'use-intl',
  '@axe-core',
  '@tanstack',
]

module.exports = async () => {
  const resolved = await createJestConfig(config)()
  resolved.transformIgnorePatterns = [
    `node_modules/(?!(${TRANSFORM_ESM_DEPS.join('|')})/)`,
    '^.+\\.module\\.(css|sass|scss)$',
  ]
  return resolved
}