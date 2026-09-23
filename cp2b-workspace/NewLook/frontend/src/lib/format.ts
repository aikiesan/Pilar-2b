/**
 * Locale-aware formatting — the one place the platform turns numbers and dates
 * into text.
 *
 * Before this module, ~25 components each carried a private `formatNumber`,
 * and they disagreed: some hardcoded `toLocaleString('pt-BR')`, so the English
 * site printed "1.234.567"; others used `toFixed` plus an "M" suffix, so the
 * Portuguese site printed "1.2M" instead of "1,2 mi". Every formatter here takes
 * the locale explicitly and delegates to `Intl`, which knows both conventions.
 *
 * Components use the `useFormat()` hook, which binds the current locale. Code
 * outside React (Leaflet popups built as HTML, chart callbacks) calls
 * `createFormatters(locale)` or the functions below directly.
 *
 * Units are deliberately not handled here: "t/year" is copy, and copy lives in
 * the message catalogs. Format the number, then join the translated unit.
 */

import type { Locale } from '@/config/i18n'

/**
 * Rendered wherever a value is missing. Language-neutral on purpose: "N/A" and
 * "Sem dados" would each need translating, a dash reads the same in both.
 */
export const MISSING_VALUE = '—'

export type Numeric = number | null | undefined

export interface DecimalOptions {
  /** Maximum fraction digits. */
  decimals?: number
  /** Minimum fraction digits; set equal to `decimals` for fixed-width output. */
  minDecimals?: number
}

export interface CurrencyOptions extends DecimalOptions {
  /** ISO 4217 code. Every monetary value on the platform is in reais. */
  currency?: string
}

/** True for real, finite numbers — rejects null, undefined, NaN and ±Infinity. */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

// Constructing an Intl.NumberFormat is the expensive part, and the map formats
// thousands of values per render, so instances are reused per locale+options.
const numberFormats = new Map<string, Intl.NumberFormat>()

function numberFormat(locale: Locale, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`
  let format = numberFormats.get(key)
  if (!format) {
    format = new Intl.NumberFormat(locale, options)
    numberFormats.set(key, format)
  }
  return format
}

function fractionDigits(
  { decimals, minDecimals }: DecimalOptions,
  defaultDecimals: number
): Pick<Intl.NumberFormatOptions, 'minimumFractionDigits' | 'maximumFractionDigits'> {
  const maximumFractionDigits = decimals ?? defaultDecimals
  return {
    maximumFractionDigits,
    minimumFractionDigits: Math.min(minDecimals ?? 0, maximumFractionDigits),
  }
}

/** Grouped decimal: 1234567.8 -> "1,234,568" (en) / "1.234.568" (pt-BR). */
export function formatNumber(value: Numeric, locale: Locale, options: DecimalOptions = {}): string {
  if (!isFiniteNumber(value)) return MISSING_VALUE
  return numberFormat(locale, fractionDigits(options, 0)).format(value)
}

/**
 * Short form for large magnitudes: 1234567 -> "1.2M" (en) / "1,2 mi" (pt-BR).
 *
 * Without `decimals`, Intl's own compact rounding applies — two significant
 * digits below the next unit ("1.2K", "12K", "123K"), which is what legends and
 * tooltips want. Pass `decimals` for a fixed precision instead.
 */
export function formatCompact(value: Numeric, locale: Locale, options: DecimalOptions = {}): string {
  if (!isFiniteNumber(value)) return MISSING_VALUE
  const digits = options.decimals === undefined ? {} : fractionDigits(options, options.decimals)
  return numberFormat(locale, { notation: 'compact', ...digits }).format(value)
}

/**
 * A value already in percentage points: 45.23 -> "45.2%" (en) / "45,2%" (pt-BR).
 * Pass a 0–1 ratio multiplied by 100.
 */
export function formatPercent(value: Numeric, locale: Locale, options: DecimalOptions = {}): string {
  if (!isFiniteNumber(value)) return MISSING_VALUE
  return numberFormat(locale, { style: 'percent', ...fractionDigits(options, 1) }).format(value / 100)
}

/** Money, in reais by default: 1234567 -> "R$1,234,567" (en) / "R$ 1.234.567" (pt-BR). */
export function formatCurrency(value: Numeric, locale: Locale, options: CurrencyOptions = {}): string {
  if (!isFiniteNumber(value)) return MISSING_VALUE
  const { currency = 'BRL', ...digits } = options
  return numberFormat(locale, { style: 'currency', currency, ...fractionDigits(digits, 0) }).format(value)
}

/**
 * A calendar date, long form by default: "September 23, 2026" (en) /
 * "23 de setembro de 2026" (pt-BR). Unparseable input renders as missing.
 */
export function formatDate(
  value: Date | string | number | null | undefined,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'long' }
): string {
  if (value === null || value === undefined || value === '') return MISSING_VALUE
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return MISSING_VALUE
  return new Intl.DateTimeFormat(locale, options).format(date)
}

/** The formatters above with the locale bound — what `useFormat()` returns. */
export interface Formatters {
  locale: Locale
  number: (value: Numeric, options?: DecimalOptions) => string
  compact: (value: Numeric, options?: DecimalOptions) => string
  percent: (value: Numeric, options?: DecimalOptions) => string
  currency: (value: Numeric, options?: CurrencyOptions) => string
  date: (value: Date | string | number | null | undefined, options?: Intl.DateTimeFormatOptions) => string
}

export function createFormatters(locale: Locale): Formatters {
  return {
    locale,
    number: (value, options) => formatNumber(value, locale, options),
    compact: (value, options) => formatCompact(value, locale, options),
    percent: (value, options) => formatPercent(value, locale, options),
    currency: (value, options) => formatCurrency(value, locale, options),
    date: (value, options) => formatDate(value, locale, options),
  }
}
