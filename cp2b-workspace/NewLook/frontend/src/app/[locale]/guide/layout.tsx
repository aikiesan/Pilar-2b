import { Link } from '@/navigation'
import { useTranslations } from 'next-intl'
import { BookOpen } from 'lucide-react'
import GuideTourController from '@/components/ui/GuideTourController'
import { navMetadata } from '@/lib/pageMetadata'

// Article pages set their own title; this one names the guide's index.
export const generateMetadata = () => navMetadata('guide_usage', 'guide')

export default function GuideLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = useTranslations('guide')

  // One rule for every sidebar link; the map entry stands out as the action.
  const link =
    'block border-l-2 border-transparent px-3 py-2 text-ink hover:border-line-strong hover:bg-paper-sunken transition-colors'

  return (
    <div className="flex min-h-screen bg-paper">
      {/* Sidebar — md and up. Sticky inside the flow (it was position: fixed,
          which slid it over the footer at the end of every guide page). */}
      <aside className="hidden md:block w-64 shrink-0 sticky top-16 self-start h-[calc(100dvh-4rem)] overflow-y-auto border-r border-line bg-paper-raised p-6">
        <h2 id="guide-nav-heading" className="text-xl text-ink mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-terra-600 dark:text-terra-400" aria-hidden="true" />
          {t('sidebar_heading')}
        </h2>

        <nav aria-labelledby="guide-nav-heading" className="space-y-0.5">
          <span className="eyebrow block mb-2 px-3">{t('main_topics')}</span>

          <Link href="/guide" className={link}>{t('nav_intro')}</Link>
          <Link
            href="/map"
            className="block border-l-2 border-terra-600 dark:border-terra-400 bg-paper-sunken px-3 py-2 font-medium text-terra-700 dark:text-terra-300 hover:bg-terra-50 dark:hover:bg-paper transition-colors"
          >
            {t('nav_open_map')}
          </Link>

          <span className="eyebrow block mt-6 mb-2 px-3">{t('topics_label')}</span>

          <Link href="/guide/mapa" className={link}>{t('nav_map')}</Link>
          <Link href="/guide/analises" className={link}>{t('nav_analyses')}</Link>
          <Link href="/guide/base-cientifica" className={link}>{t('nav_science')}</Link>
          <Link href="/guide/calculadora" className={link}>{t('nav_calculator')}</Link>
          <Link href="/guide/proximidade" className={link}>{t('nav_proximity')}</Link>
          <Link href="/guide#faq" className={link}>{t('nav_faq')}</Link>
        </nav>
      </aside>

      {/* Área de Conteúdo Dinâmico (Direita) */}
      <div className="flex-1 min-w-0 p-4 sm:p-8 max-w-5xl relative">
        {children}
      </div>

      {/* Controlador de Onboarding e Botão Flutuante de Ajuda */}
      <GuideTourController />
    </div>
  )
}
