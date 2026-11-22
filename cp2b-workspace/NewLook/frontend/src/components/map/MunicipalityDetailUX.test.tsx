import { fireEvent, render, screen } from '@testing-library/react';

import EnhancedTooltip from './EnhancedTooltip';
import MunicipalityProfilePanel from './MunicipalityProfilePanel';
import type { MunicipalityFeature } from '@/types/geospatial';
import { municipalityProps } from '@/test/fixtures/municipality';

// This suite asserts on the copy a user actually reads (accessible names, the
// MG empty state, the t/ano warning), so it needs the real catalog rather than
// the key-returning default mock.
jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'));

jest.mock('@/hooks/useGeospatialData', () => ({
  useMunicipalityMetrics: () => ({ data: undefined, isLoading: false, error: null }),
}));

jest.mock('@/navigation', () => ({
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const municipality = (uf: 'SP' | 'MG'): MunicipalityFeature => {
  const isMg = uf === 'MG';
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [] },
    properties: municipalityProps({
      id: isMg ? 2 : 1,
      name: isMg ? 'Belo Horizonte' : 'Campinas',
      ibge_code: isMg ? '3106200' : '3509502',
      intermediate_region: isMg ? 'Belo Horizonte' : 'Campinas',
      immediate_region: '',
      immediate_region_code: '',
      intermediate_region_code: '',
      area_km2: 100,
      population: 1_000_000,
      population_density: 1_000,
      potential_category: 'ALTO',
      ch4_cp2b_n4_m3_year: isMg ? 0 : 2_000,
      ch4_cp2b_n4_rsu_m3_year: isMg ? 0 : 1_200,
      ch4_cp2b_n4_rpo_m3_year: isMg ? 0 : 300,
      ch4_cp2b_n4_sewage_m3_year: isMg ? 0 : 500,
    }),
  };
};

describe('municipality detail UX', () => {
  it('keeps hover content compact and points users to click details', () => {
    const { container } = render(
      <EnhancedTooltip
        municipality={municipality('SP')}
        position={{ x: 2000, y: 2000 }}
        visible
        metric="methane_m3"
        scenario="real"
      />,
    );

    expect(container).toHaveTextContent('Campinas');
    expect(container).toHaveTextContent('Clique para detalhes');
    expect(container).not.toHaveTextContent('População');
    expect(container).not.toHaveTextContent('Composição');
    expect(container.firstElementChild).toHaveStyle({ left: '748px', top: '644px' });
  });

  const renderPanel = (feature: MunicipalityFeature, features?: MunicipalityFeature[]) =>
    render(
      <MunicipalityProfilePanel
        municipality={feature}
        visible
        onClose={jest.fn()}
        metric="methane_m3"
        scenario="real"
        features={features}
      />,
    );
  const openTab = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

  it('opens on the summary, with the answer in one sentence', () => {
    renderPanel(municipality('SP'));

    expect(screen.getByRole('complementary', { name: /Detalhes do município de Campinas/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resumo' })).toHaveAttribute('aria-pressed', 'true');
    // 2 000 Nm³ of N4, of which FORSU (1 200) is the largest share.
    expect(screen.getByText(/Pode gerar/)).toHaveTextContent('Pode gerar 2 mil Nm³ de metano por ano');
    expect(screen.getByText(/viria de/)).toHaveTextContent('60% viria de FORSU (orgânicos).');
    expect(screen.getByText('Principal: FORSU')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'De onde vem o metano' })).toHaveTextContent('Lodo de ETE');
  });

  it('keeps the three SP urban streams in the residues tab', () => {
    renderPanel(municipality('SP'));
    openTab('Resíduos');

    const urban = screen.getByRole('region', { name: 'Urbano' });
    expect(urban).toHaveTextContent('FORSU');
    expect(urban).toHaveTextContent('Poda urbana');
    expect(urban).toHaveTextContent('Lodo de ETE');

    // The scenario note sits with the sources, so the residue list fits.
    openTab('Fontes');
    expect(screen.getByText(/Não representa massa coletada em t\/ano/)).toBeInTheDocument();
  });

  it('starts the residue list in the map metric and switches to tonnes', () => {
    renderPanel(municipality('SP'));
    openTab('Resíduos');

    const methane = screen.getByRole('button', { name: 'CH₄ N4' });
    expect(methane).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Nível N4, em/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Toneladas' }));
    expect(screen.getByRole('button', { name: 'Toneladas' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Biomassa gerada por resíduo/)).toBeInTheDocument();
    expect(screen.queryByText(/Não representa massa coletada/)).not.toBeInTheDocument();
  });

  it('shows the explicit MG validation gap instead of population-derived values', () => {
    renderPanel(municipality('MG'));
    openTab('Resíduos');

    expect(screen.getByText('Sem inventário urbano validado para MG')).toBeInTheDocument();
    expect(screen.getByText(/não foram inferidos a partir da população/i)).toBeInTheDocument();
  });

  it('shows the population under the area only when it has one', () => {
    const feature = municipality('SP');
    feature.properties = {
      ...feature.properties,
      population: null,
      population_density: null,
      gdp_per_capita: null,
    } as unknown as MunicipalityFeature['properties'];
    const { unmount } = renderPanel(feature);
    const area = screen.getByText('Área').closest('div')!;
    expect(area).toHaveTextContent('100');
    expect(area).not.toHaveTextContent('habitantes');
    unmount();

    renderPanel(municipality('SP'));
    expect(screen.getByText('Área').closest('div')).toHaveTextContent('1 mi habitantes');
  });

  it('ranks the municipality in the state and its region from the map features', () => {
    const peer = (code: string, name: string, region: string, n4: number): MunicipalityFeature => ({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [] },
      properties: municipalityProps({ name, ibge_code: code, immediate_region: region, ch4_cp2b_n4_m3_year: n4 }),
    });
    const self = municipality('SP');
    self.properties = { ...self.properties, immediate_region: 'Campinas' };
    const features = [
      peer('3500001', 'Grande', 'Campinas', 9_000),
      self,
      peer('3500002', 'Pequena', 'Campinas', 100),
      peer('3500003', 'Longe', 'Outra', 5_000),
    ];
    renderPanel(self, features);

    expect(screen.getByText('3º de 4 em SP')).toBeInTheDocument();

    openTab('Posição');
    expect(screen.getByRole('img', { name: /Campinas é o 3º/ })).toBeInTheDocument();
    const region = screen.getByRole('region', { name: 'Na região imediata de Campinas' });
    expect(region).toHaveTextContent('2º de 3');
    expect(region).toHaveTextContent('1º Grande');
    expect(region).toHaveTextContent('2º Campinas');
  });

  it('says so when there is nothing to rank', () => {
    renderPanel(municipality('SP'));
    openTab('Posição');
    expect(screen.getByText('Sem metano calculado para comparar este município.')).toBeInTheDocument();
  });
});
