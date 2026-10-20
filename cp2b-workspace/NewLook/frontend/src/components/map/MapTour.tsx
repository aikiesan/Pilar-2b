'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { HelpCircle, X } from 'lucide-react'
import { useJoyride, STATUS, type EventData, type Step, type TooltipRenderProps } from 'react-joyride'
import Metaninho, { type MetaninhoPose } from '@/components/mascot/Metaninho'

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

/**
 * Guided tour of the map with Metaninho, one step per control. It opens by
 * itself on a visitor's first map visit and from the help button at any time.
 * Steps whose control is not on screen (the left panel on a phone, a legend
 * the current mode hides) are left out. "Concluir" and "Não mostrar novamente"
 * stop it opening by itself; the close button and Escape only for this visit.
 */
export default function MapTour() {
  const t = useTranslations('Map.tour')
  const [steps, setSteps] = useState<Step[]>([])
  const [run, setRun] = useState(false)

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

  // First visit: wait for the panel and the controls (loaded client-side), then open.
  useEffect(() => {
    if (hasFlag('localStorage', DONE_KEY) || hasFlag('sessionStorage', LATER_KEY)) return
    const timer = window.setTimeout(start, 1200)
    return () => window.clearTimeout(timer)
  }, [start])

  return (
    <>
      <button
        type="button"
        data-tour="map-tour-help"
        onClick={start}
        aria-label={t('open')}
        title={t('open')}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-ink shadow-lg ring-1 ring-black/5 backdrop-blur hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600"
      >
        <HelpCircle className="h-5 w-5" aria-hidden="true" />
      </button>
      {Tour}
    </>
  )
}
