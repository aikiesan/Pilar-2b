'use client';

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { MunicipalityCollection } from '@/types/geospatial';
import type { ServedScenarioKey } from '@/data/scenarioFactors';

type UrbanStream = 'rsu' | 'rpo' | 'sewage';

interface UrbanResidueTotalsProps {
  data: MunicipalityCollection;
  scenario: ServedScenarioKey;
  scopeUf: 'SP' | 'MG';
}

const STREAMS: Array<{ key: UrbanStream; color: string }> = [
  { key: 'rsu', color: '#0f766e' },
  { key: 'rpo', color: '#65a30d' },
  { key: 'sewage', color: '#2563eb' },
];

const UF_PREFIX = { SP: '35', MG: '31' } as const;

const compact = (value: number): string =>
  new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

/** State-level urban CH₄ decomposition from served Real/Ideal columns. */
export default function UrbanResidueTotals({ data, scenario, scopeUf }: UrbanResidueTotalsProps) {
  const t = useTranslations('Map.urbanTotals');

  const totals = useMemo(() => {
    const prefix = UF_PREFIX[scopeUf];
    return STREAMS.map(({ key, color }) => {
      let value = 0;
      let municipalities = 0;
      for (const feature of data.features) {
        if (!String(feature.properties.ibge_code).startsWith(prefix)) continue;
        const record = feature.properties as unknown as Record<string, unknown>;
        const raw = Number(record[`ch4_${scenario}_${key}_m3_year`]);
        if (!Number.isFinite(raw) || raw <= 0) continue;
        value += raw;
        municipalities += 1;
      }
      return { key, color, value, municipalities };
    });
  }, [data, scenario, scopeUf]);

  const total = totals.reduce((sum, stream) => sum + stream.value, 0);

  return (
    <section
      className="w-[min(310px,calc(100vw-1rem))] rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur"
      aria-label={t('ariaLabel', { uf: scopeUf })}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-800">{t('title')} · {scopeUf}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-500">
            {t('scenario', { scenario: t(`scenarios.${scenario}`) })}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold tabular-nums text-slate-900">{total > 0 ? compact(total) : '—'}</p>
          <p className="text-[10px] text-slate-500">Nm³ CH₄/{t('year')}</p>
        </div>
      </div>

      {total > 0 ? (
        <div className="mt-3 space-y-2">
          {totals.map((stream) => {
            const share = (stream.value / total) * 100;
            return (
              <div key={stream.key}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="font-medium text-slate-700">{t(`streams.${stream.key}`)}</span>
                  <span className="tabular-nums text-slate-600">
                    {compact(stream.value)} <span className="text-[10px] text-slate-400">({share.toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(share, stream.value > 0 ? 1.5 : 0)}%`, backgroundColor: stream.color }}
                  />
                </div>
                <p className="mt-0.5 text-[9px] text-slate-400">
                  {t('municipalities', { count: stream.municipalities })}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-slate-600">
          <p className="font-medium">{t('noDataTitle', { uf: scopeUf })}</p>
          <p className="mt-1 text-[10px] leading-relaxed">{t('noDataBody')}</p>
        </div>
      )}

      <p className="mt-3 border-t border-slate-100 pt-2 text-[9px] leading-relaxed text-slate-500">
        {t('disclaimer')}
      </p>
    </section>
  );
}
