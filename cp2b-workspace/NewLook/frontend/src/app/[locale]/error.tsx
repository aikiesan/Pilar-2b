'use client'

/**
 * Any page that fails while rendering. The header and footer stay (this
 * boundary sits inside the locale layout), so the visitor keeps the menus, and
 * the page offers the three ways forward: try again, home, or the map.
 */
import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { RotateCcw } from 'lucide-react'
import { Link } from '@/navigation'
import { logger } from '@/lib/logger'

export default function PageError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations('wayfinding.error')
  const tNav = useTranslations('common.nav')

  useEffect(() => {
    logger.error('Page render failed', error)
  }, [error])

  return (
    <div className="bg-paper">
      <div role="alert" className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 className="mt-3 text-3xl text-ink sm:text-4xl">{t('title')}</h1>
        <p className="mt-4 max-w-2xl text-ink-muted">{t('body')}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={() => retry()} className="btn-primary min-h-[44px]">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t('retry')}
          </button>
          <Link href="/" className="btn-secondary min-h-[44px]">
            {tNav('home')}
          </Link>
          <Link href="/map" className="btn-secondary min-h-[44px]">
            {tNav('open_map')}
          </Link>
        </div>
      </div>
    </div>
  )
}
