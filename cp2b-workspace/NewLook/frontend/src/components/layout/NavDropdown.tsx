'use client'

/**
 * A header dropdown: a button that discloses a panel of links, each with a
 * one-line description (the first step towards the redesign's mega-menus).
 *
 * Disclosure pattern, not an ARIA menu: the panel holds ordinary links, so
 * Tab moves through them as anywhere else. The button carries aria-expanded /
 * aria-controls; ArrowDown on it opens the panel and focuses the first link;
 * Escape closes and returns focus to the button; a click outside, focus
 * leaving the dropdown, choosing a link or a route change close it too.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Link, usePathname } from '@/navigation'

export interface NavDropdownItem {
  href: string
  label: string
  description?: string
  icon?: React.ReactNode
  active?: boolean
}

interface NavDropdownProps {
  label: string
  items: NavDropdownItem[]
  /** Extra classes for the trigger (the guided tour targets them). */
  triggerClassName?: string
}

export default function NavDropdown({ label, items, triggerClassName = '' }: NavDropdownProps) {
  // Open "on" the route it was opened on: navigating anywhere (a link chosen,
  // back/forward) closes it without an effect.
  const pathname = usePathname()
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname
  const setOpen = (next: boolean | ((current: boolean) => boolean)) =>
    setOpenOn((current) => {
      const value = typeof next === 'function' ? next(current === pathname) : next
      return value ? pathname : null
    })
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const anyActive = items.some((item) => item.active)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpenOn(null)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const focusFirstLink = () =>
    requestAnimationFrame(() => containerRef.current?.querySelector<HTMLAnchorElement>('[data-nav-item]')?.focus())

  return (
    <div
      ref={containerRef}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation()
          setOpen(false)
          buttonRef.current?.focus()
        }
      }}
      onBlur={(e) => {
        if (open && !containerRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            focusFirstLink()
          }
        }}
        className={`${triggerClassName} relative flex items-center gap-1 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600 dark:focus-visible:ring-terra-400 ${
          anyActive || open
            ? 'text-terra-600 dark:text-terra-400'
            : 'text-ink-muted hover:text-ink'
        } ${anyActive ? 'after:absolute after:bottom-1 after:left-3 after:right-3 after:h-px after:bg-current' : ''}`}
      >
        {label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="absolute left-0 top-full z-50 mt-2 w-80 border border-line bg-paper-raised shadow-xl"
      >
        <ul className="divide-y divide-line py-1">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                data-nav-item
                aria-current={item.active ? 'page' : undefined}
                onClick={() => setOpen(false)}
                className={`flex items-start gap-3 border-l-2 px-4 py-3 transition-colors focus:outline-none focus-visible:bg-paper-sunken ${
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
  )
}
