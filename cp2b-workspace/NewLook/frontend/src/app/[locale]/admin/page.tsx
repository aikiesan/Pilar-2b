'use client'

/**
 * Admin panel: access requests, who can see which analyses. Portuguese only,
 * not in the menus.
 *
 * It renders only when GET /auth/me with the stored token says the person is an
 * active admin. Anyone else, and any failure, gets the site's 404, so the page
 * does not announce that it exists. The API checks the role again on each call.
 */

import { useCallback, useEffect, useState } from 'react'
import { notFound } from 'next/navigation'
import { fetchSession, type AdminUser } from '@/lib/api/adminClient'
import PeopleTab from '@/components/admin/PeopleTab'
import AnalysesTab from '@/components/admin/AnalysesTab'
import RequestsTab from '@/components/admin/RequestsTab'
import { listRequests } from '@/lib/api/adminClient'

type Gate = { state: 'checking' } | { state: 'denied' } | { state: 'ok'; me: AdminUser }

export default function AdminPage() {
  const [gate, setGate] = useState<Gate>({ state: 'checking' })
  const [tab, setTab] = useState<'requests' | 'people' | 'analyses'>('requests')
  const [pending, setPending] = useState<number | null>(null)
  const onPendingCount = useCallback((n: number) => setPending(n), [])

  useEffect(() => {
    let cancelled = false
    fetchSession().then(
      (me) => {
        if (cancelled) return
        const ok = me && me.role === 'admin' && me.is_active
        setGate(ok ? { state: 'ok', me } : { state: 'denied' })
        // The count shows on the tab whichever tab is open.
        if (ok) listRequests('pending_review').then((l) => !cancelled && setPending(l.length), () => {})
      },
      () => {
        if (!cancelled) setGate({ state: 'denied' })
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  if (gate.state === 'checking') return null
  if (gate.state === 'denied') {
    notFound()
    return null
  }

  const tabClass = (active: boolean) =>
    `min-h-11 border-b-2 px-4 font-medium ${
      active ? 'border-terra-600 text-ink' : 'border-transparent text-ink-muted hover:text-ink'
    }`

  return (
    <div className="bg-paper">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl text-ink">Acessos</h1>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Pedidos de acesso, o nível de cada pessoa, o nível de cada análise, a data de abertura e as
          liberações individuais.
        </p>
        <div role="group" aria-label="Seção" className="mt-6 flex gap-2 border-b border-line">
          <button type="button" aria-pressed={tab === 'requests'} className={tabClass(tab === 'requests')} onClick={() => setTab('requests')}>
            Pedidos
            {pending !== null && pending > 0 && (
              <span className="ml-2 rounded-full bg-terra-600 px-2 py-0.5 text-xs text-white tabular-nums">
                {pending}
                <span className="sr-only"> para decidir</span>
              </span>
            )}
          </button>
          <button type="button" aria-pressed={tab === 'analyses'} className={tabClass(tab === 'analyses')} onClick={() => setTab('analyses')}>
            Análises
          </button>
          <button type="button" aria-pressed={tab === 'people'} className={tabClass(tab === 'people')} onClick={() => setTab('people')}>
            Pessoas
          </button>
        </div>
        <div className="mt-6">
          {tab === 'requests' && <RequestsTab onPendingCount={onPendingCount} />}
          {tab === 'people' && <PeopleTab currentUserId={gate.me.id} />}
          {tab === 'analyses' && <AnalysesTab />}
        </div>
      </div>
    </div>
  )
}
