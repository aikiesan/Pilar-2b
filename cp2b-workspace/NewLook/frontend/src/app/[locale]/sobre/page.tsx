/**
 * /sobre (the old marketing home, later merged into /about) is the CP2b
 * site's /sobre now.
 *
 * next.config.js answers this path with a 301 before it reaches the app; this
 * stub is the fallback for any server that skips those redirects.
 */
import { permanentRedirect } from 'next/navigation'
import { CP2B_PAGES } from '@/config/contact'

export default function SobrePage() {
  permanentRedirect(CP2B_PAGES.about)
}
