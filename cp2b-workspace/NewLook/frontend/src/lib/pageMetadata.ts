/**
 * A page's own <title>: "<page> · PILAR-2b".
 *
 * Without it every page carried the layout's long site title, so browser tabs,
 * bookmarks and the screen-reader route announcer all said the same thing on
 * every page. Client pages cannot export metadata, so their folder gets a small
 * layout.tsx that calls one of these.
 */
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import type { NavDescriptionKey, NavKey } from '@/components/layout/siteNav';
import { publicUrl } from '@/lib/siteUrl';

export const SITE_NAME = 'PILAR-2b';

export const pageTitle = (title: string) => `${title} · ${SITE_NAME}`;

/**
 * Canonical and hreflang links of a public page, by its path without the
 * locale ("/" for the home, "/map", "/data/sugarcane/vinasse"). The canonical
 * is the clean address, so a shared variant such as /map?layer=… or a
 * tracking parameter counts as the same page in search results.
 */
export function localeAlternates(locale: string, path: string): NonNullable<Metadata['alternates']> {
  const suffix = path === '/' ? '' : path;
  return {
    canonical: publicUrl(`/${locale}${suffix}`),
    languages: {
      'pt-BR': publicUrl(`/pt-BR${suffix}`),
      en: publicUrl(`/en${suffix}`),
      // Portuguese is the platform's primary locale.
      'x-default': publicUrl(`/pt-BR${suffix}`),
    },
  };
}

/** The same links for a page whose metadata has no locale parameter at hand. */
export async function canonical(path: string): Promise<Pick<Metadata, 'alternates'>> {
  return { alternates: localeAlternates(await getLocale(), path) };
}

/**
 * Pages with nothing to offer from a search result (sign-in, account and
 * one-time email pages): kept out of the index, their links still followed.
 */
export const NOT_INDEXED: Metadata['robots'] = { index: false, follow: true };

/**
 * Title (and description) from the navigation's own labels. With a path, the
 * page also gets its canonical and hreflang links (see localeAlternates).
 */
export async function navMetadata(
  labelKey: NavKey,
  descriptionKey?: NavDescriptionKey,
  path?: string,
): Promise<Metadata> {
  const t = await getTranslations('common');
  return {
    title: pageTitle(t(`nav.${labelKey}`)),
    ...(descriptionKey ? { description: t(`nav_descriptions.${descriptionKey}`) } : {}),
    ...(path ? await canonical(path) : {}),
  };
}

/** Title for a page whose name lives outside the navigation. */
export function titledMetadata(title: string, description?: string): Metadata {
  return { title: pageTitle(title), ...(description ? { description } : {}) };
}
