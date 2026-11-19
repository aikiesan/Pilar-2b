/**
 * The map's search selects a municipality and never filters: typing offers the
 * municipalities on the map, the keyboard alone can pick one, and the box then
 * names what the map has selected, whether it came from here or from a click.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import MapMunicipalitySearch from './MapMunicipalitySearch';
import type { MunicipalityFeature } from '@/types/geospatial';

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'));

const feature = (name: string, ibge_code: string) =>
  ({ type: 'Feature', geometry: null, properties: { name, ibge_code } }) as unknown as MunicipalityFeature;

const FEATURES = [
  feature('Campinas', '3509502'),
  feature('Campos do Jordão', '3509700'),
  feature('Santos', '3548500'),
];

function setup(selected: MunicipalityFeature | null = null) {
  const onSelect = jest.fn();
  const onClear = jest.fn();
  const utils = render(
    <MapMunicipalitySearch features={FEATURES} selected={selected} onSelect={onSelect} onClear={onClear} />,
  );
  return { ...utils, onSelect, onClear, input: screen.getByRole('combobox', { name: 'Buscar município' }) };
}

describe('MapMunicipalitySearch', () => {
  it('offers the matching municipalities and picks one with the keyboard alone', async () => {
    const { input, onSelect, container } = setup();
    fireEvent.change(input, { target: { value: 'camp' } });

    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual([
      expect.stringContaining('Campinas'),
      expect.stringContaining('Campos do Jordão'),
    ]);
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(await axe(container)).toHaveNoViolations();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(FEATURES[1]);
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('finds a municipality by its IBGE code, and picks it with a click', () => {
    const { input, onSelect } = setup();
    fireEvent.change(input, { target: { value: '3548500' } });
    fireEvent.click(screen.getByRole('option', { name: /Santos/ }));
    expect(onSelect).toHaveBeenCalledWith(FEATURES[2]);
  });

  it('names the municipality the map has selected, and clears it', () => {
    const { input, onClear } = setup(FEATURES[0]);
    expect(input).toHaveValue('Campinas');
    fireEvent.click(screen.getByRole('button', { name: 'Limpar busca' }));
    expect(onClear).toHaveBeenCalled();
  });

  it('clears the selection with Escape on an untouched box', () => {
    const { input, onClear } = setup(FEATURES[0]);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClear).toHaveBeenCalled();
  });

  it('says so when nothing on the map matches', () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: 'Atlântida' } });
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByRole('status')).toHaveTextContent(/Nenhum município/);
  });
});
