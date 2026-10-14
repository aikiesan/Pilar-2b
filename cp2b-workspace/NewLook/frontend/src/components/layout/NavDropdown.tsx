'use client'

/**
 * A header mega-menu: a button that discloses a full-width panel under the
 * bar, with a short introduction to the group on the left and its pages, each
 * with a one-line description, on the right.
 *
 * Disclosure pattern, not an ARIA menu: the panel holds ordinary links, so
 * Tab moves through them as anywhere else. The button carries aria-expanded /
 * aria-controls; ArrowDown on it opens the panel and focuses the first page;
 * Escape closes and returns focus to the button; a click outside, focus
 * leaving the menu or choosing a link close it too. The header owns the open
 * state, so opening one group closes the others.
 *
 * The panel is positioned against the header (the nearest positioned
 * ancestor), not against this component, which is why the wrapper is static.
 */
import { useEffect, useId, useRef } from 'react'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { Link } from '@/navigation'

export interface NavDropdownItem {
  href: string
  label: string
  description?: string
  icon?: React.ReactNode
  active?: boolean
}

interface NavDropdownProps {
  label: string
  intro: { lede: string; cta: string; href: string }
  items: NavDropdownItem[]
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Extra classes for the trigger (the guided tour targets them). */
  triggerClassName?: string
}

export default function NavDropdown({ label, intro, items, open, onOpenChange, triggerClassName = '' }: NavDropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const anyActive = items.some((item) => item.active)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) onOpenChange(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open, onOpenChange])

  const focusFirstPage = () =>
    requestAnimationFrame(() => containerRef.current?.querySelector<HTMLAnchorElement>('[data-nav-item]')?.focus())

  return (
    <div
      ref={containerRef}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation()
          onOpenChange(false)
          buttonRef.current?.focus()
        }
      }}
      onBlur={(e) => {
        if (open && !containerRef.current?.contains(e.relatedTarget as Node | null)) onOpenChange(false)
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onOpenChange(!open)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            onOpenChange(true)
            focusFirstPage()
          }
        }}
        className={`${triggerClassName} relative flex h-16 items-center gap-1 px-3 text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-terra-600 dark:focus-visible:ring-terra-400 ${
          anyActive || open
            ? 'text-terra-600 dark:text-terra-400'
            : 'text-ink-muted hover:text-ink'
        } ${anyActive || open ? 'after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:bg-current' : ''}`}
      >
        {label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-y border-line bg-paper-raised shadow-xl"
      >
        <div className="mx-auto grid max-w-7xl grid-cols-[17rem_1fr] gap-10 px-8 py-8">
          <div className="border-r border-line pr-10">
            <p className="eyebrow">{label}</p>
            <p className="mt-3 font-display text-xl leading-snug text-ink">{intro.lede}</p>
            <Link
              href={intro.href}
              onClick={() => onOpenChange(false)}
              className="mt-5 inline-flex min-h-[40px] items-center gap-2 text-sm font-medium text-terra-700 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600 dark:text-terra-300"
            >
              {intro.cta}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <ul className="grid grid-cols-2 content-start gap-x-6">
            {items.map((item) => (
              <li key={item.href} className="border-b border-line">
                <Link
                  href={item.href}
                  data-nav-item
                  aria-current={item.active ? 'page' : undefined}
                  onClick={() => onOpenChange(false)}
                  className={`flex items-start gap-3 border-l-2 px-3 py-3 transition-colors focus:outline-none focus-visible:bg-paper-sunken focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-terra-600 ${
                    item.active
                      ? 'border-terra-600 dark:border-terra-400 bg-paper-sunken'
                      : 'border-transparent hover:bg-paper-sunken'
                  }`}
                >
                  {item.icon && (
                    <span className={`mt-0.5 shrink-0 ${item.active ? 'text-terra-600 dark:text-terra-400' : 'text-ink-muted'}`} aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className={`block text-sm font-medium ${item.active ? 'text-terra-700 dark:text-terra-300' : 'text-ink'}`}>
                      {item.label}
                    </span>
                    {item.description && (
                      <span className="mt-0.5 block text-xs text-ink-muted">{item.description}</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
