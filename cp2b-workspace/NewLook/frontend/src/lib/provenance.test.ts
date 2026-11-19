import type { BiomassCoverage } from '@/types/geospatial';
import {
  DATA_BIOGAS_SEAL,
  PROVENANCE_BY_CODE,
  isFloor,
  provenanceCode,
  provenanceFromCode,
  provenanceKey,
  regionProvenance,
} from './provenance';

const ALL: BiomassCoverage[] = ['measured', 'estimated', 'partial', 'no_data'];

describe('provenance vocabulary', () => {
  it('uses exactly the backend terms, in the artifact byte order', () => {
    expect(PROVENANCE_BY_CODE).toEqual(ALL);
    for (const term of ALL) expect(provenanceFromCode(provenanceCode(term))).toBe(term);
    expect(() => provenanceFromCode(4)).toThrow();
  });

  it('maps only measured and partial onto Data_Biogas letters, inventing none', () => {
    expect(DATA_BIOGAS_SEAL).toEqual({ measured: 'V', estimated: null, partial: 'S', no_data: null });
  });

  it('names message keys and treats only partial as a floor', () => {
    expect(ALL.map(provenanceKey)).toEqual(['measured', 'estimated', 'partial', 'noData']);
    expect(ALL.filter(isFloor)).toEqual(['partial']);
  });
});

describe('regionProvenance', () => {
  it('makes a total with any part missing a floor, never a total', () => {
    expect(regionProvenance([0, 0, 3])).toBe('partial');
    expect(regionProvenance(new Uint8Array([0, 1, 3]))).toBe('partial');
  });

  it('keeps measured, estimated and no data when every part agrees', () => {
    expect(regionProvenance([0, 0])).toBe('measured');
    expect(regionProvenance([0, 1])).toBe('estimated');
    expect(regionProvenance([3, 3])).toBe('no_data');
    expect(regionProvenance([])).toBe('no_data');
  });
});
