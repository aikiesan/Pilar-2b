'use client'

/**
 * About Page - PILAR-2b
 * Comprehensive information about the Plataforma Inteligente de Localização e Aproveitamento de Resíduos para Biogas e Bioprodutos
 * Public version matching the dashboard Sobre page content
 */
import { useState } from 'react'
import { Link } from '@/navigation'
import Image from 'next/image'
import AnimatedCounter from '@/components/ui/AnimatedCounter'
import Timeline, { TimelineEvent } from '@/components/ui/Timeline'
import NewsletterSignup from '@/components/ui/NewsletterSignup'
import {
  ArrowLeft,
  Target,
  Eye,
  Heart,
  Award,
  ChevronRight,
  MapPin,
  Database,
  Mail,
  Building2,
  GraduationCap,
  BarChart3,
  Layers,
  CheckCircle2,
  ArrowRight,
  FlaskConical,
  Settings,
  Megaphone,
  Scale,
  Factory,
  Lightbulb,
  TrendingUp,
  Calendar,
  Rocket,
  Users
} from 'lucide-react'

export default function AboutPage() {
  const [activeTab, setActiveTab] = useState('mission')

  // Project timeline data
  const projectTimeline: TimelineEvent[] = [
    {
      date: 'Fevereiro 2025',
      title: 'Início do Projeto PILAR-2b',
      description: 'Lançamento oficial do Centro Paulista de Estudos em Biogás e Bioprodutos com financiamento FAPESP.',
      status: 'completed',
      details: [
        'Aprovação do projeto FAPESP 2025/08745-2',
        'Formação da equipe multidisciplinar',
        'Estruturação dos 8 eixos temáticos'
      ],
      icon: <Rocket className="w-4 h-4" />
    },
    {
      date: 'Março 2025',
      title: 'Desenvolvimento da Plataforma PILAR-2b V3',
      description: 'Início do desenvolvimento da plataforma web moderna para análise de potencial de biogás.',
      status: 'in-progress',
      details: [
        'Arquitetura Next.js 15 + FastAPI',
        'Integração com MapBiomas',
        'Sistema MCDA implementado',
        'Dashboard interativo com 645 municípios'
      ],
      icon: <Database className="w-4 h-4" />
    },
    {
      date: 'Fevereiro 2030',
      title: 'Conclusão do Projeto',
      description: 'Encerramento da primeira fase do PILAR-2b com legado de pesquisa e inovação.',
      status: 'upcoming',
      details: [
        'Relatório final de impacto',
        'Publicações científicas',
        'Transferência de tecnologia'
      ],
      icon: <Award className="w-4 h-4" />
    }
  ]

  // 8 Thematic Axes data
  const thematicAxes = [
    {
      number: 1,
      title: 'Inventário de Resíduos e Mapeamento de Tecnologias',
      description: 'Levantamento sistemático de fontes de resíduos e mapeamento das tecnologias disponíveis para produção de biogás no Estado de São Paulo.',
      icon: Database,
      color: 'emerald'
    },
    {
      number: 2,
      title: 'Ciência e Tecnologia de Base',
      description: 'Pesquisa fundamental em digestão anaeróbia, microbiologia e processos bioquímicos. Coordenado pelo Prof. Lucas Tadeu Fuess.',
      icon: FlaskConical,
      color: 'blue'
    },
    {
      number: 3,
      title: 'Engenharia de Processos e Bioprocessos',
      description: 'Desenvolvimento e otimização de biodigestores, scale-up de processos e integração de sistemas de produção.',
      icon: Settings,
      color: 'amber'
    },
    {
      number: 4,
      title: 'Avaliação Integrada Socioeconômica, Ambiental e Energética',
      description: 'Análise de ciclo de vida, viabilidade econômica, impactos sociais e balanço energético dos projetos de biogás.',
      icon: BarChart3,
      color: 'teal'
    },
    {
      number: 5,
      title: 'Inovação em Bioprodutos',
      description: 'Desenvolvimento de biohidrogênio, biofertilizantes, bio-CO₂ e outros bioprodutos de alto valor agregado.',
      icon: Lightbulb,
      color: 'rose'
    },
    {
      number: 6,
      title: 'Educação e Capacitação',
      description: 'Formação de recursos humanos qualificados através de cursos, workshops e programas de pós-graduação.',
      icon: GraduationCap,
      color: 'indigo'
    },
    {
      number: 7,
      title: 'Difusão Científica e Comunicação',
      description: 'Disseminação do conhecimento científico para sociedade, mídia e tomadores de decisão.',
      icon: Megaphone,
      color: 'orange'
    },
    {
      number: 8,
      title: 'Políticas Públicas e Inovação Regulatória',
      description: 'Apoio à formulação de políticas públicas e marcos regulatórios para o setor de biogás.',
      icon: Scale,
      color: 'cyan'
    }
  ]

  // Strategic partnerships
  const partnerships = [
    { name: 'Aalborg University', country: 'Dinamarca', type: 'Internacional', contact: 'Prof. Jens Bo Holm-Nielsen' },
    { name: 'CIBiogás', country: 'Brasil', type: 'Nacional', contact: '10+ anos de parceria' },
    { name: 'LABIOEN/UNICAMP', country: 'Brasil', type: 'Institucional', contact: 'Laboratório de Bioenergia' },
    { name: 'USP-RCGI', country: 'Brasil', type: 'Pesquisa', contact: 'Research Centre for Greenhouse Gas Innovation' },
    { name: 'UNESP', country: 'Brasil', type: 'Acadêmico', contact: 'Doutorado em Bioenergia' },
    { name: 'UNICA', country: 'Brasil', type: 'Indústria', contact: 'União da Indústria de Cana-de-Açúcar' },
    { name: 'Abiogás', country: 'Brasil', type: 'Associação', contact: 'Associação Brasileira de Biogás' },
    { name: 'ABREMA', country: 'Brasil', type: 'Associação', contact: 'Associação Brasileira de Resíduos' }
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-900 via-green-800 to-emerald-900">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <Link
            href="/"
            className="inline-flex items-center text-green-200 hover:text-white mb-8 transition-colors group"
            aria-label="Voltar à página inicial"
          >
            <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
            Voltar
          </Link>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center px-4 py-2 bg-green-700/50 rounded-full text-green-100 text-sm mb-6">
                <Award className="h-4 w-4 mr-2" aria-hidden="true" />
                FAPESP 2025/08745-2
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                PILAR-2b
                <span className="block text-green-300">Plataforma Inteligente de Localização e Aproveitamento de Resíduos para Biogas e Bioprodutos</span>
              </h1>

              <p className="text-lg text-green-100 mb-8 leading-relaxed">
                Centro de Excelência vinculado ao NIPE/UNICAMP, dedicado à pesquisa e inovação
                em biogás e bioprodutos para o desenvolvimento sustentável do Estado de São Paulo.
              </p>

            </div>

            {/* Hero Stats */}
            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute -inset-4 bg-green-500/20 rounded-2xl blur-2xl"></div>
                <div className="relative bg-green-800/50 backdrop-blur rounded-2xl p-8 border border-green-700/50">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-900/50 rounded-lg p-4 text-center">
                      <Factory className="h-8 w-8 text-green-300 mx-auto mb-2" aria-hidden="true" />
                      <div className="text-2xl font-bold text-white">
                        <AnimatedCounter end={4.6} decimals={1} suffix=" bi" />
                      </div>
                      <div className="text-xs text-green-300 uppercase tracking-wide">m³ biogás/ano</div>
                    </div>
                    <div className="bg-green-900/50 rounded-lg p-4 text-center">
                      <TrendingUp className="h-8 w-8 text-green-300 mx-auto mb-2" aria-hidden="true" />
                      <div className="text-2xl font-bold text-white">
                        R$ <AnimatedCounter end={20} suffix="M" />
                      </div>
                      <div className="text-xs text-green-300 uppercase tracking-wide">Investimento</div>
                    </div>
                    <div className="bg-green-900/50 rounded-lg p-4 text-center">
                      <MapPin className="h-8 w-8 text-green-300 mx-auto mb-2" aria-hidden="true" />
                      <div className="text-2xl font-bold text-white">
                        <AnimatedCounter end={645} />
                      </div>
                      <div className="text-xs text-green-300 uppercase tracking-wide">Municípios</div>
                    </div>
                    <div className="bg-green-900/50 rounded-lg p-4 text-center">
                      <Layers className="h-8 w-8 text-green-300 mx-auto mb-2" aria-hidden="true" />
                      <div className="text-2xl font-bold text-white">
                        <AnimatedCounter end={8} />
                      </div>
                      <div className="text-xs text-green-300 uppercase tracking-wide">Eixos Temáticos</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0 -mb-px">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="block w-full">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" className="fill-white dark:fill-slate-900"/>
          </svg>
        </div>
      </section>

      {/* Mobile Stats */}
      <section className="lg:hidden bg-white dark:bg-slate-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-700">
                <AnimatedCounter end={4.6} decimals={1} suffix=" bi" />
              </div>
              <div className="text-xs text-gray-600 dark:text-slate-400 uppercase tracking-wide">m³/ano</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-700">
                R$ <AnimatedCounter end={20} suffix="M" />
              </div>
              <div className="text-xs text-gray-600 dark:text-slate-400 uppercase tracking-wide">Investimento</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-700">
                <AnimatedCounter end={645} />
              </div>
              <div className="text-xs text-gray-600 dark:text-slate-400 uppercase tracking-wide">Municípios</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-700">
                <AnimatedCounter end={8} />
              </div>
              <div className="text-xs text-gray-600 dark:text-slate-400 uppercase tracking-wide">Eixos</div>
            </div>
          </div>
        </div>
      </section>

      {/* Coordinator Section */}
      <section className="py-16 lg:py-24 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-slate-100 mb-4">
              Coordenação
            </h2>
            <p className="text-lg text-gray-600 dark:text-slate-400 max-w-3xl mx-auto">
              Liderança científica do Centro de Excelência em Biogás
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
              <div className="md:flex">
                <div className="md:w-1/3 bg-gradient-to-br from-green-600 to-emerald-700 p-8 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-32 h-32 rounded-full overflow-hidden mx-auto mb-4 border-4 border-white/30">
                      <Image
                        src="/images/team/bruna-moraes.jpg"
                        alt="Profa. Dra. Bruna de Souza Moraes"
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                        style={{ height: 'auto' }}
                        sizes="128px"
                      />
                    </div>
                    <h3 className="text-xl font-bold text-white">Profa. Dra.</h3>
                    <p className="text-green-100">Bruna de Souza Moraes</p>
                  </div>
                </div>
                <div className="md:w-2/3 p-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">
                    Coordenadora Geral do PILAR-2b
                  </h3>
                  <div className="space-y-3 text-gray-600 dark:text-slate-400 mb-6">
                    <p className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      Pesquisadora Permanente do NIPE/UNICAMP
                    </p>
                    <p className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      Professora Colaboradora PSE/FEM/UNICAMP
                    </p>
                    <p className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      15+ anos de experiência em bioenergia
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Formação Acadêmica</h4>
                    <ul className="text-sm text-gray-600 dark:text-slate-400 space-y-1">
                      <li>• Doutorado em Engenharia - USP (2012)</li>
                      <li>• Mestrado em Engenharia - USP (2009)</li>
                      <li>• Engenharia de Alimentos - USP (2007)</li>
                      <li>• Pós-doc: LNBR + University of Southern Denmark</li>
                    </ul>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">Digestão Anaeróbia</span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">Biorrefinarias</span>
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">Biohidrogênio</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission/Vision/Values */}
      <section className="py-16 lg:py-24 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-slate-100 mb-4">
              Sobre o Projeto
            </h2>
            <p className="text-lg text-gray-600 dark:text-slate-400 max-w-3xl mx-auto">
              Missão, visão e valores que orientam o Centro Paulista de Estudos em Biogás e Bioprodutos.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1" role="tablist">
              <button
                onClick={() => setActiveTab('mission')}
                className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'mission'
                    ? 'bg-white dark:bg-slate-700 text-green-700 dark:text-green-400 shadow-sm'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100'
                }`}
                role="tab"
                aria-selected={activeTab === 'mission'}
                aria-controls="mission-panel"
              >
                <Target className="h-4 w-4 inline mr-2" aria-hidden="true" />
                Missão
              </button>
              <button
                onClick={() => setActiveTab('vision')}
                className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'vision'
                    ? 'bg-white dark:bg-slate-700 text-green-700 dark:text-green-400 shadow-sm'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100'
                }`}
                role="tab"
                aria-selected={activeTab === 'vision'}
                aria-controls="vision-panel"
              >
                <Eye className="h-4 w-4 inline mr-2" aria-hidden="true" />
                Visão
              </button>
              <button
                onClick={() => setActiveTab('values')}
                className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'values'
                    ? 'bg-white dark:bg-slate-700 text-green-700 dark:text-green-400 shadow-sm'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100'
                }`}
                role="tab"
                aria-selected={activeTab === 'values'}
                aria-controls="values-panel"
              >
                <Heart className="h-4 w-4 inline mr-2" aria-hidden="true" />
                Valores
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="max-w-4xl mx-auto">
            {activeTab === 'mission' && (
              <div id="mission-panel" role="tabpanel" className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl p-8 lg:p-12 border border-green-100 dark:border-slate-700">
                <div className="flex items-center mb-6">
                  <div className="h-12 w-12 bg-green-600 rounded-xl flex items-center justify-center mr-4">
                    <Target className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Nossa Missão</h3>
                </div>
                <p className="text-lg text-gray-700 dark:text-slate-300 leading-relaxed">
                  Desenvolver pesquisas, tecnologias e soluções inovadoras de biogás com motivação industrial,
                  ambiental e social, promovendo o aproveitamento inteligente de resíduos para o desenvolvimento
                  sustentável do Estado de São Paulo e contribuindo para a transição energética brasileira.
                </p>
                <div className="mt-6 p-4 bg-white/50 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    <strong>Modelo:</strong> Laboratório vivo integrando Academia, Indústria, Governo e Sociedade
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'vision' && (
              <div id="vision-panel" role="tabpanel" className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 lg:p-12 border border-blue-100">
                <div className="flex items-center mb-6">
                  <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center mr-4">
                    <Eye className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Nossa Visão</h3>
                </div>
                <p className="text-lg text-gray-700 leading-relaxed">
                  Ser referência nacional e internacional na gestão eficiente e sustentável de resíduos urbanos e
                  agropecuários, transformando o Estado de São Paulo em vitrine de soluções inteligentes em biogás
                  e contribuindo para a consolidação da bioeconomia circular no Brasil.
                </p>
                <div className="mt-6 p-4 bg-white/50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Vigência:</strong> Fevereiro 2025 - Fevereiro 2030 (5 anos)
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'values' && (
              <div id="values-panel" role="tabpanel" className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 lg:p-12 border border-amber-100">
                <div className="flex items-center mb-6">
                  <div className="h-12 w-12 bg-amber-600 rounded-xl flex items-center justify-center mr-4">
                    <Heart className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Nossos Valores</h3>
                </div>
                <ul className="space-y-4">
                  {[
                    'Abordagem transdisciplinar para soluções inovadoras',
                    'Bioeconomia circular e valorização de resíduos',
                    'Compromisso com a agenda de descarbonização até 2050',
                    'Educação como instrumento de transformação social',
                    'Desenvolvimento de projetos com abordagem local e replicação'
                  ].map((value, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle2 className="h-6 w-6 text-amber-600 mr-3 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span className="text-lg text-gray-700">{value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 8 Thematic Axes */}
      <section id="eixos" className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              8 Eixos Temáticos Integrados
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Estrutura multidisciplinar que abrange toda a cadeia de valor do biogás e bioprodutos.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {thematicAxes.map((axis) => {
              const IconComponent = axis.icon
              const colorClasses: Record<string, string> = {
                emerald: 'bg-emerald-100 text-emerald-600 border-emerald-200',
                blue: 'bg-blue-100 text-blue-600 border-blue-200',
                amber: 'bg-amber-100 text-amber-600 border-amber-200',
                teal: 'bg-teal-100 text-teal-600 border-teal-200',
                rose: 'bg-rose-100 text-rose-600 border-rose-200',
                indigo: 'bg-indigo-100 text-indigo-600 border-indigo-200',
                orange: 'bg-orange-100 text-orange-600 border-orange-200',
                cyan: 'bg-cyan-100 text-cyan-600 border-cyan-200'
              }

              return (
                <div
                  key={axis.number}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colorClasses[axis.color]}`}>
                      <IconComponent className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <span className="text-sm font-bold text-gray-500">Eixo {axis.number}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{axis.title}</h3>
                  <p className="text-sm text-gray-600">{axis.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* São Paulo Potential */}
      <section className="py-16 lg:py-24 bg-green-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Potencial de São Paulo
            </h2>
            <p className="text-lg text-green-200 max-w-3xl mx-auto">
              O Estado de São Paulo concentra mais de 50% do potencial de biogás do Brasil.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-green-800/50 rounded-xl p-6 border border-green-700/50 text-center hover:bg-green-800/70 transition-colors">
              <div className="text-4xl font-bold text-white mb-2">
                <AnimatedCounter end={4.6} decimals={1} suffix=" bi" />
              </div>
              <div className="text-green-300 uppercase text-sm tracking-wide">m³ biogás/ano</div>
              <p className="text-green-200 text-sm mt-2">Potencial total estimado</p>
            </div>

            <div className="bg-green-800/50 rounded-xl p-6 border border-green-700/50 text-center hover:bg-green-800/70 transition-colors">
              <div className="text-4xl font-bold text-white mb-2">
                <AnimatedCounter end={6.4} decimals={1} suffix=" M" />
              </div>
              <div className="text-green-300 uppercase text-sm tracking-wide">m³ biometano/dia</div>
              <p className="text-green-200 text-sm mt-2">32% do consumo de gás natural</p>
            </div>

            <div className="bg-green-800/50 rounded-xl p-6 border border-green-700/50 text-center hover:bg-green-800/70 transition-colors">
              <div className="text-4xl font-bold text-white mb-2">
                <AnimatedCounter end={20} suffix=" mil" />
              </div>
              <div className="text-green-300 uppercase text-sm tracking-wide">Empregos</div>
              <p className="text-green-200 text-sm mt-2">Diretos e indiretos</p>
            </div>

            <div className="bg-green-800/50 rounded-xl p-6 border border-green-700/50 text-center hover:bg-green-800/70 transition-colors">
              <div className="text-4xl font-bold text-white mb-2">
                <AnimatedCounter end={181} />
              </div>
              <div className="text-green-300 uppercase text-sm tracking-wide">Plantas de biogás</div>
              <p className="text-green-200 text-sm mt-2">84% sucroenergético</p>
            </div>

            <div className="bg-green-800/50 rounded-xl p-6 border border-green-700/50 text-center hover:bg-green-800/70 transition-colors">
              <div className="text-4xl font-bold text-white mb-2">
                <AnimatedCounter end={5.5} decimals={1} suffix=" M" />
              </div>
              <div className="text-green-300 uppercase text-sm tracking-wide">Hectares de cana</div>
              <p className="text-green-200 text-sm mt-2">50% produção nacional</p>
            </div>

            <div className="bg-green-800/50 rounded-xl p-6 border border-green-700/50 text-center hover:bg-green-800/70 transition-colors">
              <div className="text-4xl font-bold text-white mb-2">
                <AnimatedCounter end={16} suffix="%" />
              </div>
              <div className="text-green-300 uppercase text-sm tracking-wide">Redução GEE</div>
              <p className="text-green-200 text-sm mt-2">Meta climática estadual</p>
            </div>
          </div>
        </div>
      </section>

      {/* Strategic Partnerships */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Parcerias Estratégicas
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Rede de colaboração nacional e internacional para pesquisa e inovação.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {partnerships.map((partner, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 text-sm">{partner.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    partner.type === 'Internacional' ? 'bg-blue-100 text-blue-700' :
                    partner.type === 'Nacional' ? 'bg-green-100 text-green-700' :
                    partner.type === 'Institucional' ? 'bg-amber-100 text-amber-700' :
                    partner.type === 'Associação' ? 'bg-teal-100 text-teal-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {partner.type}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{partner.contact}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NIPE History */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center px-4 py-2 bg-green-100 rounded-full text-green-700 text-sm mb-6">
                <Calendar className="h-4 w-4 mr-2" aria-hidden="true" />
                Desde 1992
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                NIPE/UNICAMP
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                O Núcleo Interdisciplinar de Planejamento Energético é um centro de pesquisa da UNICAMP
                dedicado ao estudo integrado de questões energéticas, ambientais e de desenvolvimento sustentável.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-gray-600">30+ anos de excelência em pesquisa energética</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-gray-600">Equipe multidisciplinar de pesquisadores</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-gray-600">Projetos de impacto nacional e internacional</span>
                </li>
              </ul>
            </div>
            <div className="bg-gray-100 rounded-2xl p-8 text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-green-600 rounded-full mb-6">
                <Building2 className="h-12 w-12 text-white" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Localização</h3>
              <p className="text-gray-600">
                Universidade Estadual de Campinas<br />
                Cidade Universitária Zeferino Vaz<br />
                Campinas, SP - Brasil
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Project Timeline */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Linha do Tempo do Projeto
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Acompanhe os principais marcos do desenvolvimento do PILAR-2b desde o início até a conclusão prevista.
            </p>
          </div>

          <Timeline events={projectTimeline} />
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <NewsletterSignup
            title="Acompanhe o progresso do PILAR-2b"
            description="Receba atualizações sobre o projeto, publicações científicas e eventos do setor de biogás."
          />
        </div>
      </section>

      {/* CTA / Contact Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-green-800 to-emerald-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Mail className="h-12 w-12 mx-auto mb-6 text-green-300" aria-hidden="true" />
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Explore a Plataforma
          </h2>
          <p className="text-lg text-green-200 mb-8 max-w-2xl mx-auto">
            Acesse o dashboard interativo e explore os dados de potencial de biogás de todos os 645 municípios paulistas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-green-900 rounded-lg font-semibold hover:bg-green-50 transition-all duration-300 hover:scale-105"
            >
              Acessar Dashboard
              <ArrowRight className="h-5 w-5 ml-2" aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-green-300 text-green-100 rounded-lg font-semibold hover:bg-green-800/50 transition-all duration-300 hover:scale-105"
            >
              Criar Conta
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
