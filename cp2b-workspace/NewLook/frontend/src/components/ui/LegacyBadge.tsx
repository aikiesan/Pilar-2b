/**
 * "estimativa anterior (legado)": marks a figure computed with the platform's
 * previous availability factors, which the older tools keep showing until the
 * new estimate is published. The label is visible text, not a tooltip, so it
 * reaches every reader.
 */
import { useTranslations } from 'next-intl'

interface LegacyBadgeProps {
  /** 'inverse' sits on a dark or coloured band. */
  variant?: 'default' | 'inverse'
  className?: string
}

export default function LegacyBadge({ variant = 'default', className = '' }: LegacyBadgeProps) {
  const t = useTranslations('common.legacy')
  const tone =
    variant === 'inverse'
      ? 'border-white/60 text-white'
      : 'border-line-strong bg-paper-sunken text-ink'
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 text-xs font-medium tracking-normal normal-case ${tone} ${className}`}>
      {t('label')}
    </span>
  )
}
