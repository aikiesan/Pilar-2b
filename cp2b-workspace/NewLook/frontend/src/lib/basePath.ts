/**
 * The path the app is served under: "/pilar2b" in production (behind Apache),
 * "" in development. Next adds it to its own links and assets; a URL built by
 * hand — a fetch of a file in public/, a cookie's path — adds it here.
 *
 * next.config.js (env) inlines NEXT_PUBLIC_BASE_PATH at build time.
 */
export const BASE_PATH: string = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

/** `path` (starting with "/") under the app's base path. */
export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`
}
