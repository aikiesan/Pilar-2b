import type { ReactNode } from 'react'
import { navMetadata } from '@/lib/pageMetadata'

// The page is a client component; its title comes from here.
export const generateMetadata = () => navMetadata('map_interactive', 'map')

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
