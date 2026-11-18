import type { ReactNode } from 'react'
import { navMetadata } from '@/lib/pageMetadata'

export const generateMetadata = () => navMetadata('dashboard')

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return children
}
