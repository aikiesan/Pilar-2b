'use client'

import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'

const BiogasCalculator = dynamic(() => import('./components/BiogasCalculator'), { ssr: false })

export default function TechnologyRoutesPage() {
  const t = useTranslations('calculator')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('title')}</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">{t('subtitle')}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <BiogasCalculator />
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-slate-500 mt-6">
          CP2B / UNICAMP · Dados baseados em coeficientes científicos validados ·{' '}
          <a href="mailto:cp2b@unicamp.br" className="underline hover:text-gray-500 dark:hover:text-slate-300">cp2b@unicamp.br</a>
        </p>
      </div>
    </div>
  )
}
