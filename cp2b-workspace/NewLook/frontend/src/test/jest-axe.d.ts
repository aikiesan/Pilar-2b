/**
 * Types for jest-axe, which ships none: only what the tests use. (@types/jest-axe
 * would install a second, older axe-core beside the one jest-axe runs.)
 */
declare module 'jest-axe' {
  import type { AxeResults, RunOptions } from 'axe-core'

  export function axe(html: Element | string, options?: RunOptions): Promise<AxeResults>
  export const toHaveNoViolations: jest.ExpectExtendMap
}

declare module 'jest-axe/extend-expect'

declare namespace jest {
  interface Matchers<R, T = {}> {
    toHaveNoViolations(): R
  }
}
