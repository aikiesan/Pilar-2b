'use client'

/**
 * /calculator — the biogas viability calculator, under the same header as the
 * other sector pages (eyebrow, title, lede over the leaf ornament).
 */
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { HeaderLeaves } from '@/components/ui/ArcOrnament'
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs'

const BiogasCalculator = dynamic(() => import('./components/BiogasCalculator'), { ssr: false })

export default function TechnologyRoutesPage() {
  const t = useTranslations('calculator')
  const breadcrumbs = useBreadcrumbs()

  return (
    <div className="min-h-screen bg-paper">
      <header className="relative overflow-hidden border-b border-line">
        <HeaderLeaves />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <Breadcrumb items={breadcrumbs} />
          <p className="eyebrow mt-4">{t('eyebrow')}</p>
          <h1 className="mt-2 text-4xl text-ink sm:text-5xl">{t('title')}</h1>
          <p className="mt-4 max-w-2xl text-ink-muted">{t('subtitle')}</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="border border-line bg-paper-raised p-6 shadow-sm">
          <BiogasCalculator />
        </div>

        <p className="mt-6 text-center text-xs text-ink-muted">
          {t('footer_note')}
          <a href="mailto:cp2b@unicamp.br" className="underline hover:text-ink">cp2b@unicamp.br</a>
        </p>
      </div>
    </div>
  )
}
