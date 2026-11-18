import type { Locale } from '@/config/i18n';
import type { Messages } from '@/types/i18n';

/**
 * Types every `t('key')` against the catalog, so a key missing from
 * messages/pt-BR.json fails `npm run typecheck` instead of rendering as the raw
 * key string on the page. It also narrows `useLocale()` to the two locales.
 */
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
