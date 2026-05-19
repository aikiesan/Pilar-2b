// Centralized i18n configuration
export const locales = ['en', 'pt-BR'] as const;
export type Locale = (typeof locales)[number];

// Default locale
export const defaultLocale: Locale = 'pt-BR';

// Locale prefix strategy
// 'always' ensures all routes have a locale prefix (e.g., /en/dashboard, /pt-BR/dashboard)
// This is important for proper routing on Vercel
export const localePrefix = 'always' as const;

