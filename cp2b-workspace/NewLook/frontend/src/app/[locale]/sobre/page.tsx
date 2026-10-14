/**
 * /sobre was merged into /about (one "who we are" page with anchors).
 *
 * next.config.js answers this path with a 301 before it reaches the app; this
 * stub is the fallback for any server that skips those redirects. Its former
 * content — hero, platform screenshots, feature cards, open data — lives in
 * /about now.
 */
import { permanentRedirect } from '@/navigation'
import { defaultLocale, isLocale } from '@/config/i18n'

export default async function SobrePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  permanentRedirect({ href: '/about', locale: isLocale(locale) ? locale : defaultLocale })
}
