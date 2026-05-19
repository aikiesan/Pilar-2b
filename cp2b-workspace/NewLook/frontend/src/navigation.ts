/**
 * Centralized navigation utilities for locale-aware routing
 *
 * This module provides locale-aware navigation components and hooks
 * that automatically prefix routes with the current locale.
 *
 * Usage:
 * - Use `Link` instead of Next.js Link for internal navigation
 * - Use `useRouter()` for programmatic navigation
 * - Use `usePathname()` for getting locale-stripped pathname
 * - Use `redirect()` for server-side redirects
 */

import { createNavigation } from 'next-intl/navigation';
import { locales, localePrefix, type Locale } from './config/i18n';

/**
 * Navigation utilities created by next-intl
 * These automatically handle locale prefixing
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation({
  locales,
  localePrefix,
});

/**
 * Type for navigation props
 */
export type { Locale };

/**
 * Helper hook to create locale-prefixed paths
 * Useful when you need to construct URLs manually
 *
 * @example
 * const localePath = useLocalePath();
 * const dashboardUrl = localePath('/dashboard'); // Returns '/pt-BR/dashboard' or '/en/dashboard'
 */
export { useLocale } from 'next-intl';
