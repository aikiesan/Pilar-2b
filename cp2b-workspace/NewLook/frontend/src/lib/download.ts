/**
 * Files the visitor downloads: CSV tables, GeoJSON, map images.
 *
 * Every download goes through `downloadBlob`, which is where the beta export
 * switch is enforced, so no caller — including one added later — can hand out
 * a copy of the dataset while exports are off (see lib/featureFlags).
 */

import { DATA_EXPORT_DISABLED_REASON, DATA_EXPORT_ENABLED } from '@/lib/featureFlags'

export type CsvValue = string | number | null | undefined

/** One CSV field, quoted when it holds a comma, a quote or a line break. */
export function csvField(value: CsvValue): string {
  const text = value == null ? '' : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/**
 * Rows as CSV text. Write numbers with a dot decimal separator (`toFixed`),
 * as data files should be, whatever the page language.
 */
export function toCsv(rows: CsvValue[][]): string {
  return rows.map((row) => row.map(csvField).join(',')).join('\n')
}

/** `stem-2026-09-24.ext`: today's date keeps repeated exports apart. */
export function datedFilename(stem: string, extension: string): string {
  return `${stem}-${new Date().toISOString().slice(0, 10)}.${extension}`
}

/** Saves `blob` as `filename` — unless data exports are switched off. */
export function downloadBlob(blob: Blob, filename: string): void {
  if (!DATA_EXPORT_ENABLED) {
    console.warn(DATA_EXPORT_DISABLED_REASON)
    return
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Saves CSV text. The byte-order mark makes Excel read it as UTF-8, accents intact. */
export function downloadCsv(content: string, filename: string): void {
  downloadBlob(new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' }), filename)
}
