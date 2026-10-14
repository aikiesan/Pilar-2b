/**
 * The 404 page, inside the site's header and footer: what happened in plain
 * words, a municipality search (the most common thing people look for), and
 * the most used pages, so a mistyped or retired address is never a dead end.
 */
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/navigation';
import MunicipalitySearch from '@/components/home/MunicipalitySearch';
import { NAV_GROUPS, type NavLeaf } from '@/components/layout/siteNav';

/** The pages a lost visitor most likely wanted, as the menus label them. */
const PATHS = ['/map', '/municipalities', '/data', '/guide'];
const LEAVES: NavLeaf[] = PATHS.map(
  (href) => NAV_GROUPS.flatMap((group) => group.items).find((item) => item.href === href)!,
);

export default function NotFound() {
  const t = useTranslations('wayfinding.not_found');
  const tNav = useTranslations('common');

  return (
    <div className="bg-paper">
      <title>{`${t('meta_title')} · PILAR-2b`}</title>
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 className="mt-3 text-4xl text-ink sm:text-5xl">{t('title')}</h1>
        <p className="mt-4 max-w-2xl text-ink-muted">{t('body')}</p>

        <div className="mt-8">
          <MunicipalitySearch />
        </div>

        <h2 className="mt-12 text-2xl text-ink">{t('paths')}</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {LEAVES.map(({ href, labelKey, descriptionKey, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex h-full min-h-[44px] items-start gap-3 border border-line bg-paper-raised p-4 transition-colors hover:border-line-strong"
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-terra-700 dark:text-terra-300" aria-hidden="true" />
                <span>
                  <span className="block font-medium text-ink group-hover:underline">{tNav(`nav.${labelKey}`)}</span>
                  {descriptionKey && (
                    <span className="mt-1 block text-sm text-ink-muted">{tNav(`nav_descriptions.${descriptionKey}`)}</span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/"
          className="btn-primary mt-8 min-h-[44px]"
        >
          {t('back_home')}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
