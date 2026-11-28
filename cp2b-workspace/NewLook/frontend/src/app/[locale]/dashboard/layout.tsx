import type { ReactNode } from 'react'
import { NOT_INDEXED, navMetadata } from '@/lib/pageMetadata'

export const generateMetadata = async () => ({ ...(await navMetadata('dashboard')), robots: NOT_INDEXED })

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return children
}
