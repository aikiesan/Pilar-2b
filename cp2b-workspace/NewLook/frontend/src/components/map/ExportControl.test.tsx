/**
 * The CSV export writes its headings in the page's language (pt-BR catalog here)
 * and its numbers as plain data, one row per visible municipality.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ExportControl from './ExportControl';
import type { MunicipalityCollection } from '@/types/geospatial';

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'));
jest.mock('html2canvas', () => jest.fn());
// Exports are off during the beta; these tests are about the file once they are on.
jest.mock('@/lib/featureFlags', () => ({ DATA_EXPORT_ENABLED: true, DATA_EXPORT_DISABLED_REASON: '' }));

const downloadCsv = jest.fn();
jest.mock('@/lib/download', () => ({
  ...jest.requireActual('@/lib/download'),
  downloadCsv: (...args: unknown[]) => downloadCsv(...args),
}));

const data = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: null,
      properties: {
        ibge_code: 3509502,
        name: 'Campinas',
        intermediate_region: 'Campinas, SP',
        population: 1139047,
        area_km2: 794.57,
        total_biogas_m3_year: 1500000.5,
        agricultural_biogas_m3_year: 1000000,
        livestock_biogas_m3_year: 300000,
        urban_biogas_m3_year: 200000.5,
        citrus_biogas_m3_year: 1234,
      },
    },
  ],
} as unknown as MunicipalityCollection;

describe('ExportControl CSV', () => {
  beforeEach(() => downloadCsv.mockClear());

  it('writes localized headings and one row per municipality', async () => {
    render(<ExportControl data={data} visible />);
    fireEvent.click(screen.getByText('CSV (planilha)'));
    await waitFor(() => expect(downloadCsv).toHaveBeenCalledTimes(1));

    const [content, filename] = downloadCsv.mock.calls[0] as [string, string];
    const [header, row] = content.split('\n');
    expect(header.split(',').slice(0, 6)).toEqual([
      'Código IBGE', 'Município', 'Região intermediária', 'População', 'Área (km²)', 'Biogás total (m³/ano)',
    ]);
    expect(header).toContain('Biogás — Citros (m³/ano)');
    expect(header).toContain('Biogás — FORSU (orgânicos) (m³/ano)');
    // Commas inside a value are quoted; numbers keep a dot decimal separator.
    expect(row.startsWith('3509502,Campinas,"Campinas, SP",1139047,794.57,1500000.5,')).toBe(true);
    expect(filename).toMatch(/^cp2b-biogas-data-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it('reports that there is nothing to export', async () => {
    render(<ExportControl data={{ ...data, features: [] }} visible />);
    fireEvent.click(screen.getByText('CSV (planilha)'));
    expect(await screen.findByText(/Nenhum dado disponível para exportar/)).toBeInTheDocument();
    expect(downloadCsv).not.toHaveBeenCalled();
  });
});
