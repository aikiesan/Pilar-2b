'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import Metaninho, { type MetaninhoPose } from './Metaninho'

/**
 * The Metaninho who answers a click, as on the CP2b site: each click makes him
 * hop and say a line in a speech bubble; the lines take turns and the bubble
 * closes by itself after a few seconds, or with Escape.
 *
 * He is a named button, and the bubble is a role="status" region that a screen
 * reader announces when a line appears. The bubble is always in the DOM (empty
 * when closed) so the announcement works on the first click. With reduced
 * motion there is no hop and the bubble appears without animation.
 *
 * The bubble is a clean CP2b card (white, rounded, Azul Petróleo text), not
 * the CP2b site's handwritten paper slip.
 */

type LineSet = 'tips' | 'not_found'

// How long the bubble stays open after the last click.
const BUBBLE_MS = 7000

export default function MetaninhoAmigo({
  pose = 'feliz',
  size = 120,
  lines = 'tips',
  bubble = 'left',
  onDark = false,
  className = '',
}: {
  pose?: MetaninhoPose
  size?: number
  lines?: LineSet
  bubble?: 'left' | 'right'
  onDark?: boolean
  className?: string
}) {
  const t = useTranslations('mascot')
  const list = t.raw(`lines.${lines}`) as string[]
  const [clicks, setClicks] = useState(0)
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const speak = () => {
    setClicks((n) => n + 1)
    setOpen(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setOpen(false), BUBBLE_MS)
  }

  const close = () => {
    clearTimeout(timer.current)
    setOpen(false)
  }

  const line = open && clicks > 0 ? list[(clicks - 1) % list.length] : ''
  const side =
    bubble === 'left'
      ? 'right-[70%] bottom-[85%] origin-bottom-right'
      : 'left-[88%] top-[20%] origin-left'

  return (
    <span
      className={`relative inline-block ${className}`}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) close()
      }}
    >
      <button
        type="button"
        aria-label={t('label')}
        onClick={speak}
        className={`block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-4 ${
          onDark
            ? 'focus-visible:ring-cp2b-lima focus-visible:ring-offset-cp2b-petroleo'
            : 'focus-visible:ring-terra-600 focus-visible:ring-offset-paper'
        }`}
      >
        {/* A new key remounts the figure, so the hop plays again. */}
        <Metaninho key={clicks} pose={pose} size={size} className={clicks > 0 ? 'motion-safe:animate-metaninho-hop' : ''} />
      </button>
      <span
        role="status"
        data-open={line ? 'true' : undefined}
        className={`pointer-events-none absolute z-30 w-max max-w-[min(16rem,70vw)] rounded-2xl border border-line bg-paper-raised px-4 py-2.5 text-left text-sm leading-snug text-ink shadow-lg ${side} invisible scale-95 opacity-0 transition duration-200 ease-out motion-reduce:transition-none data-[open=true]:visible data-[open=true]:scale-100 data-[open=true]:opacity-100`}
      >
        {line}
      </span>
    </span>
  )
}
