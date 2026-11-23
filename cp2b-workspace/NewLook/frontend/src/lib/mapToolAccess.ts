'use client';

/**
 * Who may use the map's click tools. The one place that decides it.
 *
 * The rule is an approved session at level 1 (registered) or above: sign-up
 * with approval (docs/superpowers/specs/2026-11-22-login-com-aprovacao-design.md).
 * The level comes from the real profile (/auth/me), never from the open-mode
 * TEST_USER. A session at level 0 reads as 'pending': the account exists but
 * its level does not include the tools yet.
 *
 * Never useAuth().isAuthenticated: in open mode (NEXT_PUBLIC_DISABLE_AUTH=true,
 * the public site and Docker) every anonymous visitor is a synthetic TEST_USER
 * and it is true for all of them. See lib/betaAccess.ts.
 *
 * Which tools are OFFERED is a different question (what is built):
 * lib/mapTools.ts.
 */

import { useRealSessionState } from '@/lib/betaAccess';
import { useSessionUser } from '@/contexts/AuthContext';

/** The lowest level that opens the map tools (1 registered). */
export const MAP_TOOLS_MIN_LEVEL = 1;

export type MapToolAccess = 'allowed' | 'sign_in' | 'pending' | 'loading';

export function useMapToolAccess(): MapToolAccess {
  const session = useRealSessionState();
  const profile = useSessionUser();
  if (session === null) return 'loading';
  if (!session) return 'sign_in';
  // A stored token is being checked against /auth/me.
  if (profile === undefined) return 'loading';
  // The token turned out to be expired or revoked.
  if (profile === null) return 'sign_in';
  const approved = (profile.status ?? 'approved') === 'approved';
  return approved && profile.clearance >= MAP_TOOLS_MIN_LEVEL ? 'allowed' : 'pending';
}
