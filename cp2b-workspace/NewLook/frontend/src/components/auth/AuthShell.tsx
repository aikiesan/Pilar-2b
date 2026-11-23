'use client'

/**
 * The frame of the account pages that are not sign-in itself: asking for
 * access, confirming the e-mail and the two password steps. The site header
 * already carries the logo and the way home, so the frame is the title, an
 * optional line of context and one framed panel.
 */

import type { ReactNode } from 'react'

export const fieldLabel = 'mb-1.5 block text-sm font-medium text-ink'
export const fieldHint = 'mt-1.5 text-xs text-ink-muted'

export default function AuthShell({
  title,
  intro,
  children,
  wide = false,
}: {
  title: string
  intro?: ReactNode
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className="flex justify-center bg-paper px-4 py-12 sm:px-6 sm:py-16">
      <div className={`w-full ${wide ? 'max-w-xl' : 'max-w-md'}`}>
        <h1 className="text-3xl text-ink sm:text-4xl">{title}</h1>
        {intro && <div className="mt-3 text-sm leading-relaxed text-ink-muted">{intro}</div>}
        <div className="mt-6 rounded-lg border border-line bg-paper-raised p-6 sm:p-8">{children}</div>
      </div>
    </div>
  )
}

/** A short message in the panel: an alert for failures, a status otherwise. */
export function Notice({ tone, children }: { tone: 'error' | 'info'; children: ReactNode }) {
  if (tone === 'error') {
    return (
      <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
        {children}
      </p>
    )
  }
  return (
    <p role="status" className="rounded border border-line bg-paper px-3 py-2 text-sm text-ink">
      {children}
    </p>
  )
}
