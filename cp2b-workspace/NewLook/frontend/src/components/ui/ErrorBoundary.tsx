/**
 * PILAR-2b V3 - Error Boundary Component
 */

'use client';

import React from 'react';

interface ErrorDisplayProps {
  error: Error | null;
  onRetry?: () => void;
  message?: string;
}

export default function ErrorDisplay({ error, onRetry, message }: ErrorDisplayProps) {
  return (
    <div
      className="flex flex-col items-center justify-center p-8 bg-red-50 border border-red-200 rounded-lg"
      role="alert"
      aria-live="assertive"
    >
      <svg
        className="w-12 h-12 text-red-500 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>

      <h3 className="text-lg font-semibold text-red-900 mb-2">
        {message || 'Erro ao carregar dados'}
      </h3>

      {error && (
        <p className="text-sm text-red-700 mb-4 text-center max-w-md">
          {error.message}
        </p>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          aria-label="Tentar novamente"
        >
          Tentar Novamente
        </button>
      )}
    </div>
  );
}
