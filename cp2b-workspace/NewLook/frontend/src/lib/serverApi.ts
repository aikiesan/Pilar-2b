/**
 * Reading the PILAR-2b API from the Next.js server (server components,
 * generateMetadata), as opposed to apiClient.ts, which runs in the browser.
 *
 * The browser reaches the API through Apache (/pilar2b/api/…), but the Node
 * server talks to uvicorn directly. API_INTERNAL_URL names that address; when
 * it is unset, an absolute NEXT_PUBLIC_API_URL is used (local dev), and
 * otherwise the PM2 default from ecosystem.config.js.
 *
 * Every read is cached for an hour and gives up after a few seconds: a page
 * never waits on, or fails because of, a slow or absent API. A failed read is
 * `null`, and the caller says the figure is unavailable; it never shows a
 * number that did not come from the API.
 */

const DEFAULT_INTERNAL_URL = 'http://127.0.0.1:8001'

export function serverApiBase(): string {
  const internal = process.env.API_INTERNAL_URL
  if (internal) return internal.replace(/\/$/, '')
  const pub = process.env.NEXT_PUBLIC_API_URL
  if (pub && /^https?:\/\//.test(pub)) return pub.replace(/\/$/, '')
  return DEFAULT_INTERNAL_URL
}

export async function serverGetJson<T>(
  path: string,
  { revalidate = 3600, timeoutMs = 3000 }: { revalidate?: number; timeoutMs?: number } = {},
): Promise<T | null> {
  try {
    const response = await fetch(`${serverApiBase()}/api/v1${path}`, {
      next: { revalidate },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

/** A non-negative integer from an API body, or null when it is missing or malformed. */
export function countFrom(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null
}
