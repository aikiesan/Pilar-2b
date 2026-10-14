/**
 * The full-viewport tools: pages that fill the screen and bring their own
 * controls. They have no footer and no phone bottom bar (the map has its own
 * bottom sheet there), so whatever floats at the bottom of the screen sits
 * lower on them.
 */
import { usePathname } from 'next/navigation'

export const FULL_VIEWPORT = ['/map', '/calculator', '/analysis']

/** Matched on the locale-free path, so "/analysis" is that tool and nothing else. */
export function isFullViewport(pathname: string | null): boolean {
  const path = (pathname ?? '').replace(/^\/(en|pt-BR)(?=\/|$)/, '') || '/'
  return FULL_VIEWPORT.some((tool) => path === tool || path.startsWith(`${tool}/`))
}

/** True where the phone bottom bar shows (below md): every page but the tools. */
export function useHasTabBar(): boolean {
  return !isFullViewport(usePathname())
}
