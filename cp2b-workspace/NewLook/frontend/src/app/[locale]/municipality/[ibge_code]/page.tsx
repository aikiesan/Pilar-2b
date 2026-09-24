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
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/navigation'
import { useFormat } from '@/hooks/useFormat'
import { MISSING_VALUE } from '@/lib/format'
import { SkeletonMunicipalityPage } from '@/components/ui/Skeleton'
import { useGeospatialData, useMunicipalityMetrics } from '@/hooks/useGeospatialData'
import { MWH_PER_M3_CH4 } from '@/lib/mapValues'
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
  FileSpreadsheet,
  FileText,
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

/** Census year of the population figures served by the metrics endpoint. */
const CENSUS_YEAR = 2022

/**
 * The municipality's page on IBGE Cidades. Its slugs drop accents and turn
 * everything that is not a letter or digit into a hyphen: "Santa Bárbara
 * d'Oeste" → "santa-barbara-d-oeste". Lower-casing alone broke every accented
 * name ("são-paulo").
 */
function ibgeCidadesSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const SECTOR_COLORS = {
  agricultural: '#4CAF50',
  livestock: '#FF9800',
  urban: '#2196F3',
}

/**
 * The residues this page reports, by sector, keyed as the backend names them in
 * the Cenário Real/Ideal share columns (migration 029). Display names:
 * Map.residues.<key>, the same names the map uses.
 *
 * Thirteen, not the eleven the map filter offers: `sewage` and `forestry` are
 * computed and stored but not selectable on the map. A municipality profile has
 * no reason to hide them — here the sector subtotals must add up to the total.
 */
const SECTOR_RESIDUES = {
  agricultural: ['sugarcane', 'soybean', 'corn', 'coffee', 'citrus', 'forestry'],
  livestock: ['cattle', 'swine', 'poultry', 'aquaculture'],
  urban: ['rsu', 'rpo', 'sewage'],
} as const

type Sector = keyof typeof SECTOR_RESIDUES
type ResidueKey = (typeof SECTOR_RESIDUES)[Sector][number]

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

function ResidueRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 dark:border-slate-700">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
        {value ?? MISSING_VALUE}
      </span>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

// API origin -- http://localhost:8000 in dev, https://cp2b.unicamp.br/pilar2b in
// production. Paths are appended as /api/v1/..., the same composition
// useGeospatialData uses, so the two cannot drift.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';


