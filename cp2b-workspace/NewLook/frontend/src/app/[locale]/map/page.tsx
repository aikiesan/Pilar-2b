/**
 * PILAR-2b V3 - Public Interactive Map
 * Accessible to all visitors - showcases biogas potential data
 * Same functionality as dashboard but without authentication requirement
 */

'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import type { FilterCriteria } from '@/components/dashboard/FilterPanel'
import type { BiomassType } from '@/components/map/FloatingControlPanel'

function MapLoadingSkeleton() {
  const t = useTranslations('Map')
  return (
    <div className="w-full h-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E5128] dark:border-emerald-500 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">{t('loading_map')}</p>
      </div>
    </div>
  )
}

// Dynamically import Map component to avoid SSR issues
const MapComponent = dynamic(() => import('@/components/map/MapComponent'), {
  ssr: false,
  loading: () => <MapLoadingSkeleton />,
})

export default function PublicMapPage() {
  // Map state
  const [biomassType, setBiomassType] = useState<BiomassType>('total')
  const [opacity, setOpacity] = useState(0.7)
  const [searchQuery, setSearchQuery] = useState('')

  // Filter state
  const [activeFilters, setActiveFilters] = useState<FilterCriteria>({
    residueTypes: [],
    regions: [],
    searchQuery: '',
    nearRailway: false,
    nearPipeline: false,
    nearSubstation: false,
    proximityRadius: 50
  })

  return (
    <div className="h-[calc(100dvh-64px)] flex flex-col bg-gray-50 dark:bg-slate-900 transition-colors overflow-hidden">
      {/* Full-Page Map */}
      {/*
        min-h-0 é obrigatório, não decorativo. Um item flex tem
        `min-height: auto`, que o impede de encolher abaixo do próprio conteúdo:
        sem isso, este <main> media 856px dentro de um pai de 656px, a barra
        lateral herdava a altura estourada e o `overflow-y-auto` interno dela
        nunca engatava — as últimas camadas simplesmente ficavam fora da tela,
        sem barra de rolagem. Só apareceu quando a aba Camadas passou de 11 para
        20 itens; com a lista curta, o vazamento cabia na viewport e não se via.
      */}
      <main className="flex-1 relative min-h-0">
        <MapComponent
          activeFilters={activeFilters}
          biomassType={biomassType}
          onBiomassTypeChange={setBiomassType}
          opacity={opacity}
          onOpacityChange={setOpacity}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </main>
    </div>
  )
}
