import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import { NOT_INDEXED, titledMetadata } from '@/lib/pageMetadata'

// The page is a client component; its title comes from here.
export async function generateMetadata() {
  const t = await getTranslations('newsletter.unsubscribe')
  return { ...titledMetadata(t('title')), robots: NOT_INDEXED }
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
