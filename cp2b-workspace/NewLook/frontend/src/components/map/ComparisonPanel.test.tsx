/**
 * The comparison panel is a modal dialog: named by its title, closed by Escape.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import ComparisonPanel from './ComparisonPanel';
import { municipalityProps } from '@/test/fixtures/municipality';
import type { MunicipalityFeature } from '@/types/geospatial';

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'));

describe('ComparisonPanel', () => {
  it('is a modal dialog named by its title, and Escape closes it', () => {
    const onClose = jest.fn();
    render(
      <ComparisonPanel
        municipalities={[]}
        selectedMunicipalities={[]}
        onMunicipalityAdd={() => {}}
        onMunicipalityRemove={() => {}}
        onClose={onClose}
        visible
      />
    );
    expect(screen.getByRole('dialog', { name: 'Comparação de Municípios' })).toHaveAttribute('aria-modal', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('names each remove button after its municipality', async () => {
    const campinas: MunicipalityFeature = {
      type: 'Feature',
      properties: municipalityProps({ name: 'Campinas', ibge_code: '3509502', intermediate_region: 'Campinas' }),
      geometry: { type: 'Point', coordinates: [-47.06, -22.91] },
    };
    const onRemove = jest.fn();
    const { container } = render(
      <ComparisonPanel
        municipalities={[campinas]}
        selectedMunicipalities={[campinas]}
        onMunicipalityAdd={() => {}}
        onMunicipalityRemove={onRemove}
        onClose={() => {}}
        visible
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Remover Campinas da comparação' }));
    expect(onRemove).toHaveBeenCalledWith(3509502);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders nothing while hidden', () => {
    const { container } = render(
      <ComparisonPanel
        municipalities={[]}
        selectedMunicipalities={[]}
        onMunicipalityAdd={() => {}}
        onMunicipalityRemove={() => {}}
        onClose={() => {}}
        visible={false}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
