/**
 * A 404 outside any locale (an unknown language segment, for instance). There
 * is no locale to answer in, so it answers in both, from the catalogs, and
 * offers each language's home page. Paths under a locale get the full page in
 * [locale]/not-found.tsx instead.
 */
import Link from 'next/link'
import './[locale]/globals.css'
import ptBR from '../../messages/pt-BR.json'
import en from '../../messages/en.json'

const COPIES = [
  { locale: 'pt-BR', copy: ptBR.wayfinding.not_found },
  { locale: 'en', copy: en.wayfinding.not_found },
] as const

export default function RootNotFound() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <title>{`${ptBR.wayfinding.not_found.meta_title} · ${en.wayfinding.not_found.meta_title} · PILAR-2b`}</title>
      <div className="mx-auto grid max-w-5xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 lg:px-8">
        {COPIES.map(({ locale, copy }) => (
          <section key={locale} lang={locale}>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1 className="mt-3 text-3xl">{copy.title}</h1>
            <Link href={`/${locale}`} className="btn-primary mt-6 min-h-[44px]">
              {copy.back_home}
            </Link>
          </section>
        ))}
      </div>
    </main>
  )
}
