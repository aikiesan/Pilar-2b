'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/navigation'
import {
  onConsentChange,
  onOpenConsentPreferences,
  readConsent,
  saveConsent,
  type ConsentChoice,
} from '@/lib/consent'

// Unknown on the server: the banner renders only in the browser, where the
// stored choice can be read, so it never flashes for someone who has chosen.
const unknownOnTheServer = () => undefined

/**
 * The cookie banner: shown until the visitor chooses, and again from the
 * footer's "Cookie preferences". "Accept all" allows the statistics cookie
 * (lib/analytics); "Essential only" refuses it.
 *
 * Deliberately compact: one short paragraph and two equal buttons, a single
 * row from sm up and a slim strip on phones, so it never covers the map or the
 * page it sits on. It still says what the statistics cookie is for, where the
 * data stays and how to change the choice (LGPD art. 8-9). The newsletter
 * sign-up it used to carry lives in the footer only.
 */
export default function CookieConsent() {
  const t = useTranslations('cookieConsent')
  const consent = useSyncExternalStore(onConsentChange, readConsent, unknownOnTheServer)
  const [reopened, setReopened] = useState(false)

  useEffect(() => onOpenConsentPreferences(() => setReopened(true)), [])

  if (consent !== null && !reopened) return null

  function choose(choice: ConsentChoice) {
    saveConsent(choice)
    setReopened(false)
  }

  const button =
    'min-h-[40px] flex-1 sm:flex-none rounded-lg px-4 text-sm font-semibold whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-terra-600'

  return (
    <div
      role="dialog"
      aria-label={t('title')}
      aria-modal="false"
      // Above the tour button (z-999) and the map's phone bottom sheet (z-1200):
      // nothing may cover the choice while it is asked.
      className="fixed inset-x-0 bottom-0 z-[1300] p-2 sm:p-4 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto flex max-w-4xl flex-col gap-2 border border-line bg-paper-raised/95 px-4 py-3 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:gap-4">
        <p className="flex-1 text-xs leading-snug text-ink">
          {t('description')}{' '}
          <Link
            href="/privacy"
            className="font-medium text-terra-600 underline underline-offset-2 hover:no-underline focus:outline-none focus:ring-2 focus:ring-terra-600 rounded dark:text-terra-300"
          >
            {t('privacyLink')}
          </Link>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => choose('essential')}
            className={`${button} border border-ink/70 bg-transparent text-ink hover:bg-ink hover:text-paper`}
          >
            {t('essentialOnly')}
          </button>
          <button
            type="button"
            onClick={() => choose('all')}
            className={`${button} bg-terra-600 text-white hover:bg-terra-700`}
          >
            {t('acceptAll')}
          </button>
        </div>
      </div>
    </div>
  )
}
