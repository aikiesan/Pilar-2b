'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { useJoyride, STATUS, type EventData, type Step, type TooltipRenderProps } from 'react-joyride'
import Metaninho, { type MetaninhoPose } from '@/components/mascot/Metaninho'
import { onConsentChange, readConsent } from '@/lib/consent'

// localStorage: the tour was finished or "Não mostrar novamente" was chosen.
const DONE_KEY = 'pilar2b-map-tour-done'
// sessionStorage: closed for this visit; it opens again on the next one.
const LATER_KEY = 'pilar2b-map-tour-later'

type Store = 'localStorage' | 'sessionStorage'
function hasFlag(store: Store, key: string): boolean {
  try {
    return window[store].getItem(key) !== null
  } catch {
    return false
  }
}
function setFlag(store: Store, key: string) {
  try {
    window[store].setItem(key, '1')
  } catch {
    // Storage blocked (private mode): the tour simply opens again next time.
  }
}

/** The steps in order. `anchor` names a [data-tour] element; a step without one is centered. */
const STEPS = [
  { id: 'welcome', pose: 'feliz' },
  { id: 'themes', pose: 'em-pe', anchor: 'map-themes', placement: 'bottom' },
  { id: 'search', pose: 'curioso', anchor: 'map-search', placement: 'right' },
  { id: 'metric', pose: 'neutro', anchor: 'map-metric', placement: 'right' },
  { id: 'viz', pose: 'neutro', anchor: 'map-viz', placement: 'right' },
  { id: 'tabs', pose: 'curioso', anchor: 'map-tabs', placement: 'right' },
  { id: 'scenario', pose: 'tranquilo', anchor: 'map-scenario', placement: 'bottom' },
  { id: 'scope', pose: 'em-pe', anchor: 'map-scope', placement: 'bottom-start' },
  { id: 'basemap', pose: 'neutro', anchor: 'map-basemap', placement: 'left' },
  { id: 'legend', pose: 'tranquilo', anchor: 'map-legend', placement: 'left' },
  { id: 'mobile_tabs', pose: 'em-pe', anchor: 'map-mobile-tabs', placement: 'top' },
  { id: 'click', pose: 'surpreso' },
  { id: 'help', pose: 'feliz', anchor: 'map-tour-help', placement: 'left' },
] as const satisfies readonly { id: string; pose: MetaninhoPose; anchor?: string; placement?: Step['placement'] }[]

