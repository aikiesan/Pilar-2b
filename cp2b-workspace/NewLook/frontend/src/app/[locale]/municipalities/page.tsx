/**
 * /municipalities — find a municipality: the search box, then every
 * municipality the API serves, A to Z, each linking to its profile.
 *
 * The list and its count come from the API (/municipalities/names). Without
 * it the page says so and keeps the search; it never lists a name or a number
 * it did not receive.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/navigation';
import MunicipalitySearch from '@/components/home/MunicipalitySearch';
import { serverGetJson } from '@/lib/serverApi';

interface MunicipalityName {
  id?: number;
  municipality_name?: unknown;
  ibge_code?: unknown;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('municipalities_index');
  return { title: `${t('title')} · PILAR-2b`, description: t('lede') };
}

// "Ábaco" files under A, as people look for it.
const initial = (name: string) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').charAt(0).toUpperCase();

async function municipalityNames() {
  const body = await serverGetJson<{ data?: MunicipalityName[] } | MunicipalityName[]>('/municipalities/names?limit=1000');
  const rows = Array.isArray(body) ? body : body?.data;
  if (!Array.isArray(rows)) return null;
  return rows
    .filter((r): r is { municipality_name: string; ibge_code: string | number } =>
      typeof r.municipality_name === 'string' && (typeof r.ibge_code === 'string' || typeof r.ibge_code === 'number'))
    .map((r) => ({ name: r.municipality_name, ibge: String(r.ibge_code) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export default async function MunicipalitiesPage() {
  const t = await getTranslations('municipalities_index');
  const names = await municipalityNames();

  const groups = new Map<string, { name: string; ibge: string }[]>();
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
                  className="inline-flex h-10 w-10 items-center justify-center border border-line bg-paper-raised text-sm font-medium text-ink hover:border-line-strong"
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
                          href={`/municipality/${m.ibge}`}
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
