import { notFound } from 'next/navigation';
import { MAP_ANALYSES_ENABLED } from '@/lib/featureFlags';

/**
 * 404 a page held back with the map analyses (see MAP_ANALYSES_ENABLED):
 * /explore, whose doors open the analyses on /map.
 */
export function requireMapAnalyses(): void {
  if (!MAP_ANALYSES_ENABLED) notFound();
}
