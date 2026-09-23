/**
 * Warm every public route serially before any test worker starts.
 *
 * Why this exists: `next dev` compiles a route on its first request and rewrites
 * `.next/dev/prerender-manifest.json` as it goes, and that write is not atomic.
 * When several workers hit a cold server at once, a shorter write lands on top of
 * a longer one without truncating it, leaving trailing bytes after the closing
 * brace — observed as 548 bytes of file with valid JSON ending at byte 543.
 * Every render reads that manifest, so from then on EVERY route returns 500 with
 * `SyntaxError: Unexpected non-whitespace character after JSON at position N`,
 * until `.next` is wiped. It does not heal on its own.
 *
 * Against a cold server that turned a healthy app into 37 failed tests out of 39
 * — the map specs time out waiting for a Leaflet container that never renders,
 * which reads like a map regression and is not one. With the routes compiled one
 * at a time first, the same 39 tests pass on 8 workers and the manifest stays
 * valid afterwards. The same race plausibly explains part of the CI e2e flakiness
 * that was previously blamed on CORS alone.
 *
 * Playwright starts `webServer` (a plugin) before running globalSetup, so the
 * server is always up by the time this runs — in CI and against Docker alike.
 */

import { request, type FullConfig } from '@playwright/test';
import { WARMUP_ROUTES } from './routes';

/** A cold `next dev` compile of one route was measured at ~7.5 s; leave room. */
const PER_ROUTE_TIMEOUT_MS = 120_000;

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL =
    config.projects[0]?.use?.baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

  const context = await request.newContext({ baseURL });
  const failures: string[] = [];

  try {
    // Strictly sequential: the whole point is that no two first-compiles overlap.
    for (const route of WARMUP_ROUTES) {
      const response = await context.get(route, { timeout: PER_ROUTE_TIMEOUT_MS });
      if (response.status() >= 400) {
        failures.push(`${route} → ${response.status()}`);
      }
    }
  } finally {
    await context.dispose();
  }

  if (failures.length > 0) {
    // One clear message here beats dozens of timeouts that each point elsewhere.
    throw new Error(
      [
        `Warm-up failed against ${baseURL} before any test ran:`,
        ...failures.map((failure) => `  ${failure}`),
        '',
        'If every route is 500 with "Unexpected non-whitespace character after JSON",',
        'the dev server\'s .next/dev/prerender-manifest.json is corrupt. It does not',
        'recover on its own. For the Docker stack, recreate with a fresh .next:',
        '  docker compose up -d --force-recreate --renew-anon-volumes frontend',
        'For a host dev server, stop it and delete frontend/.next.',
      ].join('\n')
    );
  }
}
