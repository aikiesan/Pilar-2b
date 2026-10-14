import { notFound } from 'next/navigation';
import { METHOD_PAGES_ENABLED } from '@/lib/featureFlags';

/**
 * 404 a page held back with the Método section (see METHOD_PAGES_ENABLED): the
 * Método pages and /analysis, which shows the availability factors.
 */
export function requireMethodPages(): void {
  if (!METHOD_PAGES_ENABLED) notFound();
}
