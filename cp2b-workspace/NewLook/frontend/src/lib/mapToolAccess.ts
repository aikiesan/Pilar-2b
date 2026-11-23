'use client';

/**
 * Who may use the map's click tools. The one place that decides it.
 *
 * The rule is an approved session (sign-in with approval, Part 2 of
 * docs/superpowers/specs/2026-11-22-login-com-aprovacao-design.md). Part 2 is
 * not built yet, so a real session stands in for "approved" and 'pending' is
 * never returned. When Part 2 lands, read its approval state here and nowhere
 * else.
 *
 * Never useAuth().isAuthenticated: in open mode (NEXT_PUBLIC_DISABLE_AUTH=true,
 * the public site and Docker) every anonymous visitor is a synthetic TEST_USER
 * and it is true for all of them. See lib/betaAccess.ts.
 *
 * Which tools are OFFERED is a different question (what is built):
 * lib/mapTools.ts.
 */

import { useRealSessionState } from '@/lib/betaAccess';

export type MapToolAccess = 'allowed' | 'sign_in' | 'pending' | 'loading';

export function useMapToolAccess(): MapToolAccess {
  const session = useRealSessionState();
  if (session === null) return 'loading';
  return session ? 'allowed' : 'sign_in';
}
