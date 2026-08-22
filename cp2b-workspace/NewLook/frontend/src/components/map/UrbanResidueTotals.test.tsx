import React from 'react';
import { render, screen } from '@testing-library/react';
import UrbanResidueTotals from './UrbanResidueTotals';
import type { MunicipalityCollection } from '@/types/geospatial';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    const labels: Record<string, string> = {
      ariaLabel: `Totais urbanos ${values?.uf ?? ''}`,
      title: 'Resíduos urbanos',
      scenario: `Cenário ${values?.scenario ?? ''}`,
      'scenarios.real': 'Real',
      'scenarios.ideal': 'Ideal',
      'streams.rsu': 'FORSU',
      'streams.rpo': 'Poda urbana',
      'streams.sewage': 'Lodo de ETE',
      year: 'ano',
      municipalities: `${values?.count ?? 0} municípios com valor`,
      noDataTitle: `Sem inventário urbano validado para ${values?.uf ?? ''}`,
      noDataBody: 'Valores não foram inferidos.',
      disclaimer: 'Potencial de CH₄; não representa massa coletada.',
    };
    return labels[key] ?? key;
  },
}));

const feature = (ibge: string, values: Record<string, number>) => ({
  type: 'Feature' as const,
  geometry: { type: 'Point' as const, coordinates: [-46, -23] },
  properties: { ibge_code: ibge, name: ibge, ...values },
});

describe('UrbanResidueTotals', () => {
  it('sums and separates the three SP urban scenario streams', () => {
    const data = {
      type: 'FeatureCollection',
      features: [
        feature('3550308', {
          ch4_real_rsu_m3_year: 100_000_000,
          ch4_real_rpo_m3_year: 20_000_000,
          ch4_real_sewage_m3_year: 30_000_000,
        }),
        feature('3509502', { ch4_real_rsu_m3_year: 50_000_000 }),
      ],
    } as unknown as MunicipalityCollection;

    render(<UrbanResidueTotals data={data} scenario="real" scopeUf="SP" />);

    expect(screen.getByText('FORSU')).toBeInTheDocument();
    expect(screen.getByText('Poda urbana')).toBeInTheDocument();
    expect(screen.getByText('Lodo de ETE')).toBeInTheDocument();
    expect(screen.getByText(/200/)).toBeInTheDocument();
  });

  it('renders MG as a data gap instead of a zero total', () => {
    const data = {
      type: 'FeatureCollection',
      features: [feature('3106200', {})],
    } as unknown as MunicipalityCollection;

    render(<UrbanResidueTotals data={data} scenario="real" scopeUf="MG" />);

    expect(screen.getByText('Sem inventário urbano validado para MG')).toBeInTheDocument();
    expect(screen.getByText('Valores não foram inferidos.')).toBeInTheDocument();
  });
});
