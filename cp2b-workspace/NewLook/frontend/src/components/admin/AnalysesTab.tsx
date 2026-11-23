'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'
import {
  listAnalyses,
  listUsers,
  patchAnalysis,
  type AdminAnalysis,
  type AdminUser,
  type AnalysisPatch,
} from '@/lib/api/adminClient'
import GrantsList from './GrantsList'
import { LEVELS, dateToSaoPauloIso, formatDate, isoToDateInput, levelLabel } from './adminFormat'

const WHO_SEES: Record<number, string> = {
  0: 'Qualquer visitante passa a ver.',
  1: 'Qualquer pessoa registrada passa a ver.',
  2: 'Parceiros e internos passam a ver.',
}

const messageOf = (e: unknown) =>
  e instanceof Error ? e.message : 'Não foi possível concluir. Tente de novo.'

interface RowProps {
  analysis: AdminAnalysis
  open: boolean
  onToggle: () => void
  onPatch: (patch: AnalysisPatch) => Promise<void>
  error: string
  busy: boolean
}

function AnalysisRow({ analysis: a, open, onToggle, onPatch, error, busy }: RowProps) {
  const saved = isoToDateInput(a.opens_at)
  // The typed date is only valid for the saved value it was typed against, so
  // a refetch that changes the saved date drops it without an effect.
  const [edit, setEdit] = useState<{ base: string; value: string } | null>(null)
  const draft = edit && edit.base === saved ? edit.value : saved
  const setDraft = (value: string) => setEdit({ base: saved, value })
  // A change that widens who can see the analysis waits for an inline confirm;
  // one that narrows it applies at once.
  const [ask, setAsk] = useState<{ patch: AnalysisPatch; text: string } | null>(null)
  const request = (patch: AnalysisPatch, widens: boolean, text: string) => {
    if (widens) setAsk({ patch, text })
    else void onPatch(patch)
  }

  return (
    <tr className="border-b border-line align-top">
      <td className="py-2 pr-4">
        <span className="text-ink">{a.title_pt}</span>
        {error && <p role="alert" className="mt-1 text-red-700">{error}</p>}
        {ask && (
          <p className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-ink">{ask.text}</span>
            <button
              type="button"
              className="btn-primary min-h-11"
              disabled={busy}
              onClick={() => {
                const patch = ask.patch
                setAsk(null)
                void onPatch(patch)
              }}
            >
              Confirmar
            </button>
            <button type="button" className="btn-secondary min-h-11" onClick={() => setAsk(null)}>
              Cancelar
            </button>
          </p>
        )}
      </td>
      <td className="py-2 pr-4">
        <select
          aria-label={`Nível de ${a.title_pt}`}
          className="input-field min-h-11 w-auto"
          value={a.level}
          disabled={busy}
          onChange={(e) => {
            const level = Number(e.target.value)
            request(
              { level },
              level < a.level,
              `Abrir para ${levelLabel(level)}? ${WHO_SEES[level] ?? ''}`,
            )
          }}
        >
          {LEVELS.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </td>
      <td className="py-2 pr-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            aria-label={`Abertura de ${a.title_pt}`}
            className="input-field min-h-11 w-auto"
            value={draft}
            disabled={busy}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button
            type="button"
            className="btn-secondary min-h-11"
            disabled={busy || !draft || draft === saved}
            onClick={() =>
              request(
                { opens_at: dateToSaoPauloIso(draft) },
                true,
                `Abrir em ${formatDate(dateToSaoPauloIso(draft))}? Nessa data qualquer visitante passa a ver.`,
              )
            }
          >
            Salvar abertura
          </button>
          {a.opens_at && (
            <button
              type="button"
              className="btn-ghost min-h-11"
              disabled={busy}
              onClick={() => void onPatch({ opens_at: null })}
            >
              Limpar
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          {a.opens_at ? <>Abre em <span>{formatDate(a.opens_at)}</span></> : 'Sem data de abertura'}
        </p>
      </td>
      <td className="py-2 pr-4">
        <label className="flex min-h-11 items-center gap-2 text-ink">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={a.is_active}
            disabled={busy}
            onChange={(e) =>
              request({ is_active: e.target.checked }, e.target.checked, 'Ativar? Quem tem acesso passa a ver a análise.')
            }
          />
          <span>Ativa</span>
        </label>
      </td>
      <td className="py-2 pr-4 text-ink-muted">{a.municipalities}</td>
      <td className="py-2">
        <button
          type="button"
          className="btn-secondary min-h-11"
          aria-expanded={open}
          onClick={onToggle}
        >
          Liberações ({a.grants})
        </button>
      </td>
    </tr>
  )
}

export default function AnalysesTab() {
  const [analyses, setAnalyses] = useState<AdminAnalysis[] | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const refetch = useCallback(async () => {
    try {
      setAnalyses(await listAnalyses())
      setLoadError(null)
    } catch (e) {
      setLoadError(messageOf(e))
    }
  }, [])

  useEffect(() => {
    void refetch()
    // The grant search filters this list; a failure only empties the search.
    listUsers().then(setUsers, () => setUsers([]))
  }, [refetch])

  async function patch(id: string, change: AnalysisPatch) {
    setBusy(id)
    setErrors((prev) => ({ ...prev, [id]: '' }))
    try {
      await patchAnalysis(id, change)
    } catch (e) {
      setErrors((prev) => ({ ...prev, [id]: messageOf(e) }))
    } finally {
      setBusy(null)
      await refetch()
    }
  }

  if (loadError) return <p role="alert" className="text-red-700">{loadError}</p>
  if (!analyses) return <p className="text-ink-muted">Carregando…</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[60rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line-strong text-ink-muted">
            <th scope="col" className="py-2 pr-4 font-medium">Título</th>
            <th scope="col" className="py-2 pr-4 font-medium">Nível</th>
            <th scope="col" className="py-2 pr-4 font-medium">Abertura</th>
            <th scope="col" className="py-2 pr-4 font-medium">Situação</th>
            <th scope="col" className="py-2 pr-4 font-medium">Municípios com célula</th>
            <th scope="col" className="py-2 font-medium">Liberações</th>
          </tr>
        </thead>
        <tbody>
          {analyses.map((a) => (
            <Fragment key={a.id}>
              <AnalysisRow
                analysis={a}
                open={openId === a.id}
                onToggle={() => setOpenId(openId === a.id ? null : a.id)}
                onPatch={(change) => patch(a.id, change)}
                error={errors[a.id] ?? ''}
                busy={busy === a.id}
              />
              {openId === a.id && (
                <tr className="border-b border-line bg-paper-raised">
                  <td colSpan={6} className="p-4">
                    <GrantsList analysisId={a.id} users={users} onChanged={() => void refetch()} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
