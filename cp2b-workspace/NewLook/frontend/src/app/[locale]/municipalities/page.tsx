/**
 * /municipalities — find a municipality: the search box, then every
 * municipality the platform covers (São Paulo and the Minas Gerais pilot), A to
 * Z, each linking to its profile at its readable address.
 *
 * The list and its count come from the API (lib/municipalityDirectory). Without
 * it the page says so and keeps the search; it never lists a name or a number
 * it did not receive.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/navigation';
import MunicipalitySearch from '@/components/home/MunicipalitySearch';
import { municipalityDirectory, type DirectoryEntry } from '@/lib/municipalityDirectory';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('municipalities_index');
  return { title: `${t('title')} · PILAR-2b`, description: t('lede') };
}

// "Ábaco" files under A, as people look for it.
const initial = (name: string) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').charAt(0).toUpperCase();

export default async function MunicipalitiesPage() {
  const t = await getTranslations('municipalities_index');
  const names = await municipalityDirectory();

  const groups = new Map<string, DirectoryEntry[]>();
  for (const m of names ?? []) {
    const letter = initial(m.name);
    groups.set(letter, [...(groups.get(letter) ?? []), m]);
  }

  return (
    <div className="bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1 className="mt-3 text-4xl text-ink sm:text-5xl">{t('title')}</h1>
          <p className="mt-4 max-w-2xl text-ink-muted">{t('lede')}</p>
          <div className="mt-8 max-w-xl">
            <MunicipalitySearch />
          </div>
        </div>
      </header>

      <section aria-labelledby="municipalities-all" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="municipalities-all" className="text-3xl text-ink">{t('all_heading')}</h2>
          {names && <p className="text-sm text-ink-muted">{t('count', { count: names.length })}</p>}
        </div>

        {names === null ? (
          <p className="mt-6 max-w-2xl border border-line border-l-2 border-l-terra-900 bg-paper-raised px-4 py-3 text-sm text-ink">
            {t('unavailable')}
          </p>
        ) : names.length === 0 ? (
          <p className="mt-6 text-sm text-ink-muted">{t('empty')}</p>
        ) : (
          <>
            <nav aria-label={t('letters_nav')} className="mt-6 flex flex-wrap gap-1">
              {[...groups.keys()].map((letter) => (
                <a
                  key={letter}
                  href={`#letra-${letter}`}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-paper-raised text-sm font-medium text-ink hover:border-line-strong"
                >
                  {letter}
                </a>
              ))}
            </nav>
            <div className="mt-8 space-y-10">
              {[...groups.entries()].map(([letter, list]) => (
                <section key={letter} id={`letra-${letter}`} aria-labelledby={`letra-${letter}-h`} className="scroll-mt-24">
                  <h3 id={`letra-${letter}-h`} className="border-b border-line pb-2 font-display text-2xl text-ink">{letter}</h3>
                  <ul className="mt-3 columns-2 gap-6 text-sm sm:columns-3 lg:columns-4">
                    {list.map((m) => (
                      <li key={m.ibge} className="break-inside-avoid">
                        <Link
                          href={`/municipalities/${m.slug}`}
                          className="inline-flex min-h-[32px] items-center text-ink underline-offset-2 hover:text-terra-700 hover:underline dark:hover:text-terra-300"
                        >
                          {m.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
