/**
 * The strings of app/global-error.tsx, which renders without the intl provider
 * and ships with every page, so it cannot import the ~270 kB catalogs.
 * __tests__/globalErrorCopy.test.ts keeps them equal to the catalogs.
 */
export const GLOBAL_ERROR_COPY = {
  'pt-BR': {
    eyebrow: 'Algo deu errado', // i18n-exempt: no intl provider here; mirrors wayfinding.error (tested)
    title: 'Esta página não carregou direito', // i18n-exempt: no intl provider here; mirrors wayfinding.error (tested)
    body: 'Pode ter sido uma falha passageira na conexão ou no servidor. Tente de novo; se continuar, volte ao início ou abra o mapa.', // i18n-exempt: no intl provider here; mirrors wayfinding.error (tested)
    retry: 'Tentar de novo', // i18n-exempt: no intl provider here; mirrors wayfinding.error (tested)
    home: 'Início', // i18n-exempt: no intl provider here; mirrors common.nav.home (tested)
  },
  en: {
    eyebrow: 'Something went wrong',
    title: "This page didn't load properly",
    body: "It may have been a brief connection or server hiccup. Try again; if it keeps happening, go back home or open the map.",
    retry: 'Try again',
    home: 'Home',
  },
} as const
