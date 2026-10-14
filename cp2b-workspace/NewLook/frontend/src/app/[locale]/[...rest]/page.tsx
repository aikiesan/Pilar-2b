import { notFound } from 'next/navigation';

/**
 * Any address under a locale that no page answers. Throwing notFound() here,
 * inside the locale layout, renders [locale]/not-found.tsx with the site's
 * header and footer and a 404 status. Without it Next would fall through to
 * the bare root not-found page.
 */

// The locale layout pins dynamicParams to false (only the two locales exist);
// this route must accept any path, so it opts back in.
export const dynamicParams = true;

export default function CatchAll() {
  notFound();
}
