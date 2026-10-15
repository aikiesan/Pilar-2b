/**
 * /dashboard/about used to bounce visitors to nipe.unicamp.br/cp2b from the
 * browser, and later to /about#parceiros. CP2b's partners are on the CP2b
 * site now.
 *
 * next.config.js answers this path with a 301; this stub is the fallback for
 * any server that skips those redirects.
 */
import { permanentRedirect } from 'next/navigation'
import { CP2B_PAGES } from '@/config/contact'

export default function DashboardAboutPage() {
  permanentRedirect(CP2B_PAGES.partners)
}
