import { notFound } from 'next/navigation';
import { METHOD_PAGES_ENABLED } from '@/lib/featureFlags';

/** 404 a Método page while the section is held back (see METHOD_PAGES_ENABLED). */
export function requireMethodPages(): void {
  if (!METHOD_PAGES_ENABLED) notFound();
}
