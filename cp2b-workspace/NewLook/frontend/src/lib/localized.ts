/**
 * Localized values that live next to the data they describe.
 *
 * UI copy belongs in messages/*.json. Record-level content does not: a
 * residue's name and the justification for each of its four FDE factors are
 * facts about that residue, and splitting them across a data file and two
 * catalogs means every edit touches three files and one of them gets missed.
 * Such fields are written as `{ 'pt-BR': '…', en: '…' }` instead, and read with
 * `localize()` (or the `useLocalize()` hook in components).
 *
 * Because the type requires every locale, a record missing its English text
 * fails the typecheck rather than rendering Portuguese on the English site.
 *
 * Not for bibliographic metadata: a paper's title, authors and journal are
 * cited in the language they were published in and are never translated.
 */

import { defaultLocale, type Locale } from '@/config/i18n'

export type Localized<T = string> = Record<Locale, T>

/** The value for `locale`, falling back to the default locale's. */
export function localize<T>(value: Localized<T>, locale: Locale): T {
  return value[locale] ?? value[defaultLocale]
}
