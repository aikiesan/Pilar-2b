'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { useLocale } from 'next-intl'
import { usePathname } from '@/navigation'
import { isLocale } from '@/config/i18n'
import { forgetVisitor, trackPageview } from '@/lib/analytics'
import { onConsentChange, readConsent } from '@/lib/consent'

const noChoiceOnTheServer = () => null

/**
 * Sends a page view on every route change while the visitor accepts
 * statistics, and deletes the statistics cookie when they stop. Renders nothing.
 */
export default function AnalyticsTracker() {
  const pathname = usePathname()
  const locale = useLocale()
  const consent = useSyncExternalStore(onConsentChange, readConsent, noChoiceOnTheServer)

  useEffect(() => {
    if (consent === 'all' && isLocale(locale)) trackPageview(pathname, locale)
  }, [consent, pathname, locale])

  useEffect(() => {
    if (consent === 'essential') forgetVisitor()
  }, [consent])

  return null
}
