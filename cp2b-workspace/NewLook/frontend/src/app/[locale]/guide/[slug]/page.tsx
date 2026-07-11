import { getTranslations } from 'next-intl/server';
import { Link } from '@/navigation';
import { ArrowLeft } from 'lucide-react';


  
export default async function GuideArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  // 2. Aguardamos o Next.js ler a URL
  const { slug } = await params;
  const t = await getTranslations('guide_articles');
  // O try/catch silencioso aqui do next-intl pode retornar undefined se não achar a chave, 
  // então dizemos que pode ser Array ou undefined
  const sections = t.raw(`${slug}.sections`) as Array<{ id: string, title: string, content: string }> | undefined;

  if (!sections || Array.isArray(sections) === false) {
    return (
      <div className="max-w-7xl mx-auto py-20 px-4 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Tópico não encontrado</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">O artigo "{slug}" não existe no guia ou ainda está sendo escrito.</p>
        <Link href="/guide" className="text-cp2b-green font-semibold hover:underline flex items-center justify-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar para todos os tópicos
        </Link>
      </div>
    );
  }


  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-8">
        <Link href="/" className="hover:text-cp2b-green">Início</Link>
        <span className="mx-2">/</span>
        <Link href="/guide" className="hover:text-cp2b-green">Guia</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 dark:text-white font-medium">{t(`${slug}.title`)}</span>
      </nav>

      <div className="flex flex-col md:flex-row gap-12">
        
        {/* SIDEBAR ESQUERDA */}
        <aside className="w-full md:w-64 shrink-0">
          <Link 
            href="/guide" 
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-cp2b-green font-medium mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('sidebar.back_button')}
          </Link>

          <div className="sticky top-24">
            <h3 className="text-xs font-bold text-gray-400 tracking-wider mb-4 uppercase">
              {t('sidebar.on_this_page')}
            </h3>
            
            <ul className="space-y-3 mb-10 border-l-2 border-gray-100 dark:border-slate-800">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a 
                    href={`#${section.id}`} 
                    className={`block pl-4 text-sm transition-colors ${
                      index === 0 
                        ? 'text-cp2b-green font-semibold border-l-2 -ml-[2px] border-cp2b-green' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-cp2b-green'
                    }`}
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>

            <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-4">
              {t('sidebar.other_topics')}
            </h3>
            <ul className="space-y-3">
              <li><Link href="/guide/analises" className="text-sm text-gray-600 dark:text-gray-400 hover:text-cp2b-green transition-colors">Análises</Link></li>
              <li><Link href="/guide/base-cientifica" className="text-sm text-gray-600 dark:text-gray-400 hover:text-cp2b-green transition-colors">Base Científica</Link></li>
            </ul>
          </div>
        </aside>

        {/* CONTEÚDO PRINCIPAL */}
        <main className="flex-1 max-w-3xl">
          <span className="text-cp2b-green font-semibold text-sm tracking-wide uppercase">Guia</span>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mt-2 mb-4">
            {t(`${slug}.title`)}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 leading-relaxed">
            {t(`${slug}.subtitle`)}
          </p>

          <div className="space-y-12">
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {section.title}
                </h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {section.content}
                </p>
              </section>
            ))}
          </div>
        </main>

      </div>
    </div>
  );
}