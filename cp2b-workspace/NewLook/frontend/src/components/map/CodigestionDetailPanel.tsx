'use client';

import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp, FlaskConical } from 'lucide-react';
import type { CodigestionCluster, CodigestionPair } from '@/types/geospatial';

interface CodigestionDetailPanelProps {
  cluster: CodigestionCluster | null;
  onClose: () => void;
  visible: boolean;
}

const CN_OPTIMAL_LOW  = 20;
const CN_OPTIMAL_HIGH = 30;
const CN_BAR_MAX      = 160;  // max C:N shown on bar

const numberValue = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCompact = (value: number) =>
  value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` :
  value >= 1_000     ? `${(value / 1_000).toFixed(1)}K` :
  Math.round(value).toLocaleString('pt-BR');

const formatPairAmount = (pair: CodigestionPair) => {
  const biomassTons = numberValue(pair.combined_biomass_tons_year);
  if (biomassTons > 0) return `${formatCompact(biomassTons)} t/ano`;

  return `${formatCompact(numberValue(pair.combined_biogas_m3_year))} m³/ano`;
};

function CNRatioBar({ cn, label, role }: { cn: number; label: string; role: string }) {
  const pct = Math.min((cn / CN_BAR_MAX) * 100, 100);
  const optLow  = (CN_OPTIMAL_LOW  / CN_BAR_MAX) * 100;
  const optHigh = (CN_OPTIMAL_HIGH / CN_BAR_MAX) * 100;
  const roleColor = role === 'nitrogen_donor' ? '#3b82f6' : role === 'balanced' ? '#16a34a' : '#d97706';

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-700 font-medium truncate max-w-[60%]">{label}</span>
        <span className="text-xs font-mono font-bold" style={{ color: roleColor }}>
          C:N {cn}
        </span>
      </div>
      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
        {/* Optimal zone highlight */}
        <div
          className="absolute top-0 bottom-0 bg-green-200 opacity-60"
          style={{ left: `${optLow}%`, width: `${optHigh - optLow}%` }}
        />
        {/* Value marker */}
        <div
          className="absolute top-0 bottom-0 w-1 rounded-full"
          style={{ left: `calc(${pct}% - 2px)`, backgroundColor: roleColor }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
        <span>0</span>
        <span className="text-green-600 font-medium">20–30 ótimo</span>
        <span>{CN_BAR_MAX}+</span>
      </div>
    </div>
  );
}

function PairCard({ pair, rank }: { pair: CodigestionPair; rank: number }) {
  const [open, setOpen] = useState(false);
  const inRange = pair.cn_combined_in_range;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-left">
          <span className="text-[10px] text-gray-400 font-mono">#{rank}</span>
          <span className="text-xs font-medium text-gray-700 truncate">
            {pair.residue_a.label} + {pair.residue_b.label}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
            inRange ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}>
            C:N {pair.cn_combined}
          </span>
          {open ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3 bg-gray-50 border-t border-gray-100 space-y-3">
          <CNRatioBar cn={pair.residue_a.cn_ratio} label={pair.residue_a.label} role={pair.residue_a.cn_role} />
          <CNRatioBar cn={pair.residue_b.cn_ratio} label={pair.residue_b.label} role={pair.residue_b.cn_role} />

          <div className="bg-white rounded border border-gray-200 p-2 space-y-1 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Mistura ({pair.blend_ratio_A_to_B})</span>
              <span className={`font-mono font-bold ${inRange ? 'text-green-600' : 'text-amber-600'}`}>
                C:N {pair.cn_combined}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Recurso combinado</span>
              <span className="font-mono">{formatPairAmount(pair)}</span>
            </div>
            <div className="flex justify-between">
              <span>Melhora (score)</span>
              <span className="font-mono text-violet-600">{pair.improvement_score.toFixed(1)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CodigestionDetailPanel({
  cluster,
  onClose,
  visible,
}: CodigestionDetailPanelProps) {
  const [showAllPairs, setShowAllPairs] = useState(false);

  if (!visible || !cluster) return null;

  const top = cluster.top_pair;

  return (
    <div className="absolute top-20 right-4 z-[500] w-80 max-h-[calc(100vh-120px)] flex flex-col bg-white/97 backdrop-blur-sm shadow-xl rounded-xl overflow-hidden border border-violet-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-700 to-purple-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-violet-200" />
            <h3 className="text-white text-sm font-semibold">Co-digestão</h3>
          </div>
          <p className="text-violet-200 text-[11px] mt-0.5">{cluster.cluster_id} · {cluster.municipality_count} municípios</p>
        </div>
        <button onClick={onClose} className="text-violet-200 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-y-auto flex-1 p-3 space-y-4">
        {/* Top pair summary */}
        <div>
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">
            Melhor Oportunidade
          </div>
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 space-y-2">
            <CNRatioBar cn={top.residue_a.cn_ratio} label={top.residue_a.label} role={top.residue_a.cn_role} />
            <CNRatioBar cn={top.residue_b.cn_ratio} label={top.residue_b.label} role={top.residue_b.cn_role} />

            <div className="border-t border-violet-200 pt-2 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Mistura recomendada</span>
                <span className="font-mono text-gray-800">{top.blend_ratio_A_to_B}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">C:N combinado</span>
                <span className={`font-mono font-bold ${top.cn_combined_in_range ? 'text-green-600' : 'text-amber-600'}`}>
                  {top.cn_combined} {top.cn_combined_in_range ? '✓' : '~'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Recurso disponível</span>
                <span className="font-mono">{formatPairAmount(top)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Municipalities */}
        <div>
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">
            Municípios ({cluster.municipality_count})
          </div>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {cluster.municipalities.map(m => (
              <div key={m.ibge_code} className="flex justify-between text-xs px-2 py-1 rounded hover:bg-gray-50">
                <span className="text-gray-700 truncate">{m.name}</span>
                <span className="text-gray-400 flex-shrink-0 ml-2">{m.distance_from_centroid_km} km</span>
              </div>
            ))}
          </div>
        </div>

        {/* All qualifying pairs */}
        {cluster.all_qualifying_pairs.length > 1 && (
          <div>
            <button
              onClick={() => setShowAllPairs(o => !o)}
              className="flex items-center justify-between w-full text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2 hover:text-gray-700 transition-colors"
            >
              <span>Todos os Pares ({cluster.all_qualifying_pairs.length})</span>
              {showAllPairs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showAllPairs && (
              <div>
                {cluster.all_qualifying_pairs.map((pair, i) => (
                  <PairCard key={i} pair={pair} rank={i + 1} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Disclaimer footer */}
      <div className="flex-shrink-0 px-3 py-2 bg-amber-50 border-t border-amber-200">
        <p className="text-[10px] text-amber-700 leading-relaxed">
          ⚗️ <strong>Triagem espacial apenas.</strong> Viabilidade química deve ser validada laboratorialmente antes da implementação.
        </p>
      </div>
    </div>
  );
}
