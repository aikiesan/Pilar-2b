'use client';

/**
 * Who may see the beta map layers.
 *
 * The signal is "do we hold a real backend JWT", NOT `useAuth().isAuthenticated`.
 * Those are different in the deployment that matters: with
 * NEXT_PUBLIC_DISABLE_AUTH=true (what the public site runs today) AuthContext
 * hands every visitor a synthetic TEST_USER and `isAuthenticated` is true for
 * anonymous traffic — gating on it would unlock beta for the whole internet.
 * A stored token only ever comes from a real POST /auth/login.
 *
 * This is the display half only. The data itself is gated server-side: the beta
 * endpoints answer 401 without a token, so a tampered client gets nothing.
 */

import { useEffect, useState } from 'react';
import { getStoredToken } from '@/lib/apiClient';

export function useBetaAccess(): boolean {
  // Resolved after mount: localStorage does not exist during SSR, and reading
  // it during render would desync hydration.
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const read = () => setHasAccess(!!getStoredToken());
    read();
    // Another tab logging in or out should flip the lock here too.
    window.addEventListener('storage', read);
    return () => window.removeEventListener('storage', read);
  }, []);

  return hasAccess;
}
