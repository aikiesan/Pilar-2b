import { redirect } from 'next/navigation'
import { defaultLocale } from '@/config/i18n'

// The canonical map lives under /[locale]/map. This non-locale route is kept
// only to preserve old bookmarks (e.g. /pilar2b/map) and redirects to the
// default locale. basePath is applied automatically.
export default function MapRedirect() {
  redirect(`/${defaultLocale}/map`)
}
