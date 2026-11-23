'use client'

/**
 * Access requests: approve at a level, or refuse with an optional reason.
 *
 * Three lists, one at a time: waiting for a decision (the e-mail is already
 * confirmed), waiting for the person to confirm the e-mail, and refused. A
 * refused request can still be approved later. Approving or refusing sends the
 * person an e-mail from the server.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  approveRequest,
  listRequests,
  rejectRequest,
  type AccessRequest,
  type RequestStatus,
} from '@/lib/api/adminClient'
import { LEVELS, formatDate } from './adminFormat'

const messageOf = (e: unknown) =>
  e instanceof Error ? e.message : 'Não foi possível concluir. Tente de novo.'

const VIEWS: { status: RequestStatus; label: string; empty: string }[] = [
  { status: 'pending_review', label: 'Para decidir', empty: 'Nenhum pedido esperando decisão.' },
  {
    status: 'pending_email',
    label: 'E-mail não confirmado',
    empty: 'Ninguém esperando confirmar o e-mail.',
  },
  { status: 'rejected', label: 'Recusados', empty: 'Nenhum pedido recusado.' },
]

// Approving gives at least level 1: level 0 is what a visitor without an account sees.
const APPROVE_LEVELS = LEVELS.filter((l) => l.value >= 1)

export default function RequestsTab({ onPendingCount }: { onPendingCount?: (n: number) => void }) {
  const [view, setView] = useState<RequestStatus>('pending_review')
  const [rows, setRows] = useState<AccessRequest[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [levels, setLevels] = useState<Record<string, number>>({})
  const [refusing, setRefusing] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [done, setDone] = useState<string | null>(null)

  const refetch = useCallback(async (status: RequestStatus) => {
    try {
      const list = await listRequests(status)
      setRows(list)
      setLoadError(null)
      if (status === 'pending_review') onPendingCount?.(list.length)
    } catch (e) {
      setLoadError(messageOf(e))
    }
  }, [onPendingCount])

  useEffect(() => {
    setRows(null)
    void refetch(view)
  }, [view, refetch])

  async function decide(r: AccessRequest, action: 'approve' | 'reject') {
    setBusy(r.id)
    setErrors((prev) => ({ ...prev, [r.id]: '' }))
    try {
      if (action === 'approve') {
        const level = levels[r.id] ?? 1
        await approveRequest(r.id, level)
        setDone(`${r.full_name} aprovado(a) com nível ${level}. O e-mail com o link de entrada foi enviado.`)
      } else {
        await rejectRequest(r.id, note.trim() || null)
        setDone(`Pedido de ${r.full_name} recusado. A pessoa recebe um e-mail.`)
      }
      setRefusing(null)
      setNote('')
      await refetch(view)
      // The count in the tab follows the pending list even from another view.
      if (view !== 'pending_review') {
        listRequests('pending_review').then((l) => onPendingCount?.(l.length), () => {})
      }
    } catch (e) {
      setErrors((prev) => ({ ...prev, [r.id]: messageOf(e) }))
    } finally {
      setBusy(null)
    }
  }

  const current = VIEWS.find((v) => v.status === view)!
  const viewClass = (active: boolean) =>
    `min-h-11 rounded-md border px-3 text-sm ${
      active ? 'border-line-strong bg-white text-ink' : 'border-transparent text-ink-muted hover:text-ink'
    }`

  return (
    <div>
      <div role="group" aria-label="Pedidos" className="flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <button
            key={v.status}
            type="button"
            aria-pressed={view === v.status}
            className={viewClass(view === v.status)}
            onClick={() => {
              setDone(null)
              setRefusing(null)
              setView(v.status)
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      <p role="status" className="mt-4 min-h-6 text-sm text-ink">
        {done}
      </p>

      {loadError && <p role="alert" className="mt-2 text-red-700">{loadError}</p>}
      {!loadError && !rows && <p className="mt-2 text-ink-muted">Carregando…</p>}
      {rows && rows.length === 0 && <p className="mt-2 text-ink-muted">{current.empty}</p>}

      {rows && rows.length > 0 && (
        <ul className="mt-2 divide-y divide-line border-y border-line">
          {rows.map((r) => (
            <li key={r.id} className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0">
                <p className="font-medium text-ink">{r.full_name}</p>
                <p className="text-sm text-ink">{r.institution || 'Instituição não informada'}</p>
                <p className="break-all text-sm text-ink-muted">{r.email}</p>
                <p className="mt-2 max-w-prose whitespace-pre-line text-sm text-ink">
                  {r.purpose || 'Finalidade não informada.'}
                </p>
                <p className="mt-2 text-xs text-ink-muted">
                  Pedido em {formatDate(r.created_at)}.
                  {r.email_verified_at && ` E-mail confirmado em ${formatDate(r.email_verified_at)}.`}
                  {r.status === 'rejected' && ` Recusado em ${formatDate(r.reviewed_at)}.`}
                </p>
                {r.status === 'rejected' && r.review_note && (
                  <p className="mt-1 text-sm text-ink-muted">Motivo: {r.review_note}</p>
                )}
              </div>

              <div className="space-y-2">
                {refusing === r.id ? (
                  <>
                    <label htmlFor={`note-${r.id}`} className="block text-sm text-ink">
                      Motivo (opcional, vai no e-mail)
                    </label>
                    <textarea
                      id={`note-${r.id}`}
                      className="input-field min-h-20 w-full"
                      maxLength={500}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-primary min-h-11"
                        disabled={busy === r.id}
                        onClick={() => decide(r, 'reject')}
                      >
                        Confirmar recusa
                      </button>
                      <button
                        type="button"
                        className="btn-secondary min-h-11"
                        onClick={() => {
                          setRefusing(null)
                          setNote('')
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="text-sm text-ink">
                        <span className="block">Nível</span>
                        <select
                          aria-label={`Nível de ${r.full_name}`}
                          className="input-field min-h-11 w-auto min-w-40 pr-9"
                          value={levels[r.id] ?? 1}
                          disabled={busy === r.id}
                          onChange={(e) =>
                            setLevels((prev) => ({ ...prev, [r.id]: Number(e.target.value) }))
                          }
                        >
                          {APPROVE_LEVELS.map((l) => (
                            <option key={l.value} value={l.value}>{l.label}</option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        className="btn-primary min-h-11"
                        disabled={busy === r.id}
                        onClick={() => decide(r, 'approve')}
                      >
                        Aprovar
                      </button>
                      {r.status !== 'rejected' && (
                        <button
                          type="button"
                          className="btn-secondary min-h-11"
                          disabled={busy === r.id}
                          onClick={() => {
                            setNote('')
                            setRefusing(r.id)
                          }}
                        >
                          Recusar
                        </button>
                      )}
                    </div>
                    {r.status === 'pending_email' && (
                      <p className="text-xs text-ink-muted">
                        A pessoa ainda não confirmou o e-mail. Aprovar libera a conta mesmo assim.
                      </p>
                    )}
                  </>
                )}
                {errors[r.id] && <p role="alert" className="text-sm text-red-700">{errors[r.id]}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
