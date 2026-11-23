'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { deleteGrant, listGrants, putGrant, type AdminGrant, type AdminUser } from '@/lib/api/adminClient'
import { expiryToSaoPauloIso, formatDate, formatExpiry, isExpired } from './adminFormat'

const NOTE_MAX = 200

const messageOf = (e: unknown) =>
  e instanceof Error ? e.message : 'Não foi possível concluir. Tente de novo.'

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

interface Props {
  analysisId: string
  /** People already loaded by the tab; the search filters this list. */
  users: AdminUser[]
  /** Called after a write so the analysis row can refresh its grant count. */
  onChanged: () => void
}

export default function GrantsList({ analysisId, users, onChanged }: Props) {
  const [grants, setGrants] = useState<AdminGrant[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [chosen, setChosen] = useState<AdminUser | null>(null)
  const [expires, setExpires] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      setGrants(await listGrants(analysisId))
    } catch (e) {
      setError(messageOf(e))
    }
  }, [analysisId])

  useEffect(() => {
    let cancelled = false
    listGrants(analysisId).then(
      (rows) => {
        if (!cancelled) setGrants(rows)
      },
      (e) => {
        if (!cancelled) setError(messageOf(e))
      },
    )
    return () => {
      cancelled = true
    }
  }, [analysisId])

  const matches = useMemo(() => {
    const q = norm(query.trim())
    if (!q) return []
    return users
      .filter((u) => norm(u.full_name).includes(q) || norm(u.email).includes(q))
      .slice(0, 8)
  }, [query, users])

  async function grant() {
    if (!chosen) return
    setSaving(true)
    setError(null)
    try {
      await putGrant(analysisId, chosen.id, {
        expires_at: expires ? expiryToSaoPauloIso(expires) : null,
        note: note.trim() ? note.trim() : null,
      })
      setChosen(null)
      setQuery('')
      setExpires('')
      setNote('')
      await refetch()
      onChanged()
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setSaving(false)
    }
  }

  async function revoke(userId: string) {
    setError(null)
    try {
      await deleteGrant(analysisId, userId)
      setRevoking(null)
      await refetch()
      onChanged()
    } catch (e) {
      setError(messageOf(e))
      setRevoking(null)
    }
  }

  return (
    <section aria-label="Liberações" className="space-y-6">
      <div className="max-w-xl space-y-3">
        <h3 className="font-medium text-ink">Liberar para uma pessoa</h3>
        {chosen ? (
          <p className="flex flex-wrap items-center gap-2 text-ink">
            <span>{chosen.full_name} · {chosen.email}</span>
            <button type="button" className="btn-secondary min-h-11" onClick={() => setChosen(null)}>
              Trocar
            </button>
          </p>
        ) : (
          <div>
            <label className="block text-sm text-ink-muted" htmlFor={`busca-${analysisId}`}>
              Buscar pessoa
            </label>
            <input
              id={`busca-${analysisId}`}
              className="input-field min-h-11"
              placeholder="Nome ou e-mail"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query.trim() !== '' && (
              <ul className="mt-1 divide-y divide-line border border-line">
                {matches.length === 0 && <li className="px-3 py-2 text-ink-muted">Ninguém encontrado.</li>}
                {matches.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      className="min-h-11 w-full px-3 py-2 text-left text-ink hover:bg-paper-raised"
                      onClick={() => setChosen(u)}
                    >
                      {u.full_name} · {u.email}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div>
          <label className="block text-sm text-ink-muted" htmlFor={`venc-${analysisId}`}>
            Vencimento
          </label>
          <input
            id={`venc-${analysisId}`}
            type="date"
            className="input-field min-h-11 w-auto"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
          />
          <p className="mt-1 text-xs text-ink-muted">Opcional. Sem data, a liberação não vence.</p>
        </div>
        <div>
          <label className="block text-sm text-ink-muted" htmlFor={`nota-${analysisId}`}>
            Nota
          </label>
          <input
            id={`nota-${analysisId}`}
            className="input-field min-h-11"
            maxLength={NOTE_MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <p className="mt-1 text-xs text-ink-muted">{note.length}/{NOTE_MAX}</p>
        </div>
        <button type="button" className="btn-primary min-h-11" disabled={!chosen || saving} onClick={grant}>
          Liberar
        </button>
      </div>

      {error && <p role="alert" className="text-red-700">{error}</p>}

      {grants && grants.length === 0 && <p className="text-ink-muted">Nenhuma liberação individual.</p>}
      {grants && grants.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line-strong text-ink-muted">
                <th scope="col" className="py-2 pr-4 font-medium">Nome</th>
                <th scope="col" className="py-2 pr-4 font-medium">E-mail</th>
                <th scope="col" className="py-2 pr-4 font-medium">Liberado por</th>
                <th scope="col" className="py-2 pr-4 font-medium">Liberado em</th>
                <th scope="col" className="py-2 pr-4 font-medium">Vencimento</th>
                <th scope="col" className="py-2 pr-4 font-medium">Nota</th>
                <th scope="col" className="py-2 font-medium"><span className="sr-only">Ação</span></th>
              </tr>
            </thead>
            <tbody>
              {grants.map((g) => (
                <tr key={g.user_id} className="border-b border-line align-top">
                  <td className="py-2 pr-4 text-ink">{g.full_name}</td>
                  <td className="py-2 pr-4 text-ink-muted">{g.email}</td>
                  <td className="py-2 pr-4 text-ink-muted">{g.granted_by_name ?? '—'}</td>
                  <td className="py-2 pr-4 text-ink-muted">{formatDate(g.granted_at)}</td>
                  <td className="py-2 pr-4 text-ink-muted">
                    {g.expires_at ? formatExpiry(g.expires_at) : 'Sem vencimento'}
                    {g.expires_at && isExpired(g.expires_at) && (
                      <span className="ml-2 border border-line px-1.5 py-0.5 text-xs">vencida</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-ink-muted">{g.note ?? ''}</td>
                  <td className="py-2">
                    {revoking === g.user_id ? (
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-ink">Tirar a liberação?</span>
                        <button type="button" className="btn-primary min-h-11" onClick={() => revoke(g.user_id)}>
                          Confirmar
                        </button>
                        <button type="button" className="btn-secondary min-h-11" onClick={() => setRevoking(null)}>
                          Cancelar
                        </button>
                      </span>
                    ) : (
                      <button type="button" className="btn-secondary min-h-11" onClick={() => setRevoking(g.user_id)}>
                        Tirar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
