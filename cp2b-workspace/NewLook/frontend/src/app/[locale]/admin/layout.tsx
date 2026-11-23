import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { pageTitle } from '@/lib/pageMetadata'

// The page is a client component; title and robots come from here. Not indexed:
// it is not linked anywhere and is only for admins.
export const metadata: Metadata = {
  title: pageTitle('Acessos'),
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
