/**
 * Admin panel API client: people's access levels, analyses and grants.
 *
 * Every call goes through authenticatedFetch. Failures throw an Error whose
 * message is Portuguese and ready to show in the row that caused it.
 */

import { authenticatedFetch, getStoredToken } from '@/lib/apiClient'

const BASE = process.env.NEXT_PUBLIC_API_URL || ''
const AUTH = `${BASE}/api/v1/auth`
const ANALYSES = `${BASE}/api/v1/admin/analyses`

export interface AdminUser {
  id: string
  email: string
  full_name: string
  role: string
  clearance: number
  is_active: boolean
  created_at: string
  updated_at: string
  last_login_at: string | null
}

export interface AdminAnalysis {
  id: string
  title_pt: string
  level: number
  opens_at: string | null
  is_active: boolean
  municipalities: number
  grants: number
}

export interface AdminGrant {
  user_id: string
  full_name: string
  email: string
  granted_by_name: string | null
  granted_at: string
  expires_at: string | null
  note: string | null
}

export interface AnalysisPatch {
  level?: number
  opens_at?: string | null
  is_active?: boolean
}

export interface GrantInput {
  expires_at: string | null
  note: string | null
}

async function failure(res: Response): Promise<Error> {
  let detail = ''
  try {
    const body = await res.json()
    if (typeof body?.detail === 'string') detail = body.detail
  } catch {
    /* no JSON body */
  }
  if (res.status === 401) return new Error('Sua sessão expirou. Entre de novo.')
  if (res.status === 403) return new Error('Você não tem permissão para isso.')
  if (res.status === 404) return new Error('Não encontrado. Atualize a página e tente de novo.')
  if (res.status === 400 && /own clearance/i.test(detail)) {
    return new Error('Não é possível mudar o próprio nível.')
  }
  if (res.status === 422) return new Error('Dados inválidos. Confira os campos.')
  if (res.status === 429) return new Error('Muitas tentativas. Espere um pouco.')
  return new Error('Não foi possível concluir. Tente de novo.')
}

async function request(url: string, init?: RequestInit): Promise<Response> {
  let res: Response
  try {
    res = await authenticatedFetch(url, init)
  } catch {
    throw new Error('Sem conexão com o servidor. Tente de novo.')
  }
  if (!res.ok) throw await failure(res)
  return res
}

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) })

/**
 * Who the REAL stored token belongs to, or null when there is no token.
 * The open-mode synthetic user is never consulted: this is the gate of /admin.
 */
export async function fetchSession(): Promise<AdminUser | null> {
  if (!getStoredToken()) return null
  const res = await authenticatedFetch(`${AUTH}/me`)
  if (!res.ok) throw new Error(`me ${res.status}`)
  return (await res.json()) as AdminUser
}

export async function listUsers(): Promise<AdminUser[]> {
  return (await request(`${AUTH}/users`)).json()
}

export async function setClearance(userId: string, clearance: number): Promise<void> {
  await request(`${AUTH}/users/${encodeURIComponent(userId)}/clearance`, {
    method: 'PATCH',
    ...json({ clearance }),
  })
}

export async function listAnalyses(): Promise<AdminAnalysis[]> {
  return (await request(ANALYSES)).json()
}

export async function patchAnalysis(id: string, patch: AnalysisPatch): Promise<AdminAnalysis> {
  const res = await request(`${ANALYSES}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    ...json(patch),
  })
  return res.json()
}

export async function listGrants(id: string): Promise<AdminGrant[]> {
  return (await request(`${ANALYSES}/${encodeURIComponent(id)}/grants`)).json()
}

export async function putGrant(id: string, userId: string, input: GrantInput): Promise<AdminGrant> {
  const res = await request(
    `${ANALYSES}/${encodeURIComponent(id)}/grants/${encodeURIComponent(userId)}`,
    { method: 'PUT', ...json(input) },
  )
  return res.json()
}

export async function deleteGrant(id: string, userId: string): Promise<void> {
  await request(`${ANALYSES}/${encodeURIComponent(id)}/grants/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  })
}
