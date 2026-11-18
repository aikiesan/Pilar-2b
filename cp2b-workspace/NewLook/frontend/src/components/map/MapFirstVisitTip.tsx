'use client'

import { useState, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import Metaninho from '@/components/mascot/Metaninho'

const SEEN_KEY = 'pilar2b-map-tip-seen'

const noSubscription = () => () => {}
function readSeen(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) !== null
  } catch {
    return false
  }
}
// On the server, render nothing: the card appears once the browser has read
// the storage.
const seenOnServer = () => true

/**
 * One card on a visitor's first map visit, with Metaninho, saying what to do
 * first: click a municipality, or search for one. Shown once per browser
 * (localStorage); "Entendi" or the close button hides it for good. Without
 * storage (private mode) it shows on each visit and still closes.
 */
export default function MapFirstVisitTip() {
  const t = useTranslations('Map.first_visit')
  const seen = useSyncExternalStore(noSubscription, readSeen, seenOnServer)
  const [dismissed, setDismissed] = useState(false)

  if (seen || dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      window.localStorage.setItem(SEEN_KEY, '1')
    } catch {
      // Storage blocked: it simply shows again next time.
    }
  }

  return (
    <div
      role="dialog"
      aria-labelledby="map-first-visit-title"
      className="surface-light absolute bottom-24 left-1/2 z-[1001] flex w-[min(92%,30rem)] -translate-x-1/2 items-end gap-3 rounded-2xl border border-line bg-paper-raised p-4 pr-10 shadow-xl md:bottom-8"
    >
      <Metaninho pose="feliz" size={72} className="-mb-1 shrink-0" />
      <div className="min-w-0">
        <p id="map-first-visit-title" className="text-sm font-bold text-ink">{t('title')}</p>
        <p className="mt-1 text-sm leading-snug text-ink-muted">{t('body')}</p>
        <button type="button" onClick={dismiss} className="btn-primary mt-3 px-4 py-1.5 text-sm">
          {t('dismiss')}
        </button>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('close')}
        className="absolute right-2 top-2 rounded-full p-1.5 text-ink-muted hover:bg-paper-sunken hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
