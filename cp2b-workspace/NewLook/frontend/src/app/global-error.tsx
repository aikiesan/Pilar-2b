'use client'

/**
 * The last resort: an error in the root layout itself. It replaces the whole
 * document, so it has no translation provider and no header, and it answers in
 * the visitor's language, taken from the URL.
 *
 * Its few strings are copied here rather than imported: the catalogs weigh
 * ~270 kB and this boundary ships with every page. lib/globalErrorCopy.ts holds
 * them; its test keeps them equal to wayfinding.error / common.nav.home in the catalogs.
 */
import './[locale]/globals.css'
import { withBasePath } from '@/lib/basePath'
import { GLOBAL_ERROR_COPY } from '@/lib/globalErrorCopy'

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const locale =
    typeof window !== 'undefined' && /\/en(\/|$)/.test(window.location.pathname) ? 'en' : 'pt-BR'
  const copy = GLOBAL_ERROR_COPY[locale]

  return (
    <html lang={locale}>
      <body className="bg-paper font-sans text-ink antialiased">
        <title>{`${copy.title} · PILAR-2b`}</title>
        <main role="alert" className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 className="mt-3 text-3xl sm:text-4xl">{copy.title}</h1>
          <p className="mt-4 text-ink-muted">{copy.body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={() => retry()} className="btn-primary min-h-[44px]">
              {copy.retry}
            </button>
            {/* A plain link on purpose: a full load leaves the broken state behind. */}
            <a href={withBasePath(`/${locale}`)} className="btn-secondary min-h-[44px]">
              {copy.home}
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}
