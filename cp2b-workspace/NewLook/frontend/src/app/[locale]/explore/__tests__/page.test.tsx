/**
 * /explore is held back with the map analyses (MAP_ANALYSES_ENABLED): while the
 * flag is off the page and its metadata answer 404.
 */
let mockAnalysesEnabled = false;
jest.mock('@/lib/featureFlags', () => ({
  ...jest.requireActual('@/lib/featureFlags'),
  get MAP_ANALYSES_ENABLED() { return mockAnalysesEnabled; },
}));

jest.mock('next/navigation', () => ({
  notFound: () => { throw new Error('NEXT_NOT_FOUND'); },
}));
jest.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
}));
jest.mock('@/navigation', () => ({ Link: () => null }));
jest.mock('@/components/ui/ArcOrnament', () => ({ HeaderLeaves: () => null }));
jest.mock('@/components/home/MunicipalitySearch', () => ({ __esModule: true, default: () => null }));
jest.mock('@/lib/pageMetadata', () => ({ titledMetadata: (title: string) => ({ title }) }));

import ExplorePage, { generateMetadata } from '../page';

describe('/explore behind MAP_ANALYSES_ENABLED', () => {
  beforeEach(() => { mockAnalysesEnabled = false; });

  it('answers 404 while the flag is off', async () => {
    await expect(ExplorePage()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('answers 404 for its metadata while the flag is off', async () => {
    await expect(generateMetadata()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('renders when the flag is on', async () => {
    mockAnalysesEnabled = true;
    await expect(ExplorePage()).resolves.toBeTruthy();
  });
});
