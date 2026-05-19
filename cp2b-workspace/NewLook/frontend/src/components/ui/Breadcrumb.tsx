'use client'

import { Link } from '@/navigation'
import { ChevronRight, Home } from 'lucide-react'

export interface BreadcrumbItem {
  /** Visible label */
  label: string
  /** href makes this a link; omit for the current (last) crumb */
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

/**
 * Accessible breadcrumb navigation.
 * WCAG: <nav aria-label="Breadcrumb"> wrapping an <ol>; current page has aria-current="page".
 */
export default function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center py-3 px-4 sm:px-6 lg:px-8 ${className}`}>
      <ol className="flex items-center flex-wrap gap-1 text-sm text-gray-500 dark:text-gray-400">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0" aria-hidden="true" />
              )}
              {isLast || !item.href ? (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={isLast
                    ? 'text-gray-900 dark:text-white font-medium'
                    : 'text-gray-500 dark:text-gray-400'
                  }
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-cp2b-green dark:hover:text-emerald-400 transition-colors focus:outline-none focus:ring-2 focus:ring-cp2b-lime rounded"
                >
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
