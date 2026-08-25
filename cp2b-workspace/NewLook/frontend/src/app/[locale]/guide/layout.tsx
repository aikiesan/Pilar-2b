import { Link } from '@/navigation' // Ajuste para 'next/link' se não usar o roteamento do next-intl
import { BookOpen } from 'lucide-react'
import GuideTourController from '@/components/ui/GuideTourController'

export default function GuideLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900 pt-16">
      
      {/* Sidebar (Menu Lateral) - Visível apenas em telas médias (md) para cima */}
      <aside className="w-64 fixed h-full border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 overflow-y-auto hidden md:block">
        <h2 className="text-lg font-bold text-cp2b-green mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Guia da Plataforma
        </h2>
        
        <nav className="space-y-1">
          <span className="block text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-2 px-3">
            Tópicos principais
          </span>
          
          <Link
            href="/guide"
            className="block px-3 py-2 rounded-lg hover:bg-cp2b-lime-light dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 hover:text-cp2b-green font-medium transition-colors"
          >
            Introdução
          </Link>

          <Link
            href="/sobre"
            className="block px-3 py-2 rounded-lg hover:bg-cp2b-lime-light dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 hover:text-cp2b-green font-medium transition-colors"
          >
            Sobre a plataforma
          </Link>

          <Link
            href="/map"
            className="block px-3 py-2 rounded-lg bg-cp2b-green/10 dark:bg-emerald-500/10 text-cp2b-green dark:text-emerald-300 hover:bg-cp2b-green/20 font-semibold transition-colors"
          >
            → Abrir o Mapa
          </Link>

          <span className="block text-[10px] font-bold text-gray-400 tracking-wider uppercase mt-4 mb-2 px-3">
            Tópicos
          </span>

          <Link
            href="/guide/mapa"
            className="block px-3 py-2 rounded-lg hover:bg-cp2b-lime-light dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 hover:text-cp2b-green font-medium transition-colors"
          >
            Como usar o Mapa
          </Link>
          
          <Link 
            href="/guide/analises" 
            className="block px-3 py-2 rounded-lg hover:bg-cp2b-lime-light dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 hover:text-cp2b-green font-medium transition-colors"
          >
            Análises
          </Link>
          
          <Link 
            href="/guide/base-cientifica" 
            className="block px-3 py-2 rounded-lg hover:bg-cp2b-lime-light dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 hover:text-cp2b-green font-medium transition-colors"
          >
            Base Científica
          </Link>
          
          <Link 
            href="/guide/calculadora" 
            className="block px-3 py-2 rounded-lg hover:bg-cp2b-lime-light dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 hover:text-cp2b-green font-medium transition-colors"
          >
            Calculadora de Biogás
          </Link>
          
          <Link 
            href="/guide/proximidade" 
            className="block px-3 py-2 rounded-lg hover:bg-cp2b-lime-light dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 hover:text-cp2b-green font-medium transition-colors"
          >
            Análise de Proximidade
          </Link>
        </nav>
      </aside>

      {/* Área de Conteúdo Dinâmico (Direita) */}
      <main className="flex-1 md:ml-64 p-8 max-w-5xl relative">
        {children}
      </main>

      {/* Controlador de Onboarding e Botão Flutuante de Ajuda */}
      <GuideTourController />
      
    </div>
  )
}