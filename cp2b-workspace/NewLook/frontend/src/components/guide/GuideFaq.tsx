'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowRight } from 'lucide-react'
import { Link } from '@/navigation'
import { CP2B_PAGES } from '@/config/contact'

// Order of the questions; each id is a key under guide.faq.items.
const FAQ = ['what', 'coverage', 'potential', 'reuse', 'accessibility', 'report'] as const

const LINK = 'font-medium text-terra-600 dark:text-terra-400 underline underline-offset-2'

/**
 * The platform's frequently asked questions, at the end of the guide (/guide#faq).
 * They lived on the old /about page, which now sends readers to the CP2b site;
 * these are about the platform, so they stay here. Native <details>: keyboard
 * and screen-reader support for free, and the answers stay in the HTML.
 */
export default function GuideFaq() {
  const t = useTranslations('guide')
  const tNav = useTranslations('common.nav')
  const links = {
    cite: (chunks: ReactNode) => <Link href="/cite" className={LINK}>{chunks}</Link>,
    science: (chunks: ReactNode) => <Link href="/method/science-base" className={LINK}>{chunks}</Link>,
    a11y: (chunks: ReactNode) => <Link href="/accessibility" className={LINK}>{chunks}</Link>,
    contact: (chunks: ReactNode) => (
      <a href={CP2B_PAGES.contact} className={LINK}>
        {chunks}
        <span className="sr-only"> ({tNav('external_cp2b')})</span>
      </a>
    ),
  }

  return (
    <section id="faq" aria-labelledby="faq-heading" className="mt-16 scroll-mt-24">
      <h2 id="faq-heading" className="text-3xl font-bold text-ink">{t('faq.heading')}</h2>
      <div className="mt-6 divide-y divide-line rounded-2xl border border-line bg-paper-raised">
        {FAQ.map((id) => (
          <details key={id} className="group px-5 py-1">
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600 [&::-webkit-details-marker]:hidden">
              {t(`faq.items.${id}.q`)}
              <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" aria-hidden="true" />
            </summary>
            <p className="pb-4 leading-relaxed text-ink">{t.rich(`faq.items.${id}.a`, links)}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