export default function MunicipalityPage() {
  const params = useParams()
  const ibgeCode = String(params?.ibge_code ?? '')
  const { data, loading, error } = useGeospatialData()
  // Demographics (population, area, density) are NOT in the map payload — it is
  // served with fields=map, which carries only what the choropleth paints. They
  // come per-municipality from the metrics endpoint, the same one the map's
  // tooltip and profile panel already use.
  const { data: detail } = useMunicipalityMetrics(ibgeCode || null)
  const t = useTranslations('pages')
  const tMap = useTranslations('Map')
  const tCommon = useTranslations('common')
  const format = useFormat()
  const locale = useLocale()

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
  //
  // Every number here comes from the Cenário Real shares (migration 029). This
  // page used to read the legacy `*_biogas_m3_year` columns, which the map
  // payload strips as detail-only — so the whole profile rendered as zeros, and
  // would have kept doing so silently. The shares are also the right source on
  // the merits: they carry the availability correction, and they sum exactly to
  // ch4_real_m3_year, so the subtotals below reconcile with the headline.
  const rec = p as unknown as Record<string, unknown>
  const share = (residue: string, tier: 'real' | 'ideal' = 'real'): number =>
    Number(rec[`ch4_${tier}_${residue}_m3_year`]) || 0
  const sectorTotal = (sector: Sector): number =>
    SECTOR_RESIDUES[sector].reduce((sum, key) => sum + share(key), 0)

  // Methane volumes, compact, with their unit: "1.2M Nm³ CH₄/year".
  const ch4Unit = tCommon('units.nm3_ch4_year')
  const ch4 = (value: number) => `${format.compact(value)} ${ch4Unit}`
  const residueName = (key: ResidueKey) => tMap(`residues.${key}`)

  const total = Number(rec.ch4_real_m3_year) || 0
  const totalIdeal = Number(rec.ch4_ideal_m3_year) || 0
  const agri = sectorTotal('agricultural')
  const live = sectorTotal('livestock')
  const urb = sectorTotal('urban')

  // 9.97 kWh per m³ of METHANE — the platform constant (lib/mapValues), not the
  // ~2.5 kWh/m³ this page used to apply, which is a raw-biogas figure and was
  // being multiplied by a methane volume.
  const energyMWh = total * MWH_PER_M3_CH4

  const sectorPieData = [
    { name: tCommon('sectors.agricultural'), value: agri, color: SECTOR_COLORS.agricultural },
    { name: tCommon('sectors.livestock'), value: live, color: SECTOR_COLORS.livestock },
    { name: tCommon('sectors.urban'), value: urb, color: SECTOR_COLORS.urban },
  ].filter((d) => d.value > 0)

  const residuesBarData = (Object.values(SECTOR_RESIDUES).flat() as ResidueKey[])
    .map((key) => ({ name: residueName(key), value: share(key) }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  // The dossier is rendered by the backend in the page's language.
  const dossierUrl = (kind: 'xlsx' | 'pdf') =>
    `${API_BASE_URL}/api/v1/municipalities/${ibgeCode}/dossie.${kind}?lang=${encodeURIComponent(locale)}`

  const population = (detail?.population as number | undefined) ?? null
  const areaKm2 = (detail?.area_km2 as number | undefined) ?? null
  const density = population && areaKm2 ? Math.round(population / areaKm2) : null

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
        <p className="text-xs text-gray-500">{t('municipality.print_header')}</p>
        <h1 className="text-2xl font-bold mt-1">{p.name} · {t('municipality.print_title')}</h1>
        <p className="text-sm text-gray-500">IBGE: {p.ibge_code} · {p.intermediate_region}</p>
      </div>

      {/* Breadcrumb — outside main for full-width border */}
      <div className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 print:hidden">
        <Breadcrumb items={breadcrumbs} />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:py-4">
        {/* ── Actions ── */}
        <div className="flex items-center justify-end mb-6 print:hidden">
          <div className="flex items-center gap-2">
            <Link
              href={`/map?q=${encodeURIComponent(p.name)}`}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
              {t('municipality.back_to_map')}
            </Link>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
              {tMap('tools.share')}
            </button>
            {/*
              These hit the backend, which renders the real dossier: a six-sheet
              workbook and a report with a vector locator map. The button here
              used to call window.print(), which printed the web page -- close
              enough to look right that nobody noticed the actual export, built
              in #219, was never wired up at all.

              Plain anchors, not fetch + blob: Content-Disposition already names
              the file, so the browser handles the save, keeps its own progress
              UI, and nothing has to buffer a multi-megabyte response in memory.
            */}
            <a
              href={dossierUrl('xlsx')}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
              {t('municipality.download_workbook')}
            </a>
            <a
              href={dossierUrl('pdf')}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-[#1E5128] rounded-lg hover:bg-[#163d1f] transition-colors"
            >
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              {t('municipality.download_report')}
            </a>
          </div>
        </div>

        {/* ── Hero header ── */}
        <div className="bg-gradient-to-r from-[#1E5128] to-[#2C6B3A] text-white rounded-2xl p-6 mb-6 print:rounded-none print:mb-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 text-green-200 text-sm">
                <MapPin className="w-4 h-4" aria-hidden="true" />
                <span>{t('municipality.location_label')}</span>
              </div>
              <h1 className="text-3xl font-bold mb-1">{p.name}</h1>
              <div className="flex items-center gap-3 text-green-100 text-sm">
                <span>IBGE: {p.ibge_code}</span>
                <span>·</span>
                <span>{p.intermediate_region}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-green-300 font-medium mb-1">
                {t('municipality.hero_potential')}
              </div>
              <div className="text-4xl font-bold">{format.compact(total)}</div>
              <div className="text-sm text-green-200">{ch4Unit}</div>
            </div>
          </div>
        </div>

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 print:gap-2 print:mb-4">
          <KPICard
            icon={<Zap className="w-4 h-4" aria-hidden="true" />}
            label={t('municipality.kpi_energy')}
            value={format.compact(energyMWh)}
            unit={tCommon('units.mwh_year')}
            color="bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-900/10 dark:border-yellow-800 dark:text-yellow-100"
          />
          {/* Was "Redução CO₂", computed as volume × 2.0 kg/m³ — a factor with no
              source anywhere in the project, applied to a volume that is methane
              rather than the biogas it assumed. The Ideal tier is served, audited
              (scenario_parameters) and answers a question the reader actually has:
              how much of this is infrastructure rather than resource. */}
          <KPICard
            icon={<Cloud className="w-4 h-4" aria-hidden="true" />}
            label={t('municipality.kpi_ideal')}
            value={format.compact(totalIdeal)}
            unit={ch4Unit}
            color="bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/10 dark:border-blue-800 dark:text-blue-100"
          />
          <KPICard
            icon={<Users className="w-4 h-4" aria-hidden="true" />}
            label={t('municipality.kpi_population')}
            value={format.number(population)}
            unit={t('municipality.inhabitants', { year: CENSUS_YEAR })}
            color="bg-purple-50 border-purple-200 text-purple-900 dark:bg-purple-900/10 dark:border-purple-800 dark:text-purple-100"
          />
          <KPICard
            icon={<Maximize className="w-4 h-4" aria-hidden="true" />}
            label={t('municipality.kpi_area')}
            value={format.number(areaKm2)}
            unit={`${tCommon('units.km2')} · ${density ? `${format.number(density)} ${tCommon('units.inhab_km2')}` : MISSING_VALUE}`}
            color="bg-green-50 border-green-200 text-green-900 dark:bg-green-900/10 dark:border-green-800 dark:text-green-100"
          />
        </div>

        {/* ── Charts row ── */}
        <div className="grid md:grid-cols-2 gap-6 mb-6 print:gap-4 print:mb-4">
          {/* Sector breakdown pie */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-green-600" aria-hidden="true" />
              {t('municipality.sector_distribution')}
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
                    label={({ name, percent }) => `${name} ${format.percent((percent ?? 0) * 100, { decimals: 0 })}`}
                    labelLine={false}
                  >
                    {sectorPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [ch4(typeof v === 'number' ? v : 0), '']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">{t('municipality.no_sector_data')}</p>
            )}
          </div>

          {/* Residues bar chart */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" aria-hidden="true" />
              {t('municipality.potential_by_residue')}
            </h2>
            {residuesBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={residuesBarData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => format.compact(v)} />
                  {/* Full residue names, the same as the tables below: a wider axis
                      instead of a second, abbreviated vocabulary. */}
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                  <Tooltip formatter={(v) => [ch4(typeof v === 'number' ? v : 0), t('municipality.potential')]} />
                  <Bar dataKey="value" fill="#4CAF50" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">{t('municipality.no_residue_data')}</p>
            )}
          </div>
        </div>

        {/* ── Detailed tables ── */}
        <div className="grid md:grid-cols-3 gap-6 mb-6 print:gap-4">
          {/* Agricultural */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
            <h2 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
              <Leaf className="w-4 h-4" aria-hidden="true" />
              {t('municipality.residue_agricultural')}
            </h2>
            {SECTOR_RESIDUES.agricultural.map((key) => (
              <ResidueRow key={key} label={residueName(key)} value={share(key) > 0 ? ch4(share(key)) : null} />
            ))}
            <div className="mt-3 pt-2 border-t border-gray-100 dark:border-slate-700">
              <div className="flex justify-between text-xs font-bold text-green-700 dark:text-green-400">
                <span>{t('municipality.subtotal_agricultural')}</span>
                <span>{ch4(agri)}</span>
              </div>
            </div>
          </div>

          {/* Livestock */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
            <h2 className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-3 flex items-center gap-2">
              <Factory className="w-4 h-4" aria-hidden="true" />
              {t('municipality.residue_livestock')}
            </h2>
            {SECTOR_RESIDUES.livestock.map((key) => (
              <ResidueRow key={key} label={residueName(key)} value={share(key) > 0 ? ch4(share(key)) : null} />
            ))}
            <div className="mt-3 pt-2 border-t border-gray-100 dark:border-slate-700">
              <div className="flex justify-between text-xs font-bold text-orange-700 dark:text-orange-400">
                <span>{t('municipality.subtotal_livestock')}</span>
                <span>{ch4(live)}</span>
              </div>
            </div>
          </div>

          {/* Urban */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
            <h2 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-2">
              <Droplets className="w-4 h-4" aria-hidden="true" />
              {t('municipality.residue_urban')}
            </h2>
            {SECTOR_RESIDUES.urban.map((key) => (
              <ResidueRow key={key} label={residueName(key)} value={share(key) > 0 ? ch4(share(key)) : null} />
            ))}
            <div className="mt-3 pt-2 border-t border-gray-100 dark:border-slate-700">
              <div className="flex justify-between text-xs font-bold text-blue-700 dark:text-blue-400">
                <span>{t('municipality.subtotal_urban')}</span>
                <span>{ch4(urb)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── External links ── */}
        <div className="flex flex-wrap gap-3 print:hidden">
          <a
            href={`https://cidades.ibge.gov.br/brasil/sp/${ibgeCidadesSlug(p.name)}/panorama`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-blue-600" aria-hidden="true" />
            {t('municipality.view_ibge')}
          </a>
          <Link
            href={`/dashboard/advanced-analysis?q=${encodeURIComponent(p.name)}`}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-green-600" aria-hidden="true" />
            {t('municipality.go_advanced')}
          </Link>
          <Link
            href="/dashboard/proximity"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <MapPin className="w-4 h-4 text-purple-600" aria-hidden="true" />
            {t('municipality.go_proximity')}
          </Link>
        </div>

        {/* ── Print footer ── */}
        <div className="hidden print:block mt-8 pt-4 border-t text-xs text-gray-400">
          <p>{t('municipality.print_sources')}</p>
          {/* Guarded: a bare `window` would throw if this ever rendered on the server. */}
          <p>PILAR-2b BiogasAtlas · {format.date(new Date())} · {typeof window !== 'undefined' ? window.location.href : ''}</p>
        </div>
      </div>
    </div>
  )
}
