import { redirect } from 'next/navigation'
import { defaultLocale } from '@/config/i18n'

// The canonical dashboard lives under /[locale]/dashboard. This non-locale
// route is kept only to preserve old bookmarks (e.g. /pilar2b/dashboard) and
// redirects to the default locale. basePath is applied automatically.
export default function DashboardRedirect() {
  redirect(`/${defaultLocale}/dashboard`)
}
