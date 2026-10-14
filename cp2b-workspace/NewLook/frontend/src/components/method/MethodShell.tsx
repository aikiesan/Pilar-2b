/**
 * The frame of the Método pages: a header (breadcrumb, eyebrow, title, lede)
 * and the section's sub-menu beside the content. On desktop the sub-menu is a
 * sticky list on the left; on phones it is a row of chips that scrolls
 * sideways, above the content.
 *
 * The sub-menu lists the Método group of siteNav.ts, so it and the header's
 * mega-menu always offer the same pages.
 */
import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/navigation';
import { NAV_GROUPS } from '@/components/layout/siteNav';

const METHOD = NAV_GROUPS.find((group) => group.id === 'method')!;

export default async function MethodShell({
  current,
  title,
  lede,
  children,
}: {
  /** The href of this page in the Método group. */
  current: string;
  title: string;
  lede: string;
  children: ReactNode;
}) {
  const t = await getTranslations('method');
  const tNav = await getTranslations('common.nav');

  return (
    <div className="bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          {current === '/method' ? (
            <p className="eyebrow">{t('eyebrow')}</p>
          ) : (
            <nav aria-label={t('breadcrumb')} className="text-sm text-ink-muted">
              <Link href="/method" className="underline-offset-2 hover:text-ink hover:underline">{t('eyebrow')}</Link>
              <span aria-hidden="true" className="mx-2">/</span>
              <span aria-current="page">{title}</span>
            </nav>
          )}
          <h1 className="mt-3 max-w-4xl text-4xl text-ink sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-ink-muted">{lede}</p>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[14rem_1fr] lg:gap-12 lg:px-8 lg:py-12">
        <nav aria-label={t('nav_label')} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 lg:overflow-visible">
          <ul className="flex min-w-max gap-2 lg:sticky lg:top-24 lg:min-w-0 lg:flex-col lg:gap-0 lg:border-l lg:border-line">
            {METHOD.items.map(({ href, labelKey }) => {
              const active = href === current;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-[40px] items-center whitespace-nowrap border px-3 text-sm transition-colors lg:-ml-px lg:min-h-[36px] lg:whitespace-normal lg:border-0 lg:border-l-2 lg:py-1.5 ${
                      active
                        ? 'border-terra-600 bg-paper-raised font-medium text-terra-700 dark:border-terra-400 dark:text-terra-300 lg:bg-transparent'
                        : 'border-line bg-paper-raised text-ink-muted hover:text-ink lg:border-transparent lg:bg-transparent'
                    }`}
                  >
                    {tNav(labelKey)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
