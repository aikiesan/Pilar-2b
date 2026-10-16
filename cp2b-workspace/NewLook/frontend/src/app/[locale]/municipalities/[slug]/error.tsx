'use client'

/**
 * A municipality page whose figures could not be read (the API did not answer).
 * The page throws instead of rendering an outage, so ISR keeps the last good
 * copy; this covers a first visit. "Try again" re-renders the segment.
 */
import { useTranslations } from 'next-intl'
import { Link } from '@/navigation'

export default function MunicipalityError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('municipality_profile')
  return (
    <div className="bg-paper">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl text-ink sm:text-4xl">{t('unavailable_title')}</h1>
        <p className="mt-3 max-w-2xl text-ink-muted">{t('unavailable_body')}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-[44px] items-center bg-terra-800 px-5 text-sm font-medium text-white hover:bg-terra-900"
          >
            {t('retry')}
          </button>
          <Link
            href="/municipalities"
            className="inline-flex min-h-[44px] items-center rounded-lg border border-line bg-paper-raised px-5 text-sm font-medium text-ink hover:border-line-strong"
          >
            {t('index')}
          </Link>
        </div>
      </div>
    </div>
  )
}
