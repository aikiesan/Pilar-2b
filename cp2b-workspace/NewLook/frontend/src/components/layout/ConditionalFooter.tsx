'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

const FULL_VIEWPORT = ['/map', '/calculator', '/analysis'];

export default function ConditionalFooter() {
  const pathname = usePathname();
  // Full-viewport tools have no footer: below them it only lets the page scroll
  // down and strand the visitor on the footer. The landing at "/" is an
  // ordinary page and keeps it.
  // Matched on the locale-free path, so "/analysis" is that tool and nothing else.
  const path = pathname.replace(/^\/(en|pt-BR)(?=\/|$)/, '') || '/';
  if (FULL_VIEWPORT.some((tool) => path === tool || path.startsWith(`${tool}/`))) return null;
  return <Footer />;
}
