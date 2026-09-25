import { Link } from '@/navigation'
import { useTranslations } from 'next-intl'
import { BookOpen } from 'lucide-react'
import GuideTourController from '@/components/ui/GuideTourController'

export default function GuideLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = useTranslations('guide')

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900 pt-16">
      
      {/* Sidebar (Menu Lateral) - Visível apenas em telas médias (md) para cima */}
      <aside className="w-64 fixed h-full border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 overflow-y-auto hidden md:block">
        <h2 className="text-lg font-bold text-cp2b-green dark:text-cp2b-lime mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t('sidebar_heading')}
        </h2>
        
        <nav className="space-y-1">
          <span className="block text-[10px] font-bold text-gray-500 dark:text-slate-400 tracking-wider uppercase mb-2 px-3">
            {t('main_topics')}
          </span>
          
          <Link
            href="/guide"
            className="block px-3 py-2 rounded-lg hover:bg-cp2b-lime-light dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 hover:text-cp2b-green font-medium transition-colors"
          >
            {t('nav_intro')}
          </Link>

          <Link
            href="/sobre"
            className="block px-3 py-2 rounded-lg hover:bg-cp2b-lime-light dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 hover:text-cp2b-green font-medium transition-colors"
          >
            {t('nav_about')}
          </Link>

          <Link
            href="/map"
            className="block px-3 py-2 rounded-lg bg-cp2b-green/10 dark:bg-emerald-500/10 text-cp2b-dark-green dark:text-emerald-300 hover:bg-cp2b-green/20 font-semibold transition-colors"
          >
            {t('nav_open_map')}
          </Link>

          <span className="block text-[10px] font-bold text-gray-500 dark:text-slate-400 tracking-wider uppercase mt-4 mb-2 px-3">
            {t('topics_label')}
          </span>

          <Link
            href="/guide/mapa"
            className="block px-3 py-2 rounded-lg hover:bg-cp2b-lime-light dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 hover:text-cp2b-green font-medium transition-colors"
          >
            {t('nav_map')}
          </Link>
          
          <Link 
            href="/guide/analises" 
            className="block px-3 py-2 rounded-lg hover:bg-cp2b-lime-light dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 hover:text-cp2b-green font-medium transition-colors"
          >
            {t('nav_analyses')}
          </Link>
          
          <Link 
            href="/guide/base-cientifica" 
            className="block px-3 py-2 rounded-lg hover:bg-cp2b-lime-light dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 hover:text-cp2b-green font-medium transition-colors"
          >
            {t('nav_science')}
          </Link>
          
          <Link 
            href="/guide/calculadora" 
            className="block px-3 py-2 rounded-lg hover:bg-cp2b-lime-light dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 hover:text-cp2b-green font-medium transition-colors"
          >
            {t('nav_calculator')}
          </Link>
          
          <Link 
            href="/guide/proximidade" 
            className="block px-3 py-2 rounded-lg hover:bg-cp2b-lime-light dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 hover:text-cp2b-green font-medium transition-colors"
          >
            {t('nav_proximity')}
          </Link>
        </nav>
      </aside>

      {/* Área de Conteúdo Dinâmico (Direita) */}
      <div className="flex-1 md:ml-64 p-8 max-w-5xl relative">
        {children}
      </div>

      {/* Controlador de Onboarding e Botão Flutuante de Ajuda */}
      <GuideTourController />
      
    </div>
  )
}