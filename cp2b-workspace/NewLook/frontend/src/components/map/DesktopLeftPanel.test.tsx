/**
 * The left panel's controls have names: the search field, its clear button,
 * each layer switch and the opacity slider. Icons are decorative (the lucide mock hides them, as the
 * real icons are), so an icon-only button needs a name of its own.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import DesktopLeftPanel from './DesktopLeftPanel';

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'));
jest.mock('@/hooks/useGeospatialData', () => ({ useSummaryStatistics: () => ({ data: undefined }) }));
jest.mock('@/hooks/useDataSources', () => ({
  ...jest.requireActual('@/hooks/useDataSources'),
  useDataSources: () => jest.requireActual('@/test/fixtures/sourceCatalog').sourceCatalog,
}));

const baseProps: React.ComponentProps<typeof DesktopLeftPanel> = {
  searchQuery: '',
  onSearchChange: () => {},
  selectedResidues: [],
  onResiduesChange: () => {},
  biomassType: 'total',
  onBiomassTypeChange: () => {},
  visualizationMode: 'choropleth',
  onVisualizationModeChange: () => {},
  opacity: 0.8,
  onOpacityChange: () => {},
  layers: [{ id: 'municipalities', name: 'Municípios', visible: true, icon: '🗺️' }],
  onLayerToggle: () => {},
  municipalityCount: 645,
  totalMunicipalities: 645,
  onOpenComparison: () => {},
  onOpenExport: () => {},
  colorMode: 'biogas',
  onColorModeChange: () => {},
};

describe('DesktopLeftPanel', () => {
  it('labels the search field and names its clear button', async () => {
    const onSearchChange = jest.fn();
    const { container } = render(
      <DesktopLeftPanel {...baseProps} searchQuery="Camp" onSearchChange={onSearchChange} />
    );
    expect(screen.getByLabelText('Buscar município')).toHaveValue('Camp');
    fireEvent.click(screen.getByRole('button', { name: 'Limpar busca' }));
    expect(onSearchChange).toHaveBeenCalledWith('');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('names each layer switch after its layer', async () => {
    const onLayerToggle = jest.fn();
    const { container } = render(<DesktopLeftPanel {...baseProps} onLayerToggle={onLayerToggle} />);
    fireEvent.click(screen.getByRole('button', { name: 'Camadas' }));
    const toggle = screen.getByRole('switch', { name: 'Municípios' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(toggle);
    expect(onLayerToggle).toHaveBeenCalledWith('municipalities', false);
    expect(screen.getByRole('slider', { name: 'Opacidade do Mapa: 80%' })).toHaveValue('0.8');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('cites the sources of a layer that is on the map, and only then', async () => {
    const layers = [
      { id: 'municipalities', name: 'Municípios', visible: true, icon: '🗺️' },
      { id: 'biogas_plant', name: 'Usinas de biogás', visible: false, icon: '⚡' },
    ];
    const { container } = render(<DesktopLeftPanel {...baseProps} layers={layers} />);
    fireEvent.click(screen.getByRole('button', { name: 'Camadas' }));
    const link = screen.getByRole('link', { name: /^Fonte \(Oficial\): IBGE, Malha Municipal 2025 — IBGE, 2025\./ });
    expect(link).toHaveAttribute('href', expect.stringContaining('15774-malhas'));
    expect(link).toHaveTextContent('IBGE, malha 2025');
    // The platform's own estimate has no link, and says it is an estimate.
    expect(screen.getByText(/^Fonte \(Estimativa\): Método CP2b v5\.1/)).toBeInTheDocument();
    expect(screen.queryByText('MapBiomas 10.1')).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
