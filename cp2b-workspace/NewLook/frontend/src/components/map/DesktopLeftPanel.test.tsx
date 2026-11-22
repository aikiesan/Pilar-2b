/**
 * The left panel's controls have names: each layer switch and the opacity slider. Icons are decorative (the lucide mock hides them, as the
 * real icons are), so an icon-only button needs a name of its own.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import DesktopLeftPanel from './DesktopLeftPanel';

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'));
jest.mock('@/navigation', () => ({
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
jest.mock('@/hooks/useGeospatialData', () => ({ useSummaryStatistics: () => ({ data: undefined }) }));
jest.mock('@/hooks/useDataSources', () => ({
  ...jest.requireActual('@/hooks/useDataSources'),
  useDataSources: () => jest.requireActual('@/test/fixtures/sourceCatalog').sourceCatalog,
}));

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
  onOpenExport: () => {},
  colorMode: 'biogas',
  onColorModeChange: () => {},
};

describe('DesktopLeftPanel', () => {
  it('offers the four analyses and turns the chosen one off on a second click', () => {
    const onAnalysisChange = jest.fn();
    const { rerender } = render(<DesktopLeftPanel {...baseProps} onAnalysisChange={onAnalysisChange} />);
    const gap = screen.getByRole('button', { name: /Potencial sem planta/ });
    expect(screen.getAllByRole('button', { name: /metano × usinas|metano × gasoduto|agrícola × pecuária|Ideal × perda/ })).toHaveLength(4);
    fireEvent.click(gap);
    expect(onAnalysisChange).toHaveBeenLastCalledWith('lacuna');

    rerender(<DesktopLeftPanel {...baseProps} onAnalysisChange={onAnalysisChange} activeAnalysis="lacuna" />);
    expect(screen.getByRole('button', { name: /Potencial sem planta/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Potencial sem planta/ }));
    expect(onAnalysisChange).toHaveBeenLastCalledWith(null);
  });

  it('keeps sources and tools out of the panel body, in its footer', () => {
    render(<DesktopLeftPanel {...baseProps} />);
    expect(screen.queryByRole('button', { name: 'Ferramentas' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Fontes' })).toHaveAttribute('href', expect.stringContaining('/data'));
    expect(screen.getByRole('button', { name: 'Copiar link' })).toBeInTheDocument();
    // Until Compare on the map exists, Compare opens the comparison page.
    expect(screen.getByRole('link', { name: 'Comparar' })).toHaveAttribute('href', expect.stringContaining('/compare'));
  });

  it('folds a layer group away and back', () => {
    render(<DesktopLeftPanel {...baseProps} />);
    const group = screen.getByRole('button', { name: /Base/ });
    expect(group).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(group);
    expect(screen.queryByRole('switch', { name: 'Municípios' })).not.toBeInTheDocument();
    fireEvent.click(group);
    expect(screen.getByRole('switch', { name: 'Municípios' })).toBeInTheDocument();
  });

  it('names each layer switch after its layer', async () => {
    const onLayerToggle = jest.fn();
    const { container } = render(<DesktopLeftPanel {...baseProps} onLayerToggle={onLayerToggle} />);
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
    const link = screen.getByRole('link', { name: /^Fonte \(Oficial\): IBGE, Malha Municipal 2025 — IBGE, 2025\./ });
    expect(link).toHaveAttribute('href', expect.stringContaining('15774-malhas'));
    expect(link).toHaveTextContent('IBGE, malha 2025');
    // The platform's own estimate has no link, and says it is an estimate.
    expect(screen.getByText(/^Fonte \(Estimativa\): Método CP2b v5\.1/)).toBeInTheDocument();
    expect(screen.queryByText('MapBiomas 10.1')).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
