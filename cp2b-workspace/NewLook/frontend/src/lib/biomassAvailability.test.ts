/**
 * Guards the data-integrity contract of the served-biomass accessors:
 * every tonnage is the value the backend served for that residue, and nothing
 * is ever re-derived on the client (no reverse-BMP). If someone reintroduces a
 * client-side derivation, or mis-wires a residue to the wrong served field,
 * these tests fail.
 */

import type { MunicipalityProperties } from '@/types/geospatial';
import type { ResidueType } from '@/components/map/FloatingControlPanel';
import {
  BIOMASS_RESIDUES,
  RESIDUES_BY_SECTOR,
  getResidueBiomassTons,
  getSectorBiomassTons,
  getTotalBiomassTons,
  getBiomassTonsByType,
} from './biomassAvailability';

const props = (o: Record<string, unknown>): MunicipalityProperties =>
  o as unknown as MunicipalityProperties;

const ALL_RESIDUES = Object.keys(BIOMASS_RESIDUES) as ResidueType[];

describe('biomassAvailability — residue ↔ field ↔ sector ties', () => {
  it('maps every residue to the canonical {residue}_biomass_tons_year field', () => {
    for (const r of ALL_RESIDUES) {
      expect(BIOMASS_RESIDUES[r].biomassField).toBe(`${r}_biomass_tons_year`);
    }
  });

  it('places every residue in exactly one sector, consistent with RESIDUES_BY_SECTOR', () => {
    for (const r of ALL_RESIDUES) {
      const sector = BIOMASS_RESIDUES[r].sector;
      expect(RESIDUES_BY_SECTOR[sector]).toContain(r);
    }
    // and every sector list only references known residues
    for (const list of Object.values(RESIDUES_BY_SECTOR)) {
      for (const r of list) expect(BIOMASS_RESIDUES[r]).toBeDefined();
    }
  });

  it('returns the served tonnage for a residue, keyed to its own field', () => {
    const p = props({ cattle_biomass_tons_year: 12345, swine_biomass_tons_year: 42 });
    expect(getResidueBiomassTons(p, 'cattle')).toBe(12345);
    expect(getResidueBiomassTons(p, 'swine')).toBe(42);
  });
});

describe('biomassAvailability — no client-side invention', () => {
  it('does NOT reverse-BMP: biomass absent but biogas present → 0, not a derived value', () => {
    const p = props({
      // no cattle_biomass_tons_year at all, but a fat biogas number that the
      // old reverse-BMP path would have turned into invented tonnage
      cattle_biogas_m3_year: 5_000_000,
    });
    expect(getResidueBiomassTons(p, 'cattle')).toBe(0);
  });

  it('treats null (no_data) as 0 tonnage, never a positive derived number', () => {
    const p = props({ corn_biomass_tons_year: null, corn_biogas_m3_year: 9_999_999 });
    expect(getResidueBiomassTons(p, 'corn')).toBe(0);
  });
});

describe('biomassAvailability — sector and total aggregation', () => {
  it('prefers the served sector total when present', () => {
    const p = props({
      livestock_biomass_tons_year: 1000,
      cattle_biomass_tons_year: 1, // ignored — served sector total wins
    });
    expect(getSectorBiomassTons(p, 'livestock')).toBe(1000);
  });

  it('sums served residues when the sector field is absent (no invention)', () => {
    const p = props({
      cattle_biomass_tons_year: 100,
      swine_biomass_tons_year: 20,
      poultry_biomass_tons_year: 3,
      // aquaculture absent → contributes 0
    });
    expect(getSectorBiomassTons(p, 'livestock')).toBe(123);
  });

  it('prefers the served grand total when present', () => {
    const p = props({ total_biomass_tons_year: 987654 });
    expect(getTotalBiomassTons(p)).toBe(987654);
  });

  it('honors a served measured-zero instead of overwriting it by summing', () => {
    const p = props({ agricultural_biomass_tons_year: 0, sugarcane_biomass_tons_year: 500 });
    expect(getSectorBiomassTons(p, 'agricultural')).toBe(0);
  });

  it('getBiomassTonsByType routes total vs sector correctly', () => {
    const p = props({ total_biomass_tons_year: 500, urban_biomass_tons_year: 80 });
    expect(getBiomassTonsByType(p, 'total')).toBe(500);
    expect(getBiomassTonsByType(p, 'urban')).toBe(80);
  });
});
