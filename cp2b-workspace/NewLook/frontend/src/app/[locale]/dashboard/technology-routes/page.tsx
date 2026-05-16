'use client'

import { useTranslations } from 'next-intl'
import Breadcrumb from '@/components/ui/Breadcrumb'
import dynamic from 'next/dynamic'

const BiogasCalculator = dynamic(() => import('./components/BiogasCalculator'), { ssr: false })

export default function TechnologyRoutesPage() {
  const t = useTranslations('calculator')
  const tCommon = useTranslations('common')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Breadcrumb
          items={[
            { label: tCommon('nav.dashboard'), href: '../' },
            { label: t('title') },
          ]}
        />

        <div className="mt-4 mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('subtitle')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <BiogasCalculator />
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          CP2B / UNICAMP · Dados baseados em coeficientes científicos validados ·{' '}
          <a href="mailto:cp2b@unicamp.br" className="underline hover:text-gray-600">cp2b@unicamp.br</a>
        </p>
      </div>
    </div>
  )
}
