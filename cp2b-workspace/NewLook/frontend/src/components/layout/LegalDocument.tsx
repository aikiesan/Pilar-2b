'use client'

import { useTranslations } from 'next-intl'
import type { Localized } from '@/lib/localized'
import { useLocalize } from '@/hooks/useLocalize'
import { useFormat } from '@/hooks/useFormat'

export interface LegalSection {
  h: string
  p: string[]
}

/** One language's text of a legal document. */
export interface LegalText {
  title: string
  intro: string
  /** Review status, shown as a note under the date. */
  draftNote: string
  sections: LegalSection[]
}

interface LegalDocumentProps {
  /** Date of the version in force, YYYY-MM-DD. */
  version: string
  text: Localized<LegalText>
}

/**
 * Renders the privacy policy, the terms of use and the accessibility
 * statement. Each document is one reviewed unit per language, so its text
 * lives with its page as a localized record rather than scattered across the
 * message catalogs.
 */
export default function LegalDocument({ version, text }: LegalDocumentProps) {
  const t = useTranslations('legal')
  const format = useFormat()
  const doc = useLocalize()(text)

  return (
    <article className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">{doc.title}</h1>
      <p className="text-sm text-gray-500 mb-4">
        {t('updated', { date: format.date(version) })}
      </p>
      <p
        role="note"
        className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-md px-3 py-2 mb-6"
      >
        {doc.draftNote}
      </p>
      <p className="text-gray-700 mb-8 leading-relaxed">{doc.intro}</p>

      {doc.sections.map((s) => (
        <section key={s.h} className="mb-6">
          <h2 className="text-xl font-semibold mb-2">{s.h}</h2>
          {s.p.map((para, i) => (
            <p key={i} className="text-gray-700 leading-relaxed mb-2">
              {para}
            </p>
          ))}
        </section>
      ))}
    </article>
  )
}
