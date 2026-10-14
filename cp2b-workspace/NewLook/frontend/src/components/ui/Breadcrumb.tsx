import { useTranslations } from 'next-intl'
import { Link } from '@/navigation'

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
 * The site's one breadcrumb: "Início / Plataforma / Proximidade".
 *
 * A <nav> named "Você está em" around an <ol>; the slashes are decoration and
 * hidden from screen readers, and the last crumb is the current page. It holds
 * no state, so server pages and client pages render the same component.
 */
export default function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  const t = useTranslations('wayfinding')

  return (
    <nav aria-label={t('breadcrumb')} className={`text-sm text-ink-muted ${className}`}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={`${index}-${item.label}`} className="flex items-center gap-x-2">
              {index > 0 && <span aria-hidden="true">/</span>}
              {isLast || !item.href ? (
                <span aria-current={isLast ? 'page' : undefined} className={isLast ? 'text-ink' : undefined}>
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="inline-flex min-h-[24px] items-center underline-offset-2 hover:text-ink hover:underline"
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

/** The breadcrumb as a band under the header, for the tool pages. */
export function BreadcrumbBar({ items }: { items: BreadcrumbItem[] }) {
  return (
    <div className="border-b border-line bg-paper-raised">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <Breadcrumb items={items} />
      </div>
    </div>
  )
}
