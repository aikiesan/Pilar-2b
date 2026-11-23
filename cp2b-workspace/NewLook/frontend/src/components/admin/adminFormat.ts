/** Shared labels and date helpers of the admin panel (Portuguese only). */

export const LEVELS = [
  { value: 0, label: '0 Público' },
  { value: 1, label: '1 Registrado' },
  { value: 2, label: '2 Parceiro' },
  { value: 3, label: '3 Interno' },
] as const

export const levelLabel = (level: number) =>
  LEVELS.find((l) => l.value === level)?.label ?? String(level)

const ZONE = 'America/Sao_Paulo'

/** "2027-03-01" -> midnight in São Paulo as an aware ISO (Brazil has no DST). */
export const dateToSaoPauloIso = (date: string) => `${date}T00:00:00-03:00`

/**
 * Last valid day -> the instant the grant ends: midnight starting the next
 * day in São Paulo. "Vencimento 10/03" then means valid through 10/03.
 */
export function expiryToSaoPauloIso(lastDay: string): string {
  const [y, m, d] = lastDay.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
  return dateToSaoPauloIso(next)
}

/** The last valid day of an expiry instant, "dd/mm/aaaa"; "—" when absent. */
export function formatExpiry(iso: string | null | undefined): string {
  if (!iso) return '—'
  return formatDate(new Date(new Date(iso).getTime() - 1).toISOString())
}

/** True once an expiry instant has passed. */
export const isExpired = (iso: string) => new Date(iso).getTime() <= Date.now()

/** Aware ISO -> "dd/mm/aaaa" in São Paulo; "—" when absent. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: ZONE })
}

/** Aware ISO -> "aaaa-mm-dd" for a date input, in São Paulo; "" when absent. */
export function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: ZONE })
}
