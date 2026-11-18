'use client';

import React, { Component, ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { logger } from '@/lib/logger';
import { withBasePath } from '@/lib/basePath';

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
  const tWay = useTranslations('wayfinding.error');
  const locale = useLocale();

  return (
    <div role="alert" aria-live="assertive" className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-lg border border-line bg-paper-raised p-8">
        <p className="eyebrow">{tWay('eyebrow')}</p>
        <h1 className="mt-3 text-3xl text-ink">{t('title')}</h1>
        <p className="mt-3 text-ink-muted">{t('message')}</p>

        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-6 border border-line bg-paper-sunken p-4">
            <summary className="cursor-pointer font-medium text-ink">{t('details')}</summary>
            <pre className="mt-2 overflow-auto text-xs text-terra-700 dark:text-terra-300">
              {error.toString()}
              {componentStack}
            </pre>
          </details>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={onReset} className="btn-primary min-h-[44px]">
            {tCommon('actions.retry')}
          </button>
          {/* A full load on purpose, to leave the broken state behind, in the
              visitor's language and under the app's base path. */}
          <a href={withBasePath(`/${locale}`)} className="btn-secondary min-h-[44px]">
            {t('home')}
          </a>
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundary;
