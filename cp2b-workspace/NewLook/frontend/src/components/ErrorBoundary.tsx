'use client';

import React, { Component, ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 *
 * With custom fallback:
 * ```tsx
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error details to console and external service
    logger.error('ErrorBoundary caught an error:', {
      error: error.toString(),
      errorInfo: errorInfo.componentStack,
    });

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          componentStack={this.state.errorInfo?.componentStack}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  componentStack?: string | null;
  onReset: () => void;
}

/** The default fallback: a function component, so it can read the catalogs. */
function ErrorFallback({ error, componentStack, onReset }: ErrorFallbackProps) {
  const t = useTranslations('errorBoundary');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="min-h-screen flex items-center justify-center bg-gray-50 px-4"
    >
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <div className="flex items-center mb-4">
          <svg
            className="w-12 h-12 text-red-500 mr-4"
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
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        </div>

        <p className="text-gray-600 mb-6">{t('message')}</p>

        {process.env.NODE_ENV === 'development' && error && (
          <details className="mb-6 bg-gray-100 p-4 rounded-md">
            <summary className="cursor-pointer font-semibold text-gray-700 mb-2">
              {t('details')}
            </summary>
            <pre className="text-xs text-red-600 overflow-auto">
              {error.toString()}
              {componentStack}
            </pre>
          </details>
        )}

        <div className="flex gap-4">
          <button
            type="button"
            onClick={onReset}
            className="flex-1 bg-[#1a5f3f] text-white px-6 py-3 rounded-md hover:bg-[#144a31] transition-colors font-medium"
          >
            {tCommon('actions.retry')}
          </button>
          <button
            type="button"
            // A full load on purpose, to leave the broken state behind — in the
            // user's language.
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            onClick={() => window.location.assign(`/${locale}`)}
            className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-md hover:bg-gray-300 transition-colors font-medium"
          >
            {t('home')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundary;
