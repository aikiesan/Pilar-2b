import type { MunicipalityProperties } from '@/types/geospatial'

/**
 * Municipality properties for a test that states only the fields it exercises.
 *
 * The fields given are type-checked against MunicipalityProperties; the ones
 * left out stay absent, exactly as in the object literal, so the component sees
 * the same data it did before the fixture was typed.
 */
export function municipalityProps(fields: Partial<MunicipalityProperties>): MunicipalityProperties {
  return fields as MunicipalityProperties
}
