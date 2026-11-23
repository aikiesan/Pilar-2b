'use client'

import { useCallback, useEffect, useState } from 'react'
import { listUsers, setClearance, type AdminUser } from '@/lib/api/adminClient'
import { LEVELS, formatDate, levelLabel } from './adminFormat'

const messageOf = (e: unknown) =>
  e instanceof Error ? e.message : 'Não foi possível concluir. Tente de novo.'

export default function PeopleTab({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pending, setPending] = useState<{ id: string; level: number } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const refetch = useCallback(async () => {
    try {
      setUsers(await listUsers())
      setLoadError(null)
    } catch (e) {
      setLoadError(messageOf(e))
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  async function confirmChange(id: string, level: number) {
    setBusy(id)
    setErrors((prev) => ({ ...prev, [id]: '' }))
    try {
      await setClearance(id, level)
      setPending(null)
      await refetch()
    } catch (e) {
      setErrors((prev) => ({ ...prev, [id]: messageOf(e) }))
      setPending(null)
    } finally {
      setBusy(null)
    }
  }

  if (loadError) return <p role="alert" className="text-red-700">{loadError}</p>
  if (!users) return <p className="text-ink-muted">Carregando…</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line-strong text-ink-muted">
            <th scope="col" className="py-2 pr-4 font-medium">Nome</th>
            <th scope="col" className="py-2 pr-4 font-medium">E-mail</th>
            <th scope="col" className="py-2 pr-4 font-medium">Papel</th>
            <th scope="col" className="py-2 pr-4 font-medium">Nível</th>
            <th scope="col" className="py-2 pr-4 font-medium">Ativa</th>
            <th scope="col" className="py-2 font-medium">Último acesso</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const own = u.id === currentUserId
            const asking = pending?.id === u.id ? pending : null
            return (
              <tr key={u.id} className="border-b border-line align-top">
                <td className="py-2 pr-4 text-ink">{u.full_name}</td>
                <td className="py-2 pr-4 text-ink-muted">{u.email}</td>
                <td className="py-2 pr-4 text-ink-muted">{u.role}</td>
                <td className="py-2 pr-4">
                  <select
                    aria-label={`Nível de ${u.full_name}`}
                    className="input-field min-h-11 w-auto"
                    value={u.clearance}
                    disabled={own || busy === u.id}
                    onChange={(e) => {
                      setErrors((prev) => ({ ...prev, [u.id]: '' }))
                      const level = Number(e.target.value)
                      setPending(level === u.clearance ? null : { id: u.id, level })
                    }}
                  >
                    {LEVELS.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                  {own && (
                    <p className="mt-1 text-xs text-ink-muted">Você não pode mudar o próprio nível.</p>
                  )}
                  {asking && (
                    <p className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-ink">Mudar para {levelLabel(asking.level)}?</span>
                      <button
                        type="button"
                        className="btn-primary min-h-11"
                        disabled={busy === u.id}
                        onClick={() => confirmChange(u.id, asking.level)}
                      >
                        Confirmar
                      </button>
                      <button type="button" className="btn-secondary min-h-11" onClick={() => setPending(null)}>
                        Cancelar
                      </button>
                    </p>
                  )}
                  {errors[u.id] && (
                    <p role="alert" className="mt-1 text-red-700">{errors[u.id]}</p>
                  )}
                </td>
                <td className="py-2 pr-4 text-ink-muted">{u.is_active ? 'Sim' : 'Não'}</td>
                <td className="py-2 text-ink-muted">{formatDate(u.last_login_at)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
