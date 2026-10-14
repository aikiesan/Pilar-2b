'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

export default function ConditionalFooter() {
  const pathname = usePathname();
  // Full-viewport tools have no footer: below them it only lets the page scroll
  // down and strand the visitor on the footer. The landing at "/" is an
  // ordinary page and keeps it.
  if (
    pathname.includes('/map') ||
    pathname.includes('/technology-routes') ||
    pathname.includes('/advanced-analysis')
  ) return null;
  return <Footer />;
}
