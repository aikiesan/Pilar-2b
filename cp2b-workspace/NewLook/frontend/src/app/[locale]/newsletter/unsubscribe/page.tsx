'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2, MailX } from 'lucide-react'
import { Link } from '@/navigation'
import { unsubscribeFromNewsletter, type UnsubscribeResult } from '@/services/newsletterApi'

type State = 'confirm' | 'working' | UnsubscribeResult

/**
 * The page a newsletter e-mail's unsubscribe link opens (?token=...).
 *
 * It asks for a click rather than unsubscribing on load: mail providers' link
 * scanners open the links in an e-mail, and would otherwise unsubscribe
 * everyone who received it.
 */
function Unsubscribe() {
  const t = useTranslations('newsletter.unsubscribe')
  const token = useSearchParams().get('token')
  const [state, setState] = useState<State>(token ? 'confirm' : 'invalid_token')

  async function confirm() {
    if (!token) return
    setState('working')
    setState(await unsubscribeFromNewsletter(token))
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <MailX className="w-10 h-10 mx-auto mb-4 text-cp2b-green dark:text-cp2b-lime" aria-hidden="true" />
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('title')}</h1>

      <div role="status" aria-live="polite" className="text-gray-700 dark:text-slate-300 mb-8">
        {state === 'confirm' && <p>{t('question')}</p>}
        {state === 'working' && (
          <p className="inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            {t('working')}
          </p>
        )}
        {state === 'unsubscribed' && <p>{t('done')}</p>}
        {state === 'invalid_token' && <p>{t('invalid')}</p>}
        {state === 'failed' && <p>{t('failed')}</p>}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {(state === 'confirm' || state === 'failed') && (
          <button
            type="button"
            onClick={confirm}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-cp2b-green hover:bg-cp2b-dark-green rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cp2b-lime"
          >
            {t('confirm')}
          </button>
        )}
        <Link
          href="/"
          className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg border border-gray-200 dark:border-slate-600 transition-colors"
        >
          {t('back')}
        </Link>
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  // useSearchParams needs a Suspense boundary to render this page statically.
  return (
    <Suspense>
      <Unsubscribe />
    </Suspense>
  )
}
