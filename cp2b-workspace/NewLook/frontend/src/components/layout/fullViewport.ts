/**
 * The full-viewport tools: pages that fill the screen and bring their own
 * controls. They have no footer and no phone bottom bar (the map has its own
 * bottom sheet there), so whatever floats at the bottom of the screen sits
 * lower on them. Only the map does: the calculator and the multicriteria
 * analysis scroll like any page, so they keep the footer and the bottom bar.
 */
import { usePathname } from 'next/navigation'

export const FULL_VIEWPORT = ['/map']

/** Matched on the locale-free path, so "/map" is that tool and nothing else (not "/mapa"). */
export function isFullViewport(pathname: string | null): boolean {
  const path = (pathname ?? '').replace(/^\/(en|pt-BR)(?=\/|$)/, '') || '/'
  return FULL_VIEWPORT.some((tool) => path === tool || path.startsWith(`${tool}/`))
}

/** True where the phone bottom bar shows (below md): every page but the tools. */
export function useHasTabBar(): boolean {
  return !isFullViewport(usePathname())
}
