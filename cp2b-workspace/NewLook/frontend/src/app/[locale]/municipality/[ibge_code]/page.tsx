'use client'

/**
 * Municipality Deep-Dive Page
 * Shareable, printable profile page for each of the 645 São Paulo municipalities.
 * Route: /[locale]/municipality/[ibge_code]
 *
 * Shows:
 *  - Biogas potential total + sector breakdown
 *  - Residue-level detail table
 *  - Demographics
 *  - Links: IBGE, map (filtered), comparison
 *  - Print-friendly layout
 */

import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/navigation'
import { SkeletonMunicipalityPage } from '@/components/ui/Skeleton'
import { useGeospatialData } from '@/hooks/useGeospatialData'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs'
import {
  MapPin,
  Users,
  Maximize,
  TrendingUp,
  Leaf,
  Factory,
  Droplets,
  Printer,
  ExternalLink,
  Share2,
  BarChart3,
  Zap,
  Cloud,
  ArrowLeft,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBig(value: number | undefined | null): string {
  if (!value && value !== 0) return 'N/A'
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toFixed(0)
}

function formatNum(value: number | undefined | null): string {
  if (!value && value !== 0) return 'N/A'
  return value.toLocaleString('pt-BR')
}

const SECTOR_COLORS = {
  agricultural: '#4CAF50',
  livestock: '#FF9800',
  urban: '#2196F3',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KPICard({
  icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  unit: string
  color: string
}) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs opacity-60 mt-0.5">{unit}</div>
    </div>
  )
}

function ResidueRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 dark:border-slate-700">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
        {value > 0 ? `${formatBig(value)} m³/ano` : '—'}
      </span>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MunicipalityPage() {
  const params = useParams()
  const ibgeCode = String(params?.ibge_code ?? '')
  const { data, loading, error } = useGeospatialData()
  const t = useTranslations('pages')
  const tMap = useTranslations('Map')

  const municipality = useMemo(() => {
    if (!data) return null
    return data.features.find(
      (f) => String(f.properties.ibge_code) === ibgeCode
    ) ?? null
  }, [data, ibgeCode])

  // Hook must be called unconditionally (before any conditional return)
  const breadcrumbs = useBreadcrumbs({ municipalityName: municipality?.properties?.name })

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SkeletonMunicipalityPage />
    )
  }

  // ── Error / Not found ─────────────────────────────────────────────────────
  if (error || !municipality) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <div className="flex items-center justify-center h-[70vh]">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">🏙️</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {t('municipality.not_found')}
            </h2>
            <p className="text-gray-500 mb-6">
              {t('municipality.not_found_desc', { code: ibgeCode })}
            </p>
            <Link
              href="/map"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1E5128] text-white rounded-xl hover:bg-[#163d1f] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('municipality.back_to_map')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const p = municipality.properties

  // ── Derived values ────────────────────────────────────────────────────────
  const total = p.total_biogas_m3_year || 0
  const agri = p.agricultural_biogas_m3_year || 0
  const live = p.livestock_biogas_m3_year || 0
  const urb = p.urban_biogas_m3_year || 0

  // Energy equivalent: ~2.5 kWh per m³ biogas → MWh/year
  const energyMWh = (total * 2.5) / 1000
  // CO2 reduction: ~2.0 kg CO2 per m³ biogas
  const co2Tons = (total * 2.0) / 1000

  const sectorPieData = [
    { name: 'Agrícola', value: agri, color: SECTOR_COLORS.agricultural },
    { name: 'Pecuária', value: live, color: SECTOR_COLORS.livestock },
    { name: 'Urbano', value: urb, color: SECTOR_COLORS.urban },
  ].filter((d) => d.value > 0)

  const residuesBarData = [
    { name: 'Cana', value: p.sugarcane_biogas_m3_year || 0 },
    { name: 'Soja', value: p.soybean_biogas_m3_year || 0 },
    { name: 'Milho', value: p.corn_biogas_m3_year || 0 },
    { name: 'Café', value: p.coffee_biogas_m3_year || 0 },
    { name: 'Citrus', value: p.citrus_biogas_m3_year || 0 },
    { name: 'Bovinos', value: p.cattle_biogas_m3_year || 0 },
    { name: 'Suínos', value: p.swine_biogas_m3_year || 0 },
    { name: 'Aves', value: p.poultry_biogas_m3_year || 0 },
    { name: 'Aquicult.', value: p.aquaculture_biogas_m3_year || 0 },
    { name: 'RSU', value: p.rsu_biogas_m3_year || 0 },
    { name: 'RPO', value: p.rpo_biogas_m3_year || 0 },
  ].filter((d) => d.value > 0).sort((a, b) => b.value - a.value)

  const density =
    p.population && p.area_km2
      ? Math.round(p.population / p.area_km2)
      : null

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: `${p.name} — PILAR-2b BiogasAtlas`, url: window.location.href })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert(t('municipality.copy_url'))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 print:bg-white">
      {/* Print header — only in print */}
      <div className="hidden print:block px-8 pt-6 pb-2 border-b">
        <p className="text-xs text-gray-500">PILAR-2b BiogasAtlas · NIPE-UNICAMP · FAPESP 2025/08745-2</p>
        <h1 className="text-2xl font-bold mt-1">{p.name} · Perfil de Biogás</h1>
        <p className="text-sm text-gray-500">IBGE: {p.ibge_code} · {p.intermediate_region}</p>
      </div>

      {/* Breadcrumb — outside main for full-width border */}
      <div className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 print:hidden">
        <Breadcrumb items={breadcrumbs} />
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:py-4">
        {/* ── Actions ── */}
        <div className="flex items-center justify-end mb-6 print:hidden">
          <div className="flex items-center gap-2">
            <Link
              href={`/map?q=${encodeURIComponent(p.name)}`}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5" />
              {t('municipality.back_to_map')}
            </Link>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              {tMap('tools.share')}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-[#1E5128] rounded-lg hover:bg-[#163d1f] transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              PDF
            </button>
          </div>
        </div>

        {/* ── Hero header ── */}
        <div className="bg-gradient-to-r from-[#1E5128] to-[#2C6B3A] text-white rounded-2xl p-6 mb-6 print:rounded-none print:mb-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 text-green-200 text-sm">
                <MapPin className="w-4 h-4" />
                <span>Município de São Paulo</span>
              </div>
              <h1 className="text-3xl font-bold mb-1">{p.name}</h1>
              <div className="flex items-center gap-3 text-green-100 text-sm">
                <span>IBGE: {p.ibge_code}</span>
                <span>·</span>
                <span>{p.intermediate_region}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-green-300 font-medium mb-1">Potencial Total</div>
              <div className="text-4xl font-bold">{formatBig(total)}</div>
              <div className="text-sm text-green-200">m³ biogás/ano</div>
            </div>
          </div>
        </div>

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 print:gap-2 print:mb-4">
          <KPICard
            icon={<Zap className="w-4 h-4" />}
            label="Energia Equiv."
            value={formatBig(energyMWh)}
            unit="MWh/ano"
            color="bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-900/10 dark:border-yellow-800 dark:text-yellow-100"
          />
          <KPICard
            icon={<Cloud className="w-4 h-4" />}
            label="Redução CO₂"
            value={formatBig(co2Tons)}
            unit="ton CO₂/ano"
            color="bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/10 dark:border-blue-800 dark:text-blue-100"
          />
          <KPICard
            icon={<Users className="w-4 h-4" />}
            label="População"
            value={formatNum(p.population)}
            unit="habitantes (2022)"
            color="bg-purple-50 border-purple-200 text-purple-900 dark:bg-purple-900/10 dark:border-purple-800 dark:text-purple-100"
          />
          <KPICard
            icon={<Maximize className="w-4 h-4" />}
            label="Área"
            value={formatNum(p.area_km2)}
            unit={`km² · ${density ? formatNum(density) + ' hab/km²' : '—'}`}
            color="bg-green-50 border-green-200 text-green-900 dark:bg-green-900/10 dark:border-green-800 dark:text-green-100"
          />
        </div>

        {/* ── Charts row ── */}
        <div className="grid md:grid-cols-2 gap-6 mb-6 print:gap-4 print:mb-4">
          {/* Sector breakdown pie */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-green-600" />
              Distribuição por Setor
            </h2>
            {sectorPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={sectorPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {sectorPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${formatBig(typeof v === 'number' ? v : 0)} m³/ano`, '']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">Sem dados de setores</p>
            )}
          </div>

          {/* Residues bar chart */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Potencial por Resíduo
            </h2>
            {residuesBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={residuesBarData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => formatBig(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={55} />
                  <Tooltip formatter={(v) => [`${formatBig(typeof v === 'number' ? v : 0)} m³/ano`, 'Potencial']} />
                  <Bar dataKey="value" fill="#4CAF50" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">Sem dados de resíduos</p>
            )}
          </div>
        </div>

        {/* ── Detailed tables ── */}
        <div className="grid md:grid-cols-3 gap-6 mb-6 print:gap-4">
          {/* Agricultural */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
            <h2 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
              <Leaf className="w-4 h-4" />
              Resíduos Agrícolas
            </h2>
            <ResidueRow label="Cana-de-açúcar" value={p.sugarcane_biogas_m3_year || 0} />
            <ResidueRow label="Soja" value={p.soybean_biogas_m3_year || 0} />
            <ResidueRow label="Milho" value={p.corn_biogas_m3_year || 0} />
            <ResidueRow label="Café" value={p.coffee_biogas_m3_year || 0} />
            <ResidueRow label="Citrus" value={p.citrus_biogas_m3_year || 0} />
            <div className="mt-3 pt-2 border-t border-gray-100 dark:border-slate-700">
              <div className="flex justify-between text-xs font-bold text-green-700 dark:text-green-400">
                <span>Subtotal Agrícola</span>
                <span>{formatBig(agri)} m³/ano</span>
              </div>
            </div>
          </div>

          {/* Livestock */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
            <h2 className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-3 flex items-center gap-2">
              <Factory className="w-4 h-4" />
              Resíduos Pecuários
            </h2>
            <ResidueRow label="Bovinos" value={p.cattle_biogas_m3_year || 0} />
            <ResidueRow label="Suínos" value={p.swine_biogas_m3_year || 0} />
            <ResidueRow label="Aves" value={p.poultry_biogas_m3_year || 0} />
            <ResidueRow label="Aquicultura" value={p.aquaculture_biogas_m3_year || 0} />
            <div className="mt-3 pt-2 border-t border-gray-100 dark:border-slate-700">
              <div className="flex justify-between text-xs font-bold text-orange-700 dark:text-orange-400">
                <span>Subtotal Pecuária</span>
                <span>{formatBig(live)} m³/ano</span>
              </div>
            </div>
          </div>

          {/* Urban */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
            <h2 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-2">
              <Droplets className="w-4 h-4" />
              Resíduos Urbanos
            </h2>
            <ResidueRow label="RSU (Resíduos Sólidos)" value={p.rsu_biogas_m3_year || 0} />
            <ResidueRow label="RPO (Resíduos Orgânicos)" value={p.rpo_biogas_m3_year || 0} />
            <div className="mt-3 pt-2 border-t border-gray-100 dark:border-slate-700">
              <div className="flex justify-between text-xs font-bold text-blue-700 dark:text-blue-400">
                <span>Subtotal Urbano</span>
                <span>{formatBig(urb)} m³/ano</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── External links ── */}
        <div className="flex flex-wrap gap-3 print:hidden">
          <a
            href={`https://cidades.ibge.gov.br/brasil/sp/${p.name.toLowerCase().replace(/\s+/g, '-')}/panorama`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-blue-600" />
            Ver dados no IBGE Cidades
          </a>
          <Link
            href={`/dashboard/advanced-analysis?q=${encodeURIComponent(p.name)}`}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-green-600" />
            Análise Avançada
          </Link>
          <Link
            href="/dashboard/proximity"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <MapPin className="w-4 h-4 text-purple-600" />
            Análise de Proximidade
          </Link>
        </div>

        {/* ── Print footer ── */}
        <div className="hidden print:block mt-8 pt-4 border-t text-xs text-gray-400">
          <p>Fonte: IBGE PAM/PPM 2024, SNIS 2023, MapBiomas 10.0, ANP, EPE. Metodologia: FDE — NIPE-UNICAMP.</p>
          <p>PILAR-2b BiogasAtlas · {new Date().toLocaleDateString('pt-BR')} · {window?.location?.href}</p>
        </div>
      </main>
    </div>
  )
}
