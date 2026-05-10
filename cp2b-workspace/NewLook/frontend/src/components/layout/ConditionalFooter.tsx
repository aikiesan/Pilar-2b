'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

export default function ConditionalFooter() {
  const pathname = usePathname();
  if (
    pathname.includes('/map') ||
    pathname.includes('/technology-routes') ||
    pathname.includes('/advanced-analysis')
  ) return null;
  return <Footer />;
}
