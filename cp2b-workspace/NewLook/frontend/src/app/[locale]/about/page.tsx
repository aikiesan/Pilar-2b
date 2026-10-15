/**
 * /about is the CP2b site's /sobre now: who the centre is (mission,
 * governance, partners, team, research axes) is kept there, by the people who
 * run it, instead of in a second copy here. The platform's own FAQ moved to
 * the guide (/guide#faq).
 *
 * next.config.js answers this path with a 301 before it reaches the app; this
 * stub is the fallback for any server that skips those redirects.
 */
import { permanentRedirect } from 'next/navigation'
import { CP2B_PAGES } from '@/config/contact'

export default function AboutPage() {
  permanentRedirect(CP2B_PAGES.about)
}
