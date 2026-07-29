'use client';

/**
 * Results Display Cards for Proximity Analysis
 * Sprint 3 Task 3.3: Complete results visualization with 4 cards
 */
import { useState } from 'react';
import {
  MapPin,
  Zap,
  TreeDeciduous,
  Factory,
  ChevronDown,
  ChevronUp,
  Home,
  Leaf,
  Flame,
  FlaskConical,
  Link2
} from 'lucide-react';
import type { ProximityAnalysisResponse } from '@/services/proximityApi';
import MethodologyReviewNotice from '@/components/ui/MethodologyReviewNotice';

interface ResultsCardsProps {
  results: ProximityAnalysisResponse;
}

export default function ResultsCards({ results }: ResultsCardsProps) {
  return (
    <div className="mt-6 space-y-4 print:space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 print:text-3xl">Resultados da Análise</h2>
      <MethodologyReviewNotice />
      
      {/* Quick Stats Grid */}
      <QuickStatsGrid results={results} />
      
      {/* Main Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:gap-6">
        <MunicipalitiesCard results={results} />
        <BiogasCard results={results} />
        <LandUseCard results={results} />
        <InfrastructureCard results={results} />
        <ResiduosCorrelationCard results={results} />
      </div>
    </div>
  );
}

/**
 * Quick Stats Grid - Summary metrics at a glance
 */
function QuickStatsGrid({ results }: { results: ProximityAnalysisResponse }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:gap-6">
      <StatCard
        icon={<MapPin className="h-6 w-6" />}
        label="Municípios"
        value={results.summary.total_municipalities.toString()}
        color="purple"
      />
      <StatCard
        icon={<Home className="h-6 w-6" />}
        label="População"
        value={formatNumber(results.summary.total_population)}
        color="blue"
      />
      <StatCard
        icon={<Zap className="h-6 w-6" />}
        label="Biogás Total"
        value={`${(results.summary.total_biogas_m3_year / 1_000_000).toFixed(2)}M`}
        subtitle="m³/ano"
        color="green"
      />
      <StatCard
        icon={<TreeDeciduous className="h-6 w-6" />}
        label="Uso Agrícola"
        value={`${(results.land_use?.agricultural_percent || 0).toFixed(1)}%`}
        color="orange"
      />
    </div>
  );
}

/**
 * Stat Card Component
 */
function StatCard({ 
  icon, 
  label, 
  value, 
  subtitle, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  subtitle?: string;
  color: 'purple' | 'blue' | 'green' | 'orange';
}) {
  const colorClasses = {
    purple: 'text-purple-600 bg-purple-50',
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    orange: 'text-orange-600 bg-orange-50',
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 print:shadow-none print:border-2">
      <div className={`inline-flex p-2 rounded-lg ${colorClasses[color]} mb-2`}>
        {icon}
      </div>
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${colorClasses[color].split(' ')[0]}`}>
        {value}
      </div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}

/**
 * Card 1: Municipalities in Radius
 */
function MunicipalitiesCard({ results }: { results: ProximityAnalysisResponse }) {
  const [expanded, setExpanded] = useState(false);
  const displayLimit = 5;
  const municipalities = results.municipalities;
  const hasMore = municipalities.length > displayLimit;

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 print:shadow-none print:border-2 print:break-inside-avoid">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-purple-600" />
            Municípios no Raio
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {municipalities.length} municípios • População total: {formatNumber(results.summary.total_population)}
          </p>
        </div>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto print:max-h-none">
        {municipalities
          .slice(0, expanded ? undefined : displayLimit)
          .map((mun, idx) => (
            <MunicipalityRow key={idx} municipality={mun} />
          ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 w-full py-2 text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center justify-center gap-1 transition-colors print:hidden"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Mostrar menos
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Mostrar todos ({municipalities.length - displayLimit} mais)
            </>
          )}
        </button>
      )}
    </div>
  );
}

function MunicipalityRow({ municipality }: { municipality: any }) {
  return (
    <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
      <div>
        <span className="font-medium text-gray-900">{municipality.name}</span>
        {municipality.population && (
          <span className="text-xs text-gray-500 ml-2">
            Pop: {formatNumber(municipality.population)}
          </span>
        )}
      </div>
      <div className="text-right">
        <span className="text-sm font-semibold text-purple-600">
          {municipality.distance_km.toFixed(1)} km
        </span>
        {municipality.biogas_m3_year > 0 && (
          <span className="block text-xs text-gray-500">
            {(municipality.biogas_m3_year / 1000).toFixed(0)}k m³/ano
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Card 2: Biogas Potential with Pie Chart
 */
function BiogasCard({ results }: { results: ProximityAnalysisResponse }) {
  const [showDetail, setShowDetail] = useState(false);
  const biogas = results.biogas_potential;
  const total = biogas.total;

  // Calculate percentages for pie chart
  const categories = [
    { 
      name: 'Agrícola', 
      value: biogas.agricultural, 
      color: '#22C55E',
      icon: <Leaf className="h-4 w-4" />
    },
    { 
      name: 'Pecuário', 
      value: biogas.livestock, 
      color: '#F59E0B',
      icon: <Factory className="h-4 w-4" />
    },
    { 
      name: 'Urbano', 
      value: biogas.urban, 
      color: '#3B82F6',
      icon: <Home className="h-4 w-4" />
    },
  ];

  // Calculate energy equivalent
  const energyMwh = (total * 6.5) / 1000; // 6.5 kWh/m³
  const homesPowered = Math.floor(energyMwh * 1000 / (150 * 12)); // 150 kWh/month per home

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 print:shadow-none print:border-2 print:break-inside-avoid">
      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
        <Zap className="h-5 w-5 text-green-600" />
        Potencial de Biogás
      </h3>

      {/* Total */}
      <div className="mb-4 p-4 bg-green-50 rounded-lg">
        <div className="text-sm text-gray-600 mb-1">Total Anual</div>
        <div className="text-3xl font-bold text-green-600">
          {(total / 1_000_000).toFixed(2)}M
        </div>
        <div className="text-sm text-gray-600">m³/ano</div>
      </div>

      {/* Energy Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">Energia Equivalente</div>
          <div className="text-lg font-bold text-blue-600">
            {energyMwh.toFixed(1)} MWh
          </div>
          <div className="text-xs text-gray-500">por ano</div>
        </div>
        <div className="p-3 bg-purple-50 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">Casas Atendidas</div>
          <div className="text-lg font-bold text-purple-600">
            {formatNumber(homesPowered)}
          </div>
          <div className="text-xs text-gray-500">residências</div>
        </div>
      </div>

      {/* Breakdown by Category */}
      <div className="space-y-2">
        {categories.map((cat, idx) => {
          const percentage = total > 0 ? (cat.value / total) * 100 : 0;
          return (
            <div key={idx}>
              <div className="flex justify-between items-center text-sm mb-1">
                <span className="flex items-center gap-1 text-gray-700">
                  {cat.icon}
                  {cat.name}
                </span>
                <span className="font-semibold" style={{ color: cat.color }}>
                  {percentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: cat.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Breakdown Toggle */}
      <button
        onClick={() => setShowDetail(!showDetail)}
        className="mt-4 w-full py-2 text-sm text-green-600 hover:text-green-700 font-medium flex items-center justify-center gap-1 transition-colors print:hidden"
      >
        {showDetail ? (
          <>
            <ChevronUp className="h-4 w-4" />
            Ocultar detalhes
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4" />
            Ver breakdown detalhado
          </>
        )}
      </button>

      {showDetail && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
          <DetailRow label="Agrícola" value={biogas.agricultural} />
          <DetailRow label="Pecuário" value={biogas.livestock} />
          <DetailRow label="Urbano" value={biogas.urban} />
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-mono text-gray-900">
        {(value / 1_000_000).toFixed(3)}M m³/ano
      </span>
    </div>
  );
}

/**
 * Card 3: Land Use (MapBiomas) - Enhanced with all classes
 */
function LandUseCard({ results }: { results: ProximityAnalysisResponse }) {
  const [showAll, setShowAll] = useState(false);
  const landUse = results.land_use;

  // Convert by_class object to sorted array
  const byClass = landUse?.by_class || {};
  const classArray = Object.entries(byClass)
    .map(([classId, data]: [string, any]) => ({
      class_id: parseInt(classId),
      name: data.name,
      color: data.color,
      category: data.category,
      area_km2: data.area_km2 || 0,
      percent: data.percent || 0,
      pixel_count: data.pixel_count || 0,
    }))
    .sort((a, b) => b.area_km2 - a.area_km2);

  const displayLimit = 6;
  const hasMore = classArray.length > displayLimit;
  const displayClasses = showAll ? classArray : classArray.slice(0, displayLimit);

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 print:shadow-none print:border-2 print:break-inside-avoid">
      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
        <TreeDeciduous className="h-5 w-5 text-orange-600" />
        Uso do Solo (MapBiomas)
      </h3>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-orange-50 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">Área Total</div>
          <div className="text-lg font-bold text-orange-600">
            {(landUse?.total_area_km2 || 0).toFixed(1)} km²
          </div>
        </div>
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">Uso Agrícola</div>
          <div className="text-lg font-bold text-green-600">
            {(landUse?.agricultural_percent || 0).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Dominant Class */}
      {landUse?.dominant_class && (
        <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="text-xs text-gray-600 mb-1">Classe Dominante</div>
          <div className="text-sm font-semibold text-yellow-800">
            {landUse.dominant_class}
          </div>
        </div>
      )}

      {/* Stacked Bar Chart */}
      {classArray.length > 0 ? (
        <>
          <div className="mb-3">
            <div className="text-xs text-gray-500 mb-1">Distribuição de Classes</div>
            <div className="flex h-6 rounded-lg overflow-hidden">
              {classArray.map((lu, idx) => (
                <div
                  key={idx}
                  className="transition-all duration-300 hover:opacity-80"
                  style={{
                    width: `${lu.percent}%`,
                    backgroundColor: lu.color,
                    minWidth: lu.percent > 0.5 ? '2px' : '0px',
                  }}
                  title={`${lu.name}: ${lu.percent.toFixed(1)}%`}
                />
              ))}
            </div>
          </div>

          {/* Legend with all classes */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {displayClasses.map((lu, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm py-1 hover:bg-gray-50 rounded px-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded flex-shrink-0"
                    style={{ backgroundColor: lu.color }}
                  />
                  <span className="text-gray-700 text-xs">{lu.name}</span>
                  {lu.category === 'agricultural' && (
                    <span className="text-xs px-1 py-0.5 bg-green-100 text-green-700 rounded">
                      Agro
                    </span>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="font-semibold text-gray-900 text-xs">
                    {lu.percent.toFixed(1)}%
                  </span>
                  <span className="text-xs text-gray-500 ml-1">
                    ({lu.area_km2.toFixed(2)} km²)
                  </span>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-3 w-full py-2 text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center justify-center gap-1 transition-colors print:hidden"
            >
              {showAll ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Mostrar menos
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Ver todas as {classArray.length} classes
                </>
              )}
            </button>
          )}
        </>
      ) : (
        <div className="text-center py-6 text-gray-500">
          <TreeDeciduous className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Dados de uso do solo não disponíveis</p>
        </div>
      )}
    </div>
  );
}

/**
 * Card 4: Infrastructure Proximity
 */
function InfrastructureCard({ results }: { results: ProximityAnalysisResponse }) {
  const infrastructure = results.infrastructure || [];

  const infraIcons: Record<string, { icon: React.ReactNode; label: string }> = {
    gas_pipeline: { icon: <Flame className="h-4 w-4" />, label: '🔥 Gasoduto' },
    substation: { icon: <Zap className="h-4 w-4" />, label: '⚡ Subestação' },
    railway: { icon: '🛣️', label: '🛣️ Rodovia' },
    transmission_line: { icon: '🔌', label: '🔌 Linha de Transmissão' },
    ete: { icon: '💧', label: '💧 ETE' },
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 print:shadow-none print:border-2 print:break-inside-avoid">
      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
        <Factory className="h-5 w-5 text-blue-600" />
        Infraestrutura Próxima
      </h3>

      {infrastructure.length > 0 ? (
        <div className="space-y-3">
          {infrastructure.map((infra, idx) => {
            const iconData = infraIcons[infra.type] || { icon: '🏭', label: infra.type };
            const isFound = infra.distance_km !== undefined && infra.distance_km !== null;
            
            return (
              <div
                key={idx}
                className={`p-3 rounded-lg border-2 ${
                  isFound 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{iconData.icon}</span>
                      <span className="font-medium text-gray-900">
                        {typeof iconData.label === 'string' ? iconData.label : infra.type}
                      </span>
                    </div>
                    {isFound ? (
                      <>
                        {infra.name && (
                          <div className="text-sm text-gray-600">{infra.name}</div>
                        )}
                        <div className="text-xs text-green-700 mt-1 font-semibold">
                          ✓ Encontrado a {infra.distance_km?.toFixed(1)} km
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-gray-500 mt-1">
                        Não encontrado no raio especificado
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500">
          <Factory className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Dados de infraestrutura não disponíveis</p>
        </div>
      )}
    </div>
  );
}

/**
 * Card 5: Residuos Correlation (MapBiomas to Biogas Sources)
 */
function ResiduosCorrelationCard({ results }: { results: ProximityAnalysisResponse }) {
  const [expanded, setExpanded] = useState(false);
  const correlation = (results as any).residuos_correlation;

  if (!correlation || !correlation.correlations || correlation.correlations.length === 0) {
    return null;
  }

  const correlations = correlation.correlations;
  const displayLimit = 4;
  const hasMore = correlations.length > displayLimit;
  const displayItems = expanded ? correlations : correlations.slice(0, displayLimit);

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 print:shadow-none print:border-2 print:break-inside-avoid lg:col-span-2">
      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
        <Link2 className="h-5 w-5 text-teal-600" />
        Correlação Uso do Solo → Resíduos
      </h3>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-teal-50 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">Fontes Identificadas</div>
          <div className="text-lg font-bold text-teal-600">
            {correlation.total_potential_sources}
          </div>
        </div>
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">Biogás Estimado</div>
          <div className="text-lg font-bold text-green-600">
            {((correlation.total_estimated_biogas_m3_year || 0) / 1000).toFixed(1)}k
          </div>
          <div className="text-xs text-gray-500">m³/ano</div>
        </div>
      </div>

      {/* Correlation Items */}
      <div className="space-y-3">
        {displayItems.map((item: any, idx: number) => (
          <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium text-gray-900 text-sm">
                  {item.mapbiomas_class_name}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-teal-600">
                  {item.percent_of_buffer.toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500 ml-1">
                  ({item.area_km2.toFixed(2)} km²)
                </span>
              </div>
            </div>

            {item.description && (
              <p className="text-xs text-gray-600 mb-2">{item.description}</p>
            )}

            {/* Matched Residuos */}
            {item.matched_residuos && item.matched_residuos.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <FlaskConical className="h-3 w-3" />
                  Resíduos Associados:
                </div>
                <div className="flex flex-wrap gap-1">
                  {item.matched_residuos.map((residuo: any, ridx: number) => (
                    <span
                      key={ridx}
                      className="text-xs px-2 py-1 bg-white rounded border border-gray-200"
                      title={`BMP: ${residuo.bmp_medio || 'N/A'} ${residuo.bmp_unidade || 'm³/t VS'}`}
                    >
                      {residuo.nome}
                      {residuo.bmp_medio && (
                        <span className="text-gray-400 ml-1">
                          ({residuo.bmp_medio.toFixed(0)} m³/t)
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Estimated Biogas */}
            {item.estimated_biogas_m3_year && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Biogás Estimado:</span>
                  <span className="text-xs font-semibold text-green-600">
                    {(item.estimated_biogas_m3_year / 1000).toFixed(1)}k m³/ano
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 w-full py-2 text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center justify-center gap-1 transition-colors print:hidden"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Mostrar menos
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Ver todas as {correlations.length} correlações
            </>
          )}
        </button>
      )}

      {/* Note */}
      {correlation.note && (
        <p className="mt-3 text-xs text-gray-500 italic">{correlation.note}</p>
      )}
    </div>
  );
}

// Utility functions
function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}k`;
  }
  return num.toString();
}

