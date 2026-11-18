/**
 * Citations of the knowledge base's papers, as plain text for the clipboard.
 * Bibliographic fields are copied as published; only the placeholders for a
 * missing author, date or title follow the page's language.
 */

import type { LiteratureReference } from '@/types/scientific'

export interface CitationPlaceholders {
  /** For a paper without authors. */
  noAuthor: string
  /** For a paper without a year: "n.d." / "s.d.". */
  noDate: string
  untitled: string
}

/** "Authors (2021). Title. Journal. https://doi.org/…", in APA order. */
export function toApa(ref: LiteratureReference, placeholders: CitationPlaceholders): string {
  const parts = [
    `${ref.authors || placeholders.noAuthor} (${ref.year ?? placeholders.noDate}).`,
    `${ref.title || placeholders.untitled}.`,
    ref.journal ? `${ref.journal}.` : '',
    ref.doi ? `https://doi.org/${ref.doi}` : '',
  ]
  return parts.filter(Boolean).join(' ')
}

/** A BibTeX @article entry, keyed by the first author's surname and the year. */
export function toBibtex(ref: LiteratureReference): string {
  const surname = (ref.authors || 'unknown').split(/[,;]/)[0].trim().split(/\s+/)[0]
  const key = `${surname.normalize('NFD').replace(/[^A-Za-z0-9]/g, '').toLowerCase() || 'unknown'}${ref.year ?? ''}`
  const lines = [
    `@article{${key},`,
    `  author  = {${ref.authors ?? ''}},`,
    `  title   = {${ref.title}},`,
    `  year    = {${ref.year ?? ''}},`,
  ]
  if (ref.journal) lines.push(`  journal = {${ref.journal}},`)
  if (ref.doi) lines.push(`  doi     = {${ref.doi}},`)
  lines.push('}')
  return lines.join('\n')
}
