import type { ReactNode } from 'react'
import { navMetadata } from '@/lib/pageMetadata'
import { requireMethodPages } from '@/components/method/requireMethodPages'

// The page is a client component; its title comes from here. It sets out the
// availability factors one by one, so it is held back with the Método pages
// (METHOD_PAGES_ENABLED) and answers 404 until the paper is submitted.
export const generateMetadata = () => {
  requireMethodPages()
  return navMetadata('multicriteria', 'advanced')
}

export default function Layout({ children }: { children: ReactNode }) {
  requireMethodPages()
  return children
}
