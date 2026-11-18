'use client'

import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/**
 * False while the page renders on the server and hydrates, true in the browser:
 * for what cannot render on the server (Leaflet, Joyride). Unlike a "mounted"
 * flag set in an effect, it costs no extra render on client-side navigation.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}
