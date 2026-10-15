import type { ComponentProps, ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { ExternalLink } from 'lucide-react'
import { Link } from '@/navigation'
import { isExternalHref } from '@/config/contact'

type Props = Omit<ComponentProps<'a'>, 'href'> & {
  href: string
  children: ReactNode
  /** Draw the ↗ after the text of an external link (off where an icon is already there). */
  externalIcon?: boolean
}

/**
 * A menu or footer link to a page of this site, or to the CP2b site.
 *
 * A page of this site goes through the locale-aware Link (/pilar2b/pt-BR/…).
 * An absolute address is a plain <a> in the same tab (cp2b.unicamp.br is the
 * same domain), marked with ↗ and, for screen readers, "CP2b site" after the
 * visible text, so the accessible name still starts with what is on screen.
 */
export default function NavLink({ href, children, externalIcon = true, ...rest }: Props) {
  const t = useTranslations('common.nav')
  if (!isExternalHref(href)) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} {...rest}>
      {children}
      {externalIcon && <ExternalLink className="ml-1 inline h-3 w-3 shrink-0 align-baseline opacity-70" aria-hidden="true" />}
      <span className="sr-only"> ({t('external_cp2b')})</span>
    </a>
  )
}
