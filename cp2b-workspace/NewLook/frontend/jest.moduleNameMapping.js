// Module name mapping for Jest
module.exports = {
  '^@/(.*)$': '<rootDir>/src/$1',
  '^@/components/(.*)$': '<rootDir>/src/components/$1',
  '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
  '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
  '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
  '^@/types/(.*)$': '<rootDir>/src/types/$1',
  '^@/app/(.*)$': '<rootDir>/src/app/$1',
}