/**
 * The left panel's controls have names: each layer switch and the opacity slider. Icons are decorative (the lucide mock hides them, as the
 * real icons are), so an icon-only button needs a name of its own.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import DesktopLeftPanel from './DesktopLeftPanel';

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'));
jest.mock('@/hooks/useGeospatialData', () => ({ useSummaryStatistics: () => ({ data: undefined }) }));

const baseProps: React.ComponentProps<typeof DesktopLeftPanel> = {
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
});
