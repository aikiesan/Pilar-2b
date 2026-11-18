/**
 * PILAR-2b V3 - QueryClient Provider (Updated with Error Boundary)
 * Wraps the app with TanStack Query for optimized data fetching and caching
 */

'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/queryClient';
import { logger } from '@/lib/logger';
import { ReactNode, useEffect } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * QueryProvider - Wraps app with TanStack Query
 *
 * Features:
 * - Centralized data fetching and caching
 * - Automatic background refetching
 * - Optimistic updates
 * - DevTools for debugging (development only)
 */
export function QueryProvider({ children }: QueryProviderProps) {
  useEffect(() => {
    // Log that QueryProvider is mounted (always enabled for debugging)
    logger.debug('QueryProvider mounted successfully');
    logger.debug('Environment:', process.env.NODE_ENV);
    logger.debug('API URL:', process.env.NEXT_PUBLIC_API_URL || 'default');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools only in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="bottom"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}
