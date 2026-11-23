/**
 * Map domain types, shared by the map components, the thematic presets and the
 * lib/ helpers.
 *
 * They used to be exported from UI components — FloatingControlPanel,
 * LeftFilterPanel and dashboard/FilterPanel — none of which was still rendered
 * anywhere, so lib/ depended on dead UI files for its vocabulary.
 */

/** A sector filter, or the total across sectors. */
export type BiomassType = 'total' | 'agricultural' | 'livestock' | 'urban';

/** Residue streams the map can filter on. Display names: Map.residues.<type>. */
export type ResidueType =
  | 'sugarcane' | 'soybean' | 'corn' | 'coffee' | 'citrus'
  | 'cattle' | 'swine' | 'poultry' | 'aquaculture'
  | 'rsu' | 'rpo' | 'sewage';

/** How municipality values are drawn. */
/**
 * How the map draws the metric. `dots` (Pontos, dot density) and `symbols`
 * (Símbolos, circles by origin) replaced the heat surface and the log-scaled
 * bubbles; old links (?mode=heatmap, ?mode=bubble) open them.
 */
export type VisualizationMode = 'choropleth' | 'dots' | 'symbols' | 'clusters';

/** Programmatic filters applied on top of the map's own controls. */
export interface FilterCriteria {
  // Biogas potential
  minBiogas?: number;
  maxBiogas?: number;
  residueTypes: ('agricultural' | 'livestock' | 'urban')[];

  // Geographic
  regions: string[];
  searchQuery: string;

  // Population
  minPopulation?: number;
  maxPopulation?: number;

  // Infrastructure proximity
  nearRailway: boolean;
  nearPipeline: boolean;
  nearSubstation: boolean;
  proximityRadius: number; // km
}
