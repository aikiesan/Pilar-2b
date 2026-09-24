import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/navigation';
import { ArrowLeft } from 'lucide-react';
import type { Messages } from '@/types/i18n';

/** A guide article: every key of guide_articles except the shared sidebar copy. */
type GuideSlug = Exclude<keyof Messages['guide_articles'], 'sidebar'>;

// Article order in the "other topics" list. The URL slugs are identifiers and
// stay Portuguese in both locales, so existing links keep working.
const GUIDE_SLUGS: GuideSlug[] = ['mapa', 'analises', 'base-cientifica', 'calculadora', 'proximidade'];

interface GuideSection {
  id: string;
  title: string;
  content: string;
}

function isGuideSlug(value: string): value is GuideSlug {
  return (GUIDE_SLUGS as string[]).includes(value);
}

export function generateStaticParams() {
  return GUIDE_SLUGS.map((slug) => ({ slug }));
}

// Only the slugs above exist; anything else is a 404, not an empty article.
export const dynamicParams = false;

export default async function GuideArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isGuideSlug(slug)) notFound();

  const t = await getTranslations('guide_articles');
  const tNav = await getTranslations('common.nav');
  const sections = t.raw(`${slug}.sections`) as GuideSection[];
  const otherTopics = GUIDE_SLUGS.filter((other) => other !== slug);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-8" aria-label={t('sidebar.breadcrumb_aria')}>
        <Link href="/" className="hover:text-cp2b-green">
          {tNav('home')}
        </Link>
        <span className="mx-2">/</span>
        <Link href="/guide" className="hover:text-cp2b-green">
          {tNav('guide')}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 dark:text-white font-medium">{t(`${slug}.title`)}</span>
      </nav>

      <div className="flex flex-col md:flex-row gap-12">
        <aside className="w-full md:w-64 shrink-0">
          <Link
            href="/guide"
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-cp2b-green font-medium mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('sidebar.back_button')}
          </Link>

          <div className="sticky top-24">
            <h3 className="text-xs font-bold text-gray-400 tracking-wider mb-4 uppercase">
              {t('sidebar.on_this_page')}
            </h3>

            <ul className="space-y-3 mb-10 border-l-2 border-gray-100 dark:border-slate-800">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className={`block pl-4 text-sm transition-colors ${
                      index === 0
                        ? 'text-cp2b-green font-semibold border-l-2 -ml-[2px] border-cp2b-green'
                        : 'text-gray-600 dark:text-gray-400 hover:text-cp2b-green'
                    }`}
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>

            <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-4">
              {t('sidebar.other_topics')}
            </h3>
            <ul className="space-y-3">
              {otherTopics.map((other) => (
                <li key={other}>
                  <Link
                    href={`/guide/${other}`}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-cp2b-green transition-colors"
                  >
                    {t(`${other}.title`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <article className="flex-1 max-w-3xl">
          <span className="text-cp2b-green font-semibold text-sm tracking-wide uppercase">{tNav('guide')}</span>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mt-2 mb-4">{t(`${slug}.title`)}</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 leading-relaxed">{t(`${slug}.subtitle`)}</p>

          <div className="space-y-12">
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{section.title}</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {section.content}
                </p>
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
