/**
 * Sets NODE_ENV for a test. Next declares it read-only, which is right for app
 * code; these tests exercise both environments on purpose.
 */
export function setNodeEnv(value: string | undefined): void {
  ;(process.env as Record<string, string | undefined>).NODE_ENV = value
}
