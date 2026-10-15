'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useLocale } from 'next-intl'
import { usePathname } from '@/navigation'
import { isLocale } from '@/config/i18n'
import { countPageview, forgetVisitor, sendVisibleTime, trackPageview } from '@/lib/analytics'
import { onConsentChange, readConsent } from '@/lib/consent'
import { createVisibleTimer, type VisibleTimer } from '@/lib/visibleTime'

const noChoiceOnTheServer = () => null

/**
 * On every route change: counts the page in the anonymous totals and measures
 * how long it stays visible (every visitor; no cookie, no identifier), and
 * sends a consented page view while the visitor accepts statistics. Deletes
 * the statistics cookie when they stop. Renders nothing.
 */
export default function AnalyticsTracker() {
  const pathname = usePathname()
  const locale = useLocale()
  const consent = useSyncExternalStore(onConsentChange, readConsent, noChoiceOnTheServer)
  const timer = useRef<VisibleTimer | null>(null)

  useEffect(() => {
    const visible = createVisibleTimer(sendVisibleTime)
    timer.current = visible
    const onVisibility = () =>
      document.visibilityState === 'visible' ? visible.visible() : visible.hidden()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', visible.hidden)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', visible.hidden)
      visible.hidden()
      timer.current = null
    }
  }, [])

  useEffect(() => {
    if (!isLocale(locale)) return
    countPageview(pathname, locale)
    timer.current?.start(pathname)
  }, [pathname, locale])

  useEffect(() => {
    if (consent === 'all' && isLocale(locale)) trackPageview(pathname, locale)
  }, [consent, pathname, locale])

  useEffect(() => {
    if (consent === 'essential') forgetVisitor()
  }, [consent])

  return null
}