/** The first rendered element with this anchor; null when absent or hidden on this viewport. */
function visibleAnchor(name: string): HTMLElement | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`))
  return els.find(el => el.getClientRects().length > 0) ?? null
}

/** The card Joyride renders for each step: Metaninho, the counter and the controls. */
function TourCard({
  step, index, size, isLastStep, controls, backProps, closeProps, primaryProps, skipProps, tooltipProps,
}: TooltipRenderProps) {
  const t = useTranslations('Map.tour')

  // Escape ends the tour (Joyride's own Escape only moves to the next step).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') controls.skip('button_close')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [controls])

  return (
    <div
      {...tooltipProps}
      aria-labelledby="map-tour-title"
      className="surface-light relative w-[min(92vw,24rem)] rounded-2xl border border-line bg-paper-raised p-4 pr-10 text-left shadow-xl"
    >
      <div className="flex items-end gap-3">
        <Metaninho pose={step.data?.pose} size={64} className="-mb-1 shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            {t('progress', { current: index + 1, total: size })}
          </p>
          <h2 id="map-tour-title" className="text-sm font-bold text-ink">{step.title}</h2>
        </div>
      </div>
      <p className="mt-2 text-sm leading-snug text-ink-muted">{step.content}</p>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          {...skipProps}
          onClick={e => {
            setFlag('localStorage', DONE_KEY)
            skipProps.onClick(e)
          }}
          aria-label={t('never')}
          title={t('never')}
          className="mr-auto text-xs font-medium text-ink-muted underline underline-offset-2 hover:text-ink"
        >
          {t('never')}
        </button>
        {index > 0 && (
          <button type="button" {...backProps} aria-label={t('back')} title={t('back')} className="btn-secondary px-3 py-1.5 text-sm">
            {t('back')}
          </button>
        )}
        <button
          type="button"
          {...primaryProps}
          aria-label={isLastStep ? t('last') : t('next')}
          title={isLastStep ? t('last') : t('next')}
          className="btn-primary px-4 py-1.5 text-sm"
        >
          {isLastStep ? t('last') : t('next')}
        </button>
      </div>
      <button
        type="button"
        {...closeProps}
        aria-label={t('close')}
        title={t('close')}
        className="absolute right-2 top-2 rounded-full p-1.5 text-ink-muted hover:bg-paper-sunken hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

/** The map's help button dispatches this; MapTour listens. */
const OPEN_EVENT = 'pilar2b:open-map-tour'

/** "Guia do mapa": opens the tour at any time. Sits with the map's top-right controls. */
export function MapTourButton() {
  const t = useTranslations('Map.tour')
  return (
    <button
      type="button"
      data-tour="map-tour-help"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      aria-label={t('open')}
      title={t('open')}
      className="surface-light flex min-h-11 min-w-11 items-center justify-center gap-1.5 border border-line bg-paper-raised/95 px-2 py-1 text-xs font-semibold text-ink shadow-md backdrop-blur transition-colors hover:bg-paper-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600 md:min-h-0 md:min-w-0"
    >
      <Metaninho pose="feliz" size={24} className="shrink-0" />
      <span className="hidden sm:inline">{t('open')}</span>
    </button>
  )
}

/**
 * Guided tour of the map with Metaninho, one step per control. On a visitor's
 * first map visit Metaninho offers it in a card; the "Guia do mapa" button
 * opens it at any time. Steps whose control is not on screen (the left panel
 * on a phone, a legend the current mode hides) are left out. Finishing the
 * tour or "Não mostrar novamente" stops the offer; "Agora não", the close
 * button and Escape only for this visit. The offer waits for the cookie
 * choice, so the cookie banner never covers its buttons.
 */
export default function MapTour() {
  const t = useTranslations('Map.tour')
  const [steps, setSteps] = useState<Step[]>([])
  const [run, setRun] = useState(false)
  const [offer, setOffer] = useState(false)
  const consentChosen = useSyncExternalStore(onConsentChange, () => readConsent() !== null, () => false)

  const { Tour, controls } = useJoyride({
    steps,
    run,
    continuous: true,
    tooltipComponent: TourCard,
    onEvent: ({ status }: EventData) => {
      if (status === STATUS.FINISHED) setFlag('localStorage', DONE_KEY)
      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        setFlag('sessionStorage', LATER_KEY)
        setRun(false)
      }
    },
    options: {
      skipBeacon: true,
      closeButtonAction: 'skip',
      dismissKeyAction: false,
      overlayClickAction: false,
      blockTargetInteraction: true,
      overlayColor: 'rgba(30, 62, 76, 0.45)',
      spotlightRadius: 12,
      zIndex: 10000,
    },
  })

  const start = useCallback(() => {
    setOffer(false)
    setSteps(
      STEPS.flatMap((s): Step[] => {
        const { id, pose } = s
        const target = 'anchor' in s ? visibleAnchor(s.anchor) : 'body'
        if (!target) return []
        return [{
          target,
          placement: 'placement' in s ? s.placement : 'center',
          title: t(`steps.${id}.title`),
          content: t(`steps.${id}.body`),
          data: { pose },
        }]
      }),
    )
    setRun(true)
  }, [t])

  useEffect(() => {
    if (run) controls.start(0)
  }, [run, controls])

  useEffect(() => {
    window.addEventListener(OPEN_EVENT, start)
    return () => window.removeEventListener(OPEN_EVENT, start)
  }, [start])

  // First visit: once the cookie banner is answered, wait for the panel and the
  // controls (loaded client-side), then offer.
  useEffect(() => {
    if (!consentChosen || hasFlag('localStorage', DONE_KEY) || hasFlag('sessionStorage', LATER_KEY)) return
    const timer = window.setTimeout(() => setOffer(true), 1200)
    return () => window.clearTimeout(timer)
  }, [consentChosen])

  const decline = (store: Store, key: string) => {
    setFlag(store, key)
    setOffer(false)
  }

  return (
    <>
      {offer && (
        <div
          role="dialog"
          aria-labelledby="map-tour-offer-title"
          className="surface-light absolute bottom-24 left-1/2 z-[1001] flex w-[min(92%,30rem)] -translate-x-1/2 items-end gap-3 rounded-2xl border border-line bg-paper-raised p-4 pr-10 shadow-xl md:bottom-8"
        >
          <Metaninho pose="feliz" size={72} className="-mb-1 shrink-0" />
          <div className="min-w-0">
            <p id="map-tour-offer-title" className="text-sm font-bold text-ink">{t('offer.title')}</p>
            <p className="mt-1 text-sm leading-snug text-ink-muted">{t('offer.body')}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <button type="button" onClick={start} className="btn-primary px-4 py-1.5 text-sm">
                {t('offer.start')}
              </button>
              <button type="button" onClick={() => decline('sessionStorage', LATER_KEY)} className="btn-secondary px-3 py-1.5 text-sm">
                {t('offer.later')}
              </button>
              <button
                type="button"
                onClick={() => decline('localStorage', DONE_KEY)}
                className="text-xs font-medium text-ink-muted underline underline-offset-2 hover:text-ink"
              >
                {t('never')}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => decline('sessionStorage', LATER_KEY)}
            aria-label={t('offer.close')}
            title={t('offer.close')}
            className="absolute right-2 top-2 rounded-full p-1.5 text-ink-muted hover:bg-paper-sunken hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
      {Tour}
    </>
  )
}
