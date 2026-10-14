'use client';

import Footer from './Footer';
import { useHasTabBar } from './fullViewport';

export default function ConditionalFooter() {
  // Full-viewport tools have no footer: below them it only lets the page scroll
  // down and strand the visitor on the footer. The landing at "/" is an
  // ordinary page and keeps it.
  if (!useHasTabBar()) return null;
  return (
    <>
      <Footer />
      {/* Room for the phone bottom bar, so it never covers the footer's end. */}
      <div aria-hidden="true" className="h-[calc(3.5rem+env(safe-area-inset-bottom))] bg-terra-900 md:hidden" />
    </>
  );
}
