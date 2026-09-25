'use client';

import { Link } from '@/navigation' // Ajuste se estiver usando 'next/link' padrão
import {
  Map,
  BarChart3,
  BookOpen,
  Calculator,
  Compass,
  PlayCircle,
  ArrowRight,
} from 'lucide-react'
import { useTranslations } from 'next-intl';

// Card copy lives in the catalog under `guide.topics_items`; the icon, target
// and styling are presentation and stay here, matched by index.
const guideTopicMeta = [
  { icon: <Map className="w-6 h-6 text-cp2b-green" />, href: '/guide/mapa' },
  { icon: <BarChart3 className="w-6 h-6 text-cp2b-green" />, href: '/guide/analises' },
  { icon: <BookOpen className="w-6 h-6 text-cp2b-green" />, href: '/guide/base-cientifica' },
  { icon: <Calculator className="w-6 h-6 text-cp2b-green" />, href: '/guide/calculadora' },
  { icon: <Compass className="w-6 h-6 text-cp2b-green" />, href: '/guide/proximidade' },
]
const TOPIC_ICON_BG = 'bg-cp2b-lime-light/50'

export default function GuideIndexPage() {
  const t = useTranslations('guide');
  const guideTopics = (t.raw('topics_items') as Array<{ title: string; description: string }>).map(
    (topic, index) => ({ ...topic, ...guideTopicMeta[index], iconBg: TOPIC_ICON_BG })
  );

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Faixa de destaque: o mapa é a porta de entrada da plataforma. */}
      <Link
        href="/map"
        className="group mb-8 flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-cp2b-green to-cp2b-dark-green p-6 text-white shadow-sm transition-all hover:shadow-lg"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
            <Map className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">{t('banner_title')}</h2>
            <p className="text-sm text-white/80">
              {t('banner_subtitle')}
            </p>
          </div>
        </div>
        <ArrowRight className="h-6 w-6 shrink-0 transition-transform group-hover:translate-x-1" />
      </Link>

      {/* Cabeçalho da Página */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-12">
        <div className="max-w-2xl">
          <span className="text-cp2b-green dark:text-cp2b-lime font-semibold text-sm tracking-wide uppercase mb-2 block">
            {t('eyebrow')}
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
            {t('heading')}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
            {t('lead')}
          </p>
        </div>

        {/* Botão de Tour Guiado */}
        <div className="shrink-0 mt-4 md:mt-0">
          <button 
            // Dispara o evento global que o controlador do layout está escutando
            onClick={() => window.dispatchEvent(new Event('start-guide-tour'))}
            className="inline-flex items-center gap-2 px-6 py-3 bg-cp2b-green hover:bg-cp2b-dark-green text-white font-medium rounded-xl transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            <PlayCircle className="w-5 h-5" />
            {t('start_tour')}
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
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 ${topic.iconBg}`}>
              {topic.icon}
            </div>
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
  );
}