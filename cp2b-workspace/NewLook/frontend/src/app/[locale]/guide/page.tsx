'use client';

import TourGuide from '@/components/ui/TourGuide';
import { Link } from '@/navigation' // Ajuste se estiver usando 'next/link' padrão
import { 
  Map, 
  BarChart3, 
  BookOpen, 
  Calculator, 
  Compass, 
  PlayCircle 
} from 'lucide-react'
import { useState } from 'react';

// Array com os dados dos cartões para manter o código limpo e fácil de manter
const guideTopics = [
  {
    title: 'Mapa Interativo',
    description: 'Explore visualmente o potencial de biogás em cada município paulista.',
    icon: <Map className="w-6 h-6 text-cp2b-green" />,
    href: '/guide/mapa',
    iconBg: 'bg-cp2b-lime-light/50'
  },
  {
    title: 'Análises',
    description: 'Gráficos comparativos por região, tipo de resíduo e horizonte temporal.',
    icon: <BarChart3 className="w-6 h-6 text-cp2b-green" />,
    href: '/guide/analises',
    iconBg: 'bg-cp2b-lime-light/50'
  },
  {
    title: 'Base Científica',
    description: 'Metodologia, fontes e referências que sustentam os cálculos.',
    icon: <BookOpen className="w-6 h-6 text-cp2b-green" />,
    href: '/guide/base-cientifica',
    iconBg: 'bg-cp2b-lime-light/50'
  },
  {
    title: 'Calculadora de Biogás',
    description: 'Estime a produção a partir de parâmetros customizados.',
    icon: <Calculator className="w-6 h-6 text-cp2b-green" />,
    href: '/guide/calculadora',
    iconBg: 'bg-cp2b-lime-light/50'
  },
  {
    title: 'Análise de Proximidade',
    description: 'Identifique municípios vizinhos com potencial complementar.',
    icon: <Compass className="w-6 h-6 text-cp2b-green" />,
    href: '/guide/proximidade',
    iconBg: 'bg-cp2b-lime-light/50'
  }
]

export default function GuideIndexPage() {  
  // Estado que controla se o tour está rodando ou não
  const [runTour, setRunTour] = useState(false);
    return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Coloque o componente do Tour na tela (ele fica invisível até run={true}) */}
      <TourGuide run={runTour} onFinish={() => setRunTour(false)} />
      {/* Cabeçalho da Página */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-12">
        <div className="max-w-2xl">
          <span className="text-cp2b-green font-semibold text-sm tracking-wide uppercase mb-2 block">
            Guia da plataforma
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
            Tudo sobre o PILAR-2b
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
            Explore cada funcionalidade ou faça um tour rápido pela plataforma. Os tópicos abaixo cobrem o uso prático, a metodologia e as perguntas mais comuns.
          </p>
        </div>

        {/* Botão de Tour Guiado */}
        <div className="shrink-0 mt-4 md:mt-0">
          <button 
            onClick={() => setRunTour(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-cp2b-green hover:bg-cp2b-dark-green text-white font-medium rounded-xl transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            <PlayCircle className="w-5 h-5" />
            Iniciar tour guiado
          </button>
        </div>
      </div>

      {/* Grid de Cartões */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {guideTopics.map((topic, index) => (
          <Link 
            key={index} 
            href={topic.href}
            className="group flex flex-col p-6 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-cp2b-lime transition-all duration-300 h-full"
          >
            {/* Ícone com fundo arredondado */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 ${topic.iconBg}`}>
              {topic.icon}
            </div>

            {/* Textos do Cartão */}
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-cp2b-green transition-colors">
              {topic.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed flex-grow">
              {topic.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}