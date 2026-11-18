/**
 * A page's own <title>: "<page> · PILAR-2b".
 *
 * Without it every page carried the layout's long site title, so browser tabs,
 * bookmarks and the screen-reader route announcer all said the same thing on
 * every page. Client pages cannot export metadata, so their folder gets a small
 * layout.tsx that calls one of these.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { NavDescriptionKey, NavKey } from '@/components/layout/siteNav';

export const SITE_NAME = 'PILAR-2b';

export const pageTitle = (title: string) => `${title} · ${SITE_NAME}`;

/** Title (and description) from the navigation's own labels. */
export async function navMetadata(labelKey: NavKey, descriptionKey?: NavDescriptionKey): Promise<Metadata> {
  const t = await getTranslations('common');
  return {
    title: pageTitle(t(`nav.${labelKey}`)),
    ...(descriptionKey ? { description: t(`nav_descriptions.${descriptionKey}`) } : {}),
  };
}

/** Title for a page whose name lives outside the navigation. */
export function titledMetadata(title: string, description?: string): Metadata {
  return { title: pageTitle(title), ...(description ? { description } : {}) };
}
