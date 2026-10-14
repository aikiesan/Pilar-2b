/**
 * /dashboard/about used to bounce visitors to nipe.unicamp.br/cp2b from the
 * browser. CP2b and NIPE are presented on /about#parceiros now.
 *
 * next.config.js answers this path with a 301; this stub is the fallback for
 * any server that skips those redirects.
 */
import { permanentRedirect } from '@/navigation'
import { defaultLocale, isLocale } from '@/config/i18n'

export default async function DashboardAboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  permanentRedirect({ href: '/about#parceiros', locale: isLocale(locale) ? locale : defaultLocale })
}
