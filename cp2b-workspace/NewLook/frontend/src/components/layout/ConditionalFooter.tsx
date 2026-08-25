'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

export default function ConditionalFooter() {
  const pathname = usePathname();
  // The interactive map is the landing page (src/app/[locale]/page.tsx re-exports
  // map/page), so it lives at the locale root ("/pt-BR", "/en") as well as at
  // "/map". The footer is hidden on both: the map is full-viewport, and a footer
  // below it only lets the page scroll down and strand the user on the footer.
  const isLocaleRoot = /^\/[a-z]{2}(-[a-z]{2})?\/?$/i.test(pathname);
  if (
    isLocaleRoot ||
    pathname.includes('/map') ||
    pathname.includes('/technology-routes') ||
    pathname.includes('/advanced-analysis')
  ) return null;
  return <Footer />;
}
