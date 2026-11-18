# September 2026 playbook — Rendering at scale (MapLibre + PMTiles)

_Prerequisite: national spine (August). This month replaces the browser map's
hot path; GeoServer/OGC stays as the interoperability façade._

## Week 1 — tile build pipeline

1. Install tooling on the dev machine/VM: `tippecanoe` (build from source or
   package) and `pmtiles` CLI.
2. Export layer GeoJSON from PostGIS and build tiles:
   ```bash
   ogr2ogr -f GeoJSONSeq /tmp/mun.geojsonl PG:"$DATABASE_URL" \
     -sql "SELECT ibge_code, municipality_name, uf, data_confidence,
                  total_biogas_m3_year, urban_biogas_m3_year,
                  agricultural_biogas_m3_year, livestock_biogas_m3_year, geometry
           FROM municipalities"
   tippecanoe -o municipalities_2025.pmtiles -l municipalities \
     --coalesce-densest-as-needed --extend-zooms-if-still-dropping \
     -zg -Z3 /tmp/mun.geojsonl
   ```
   Bake the choropleth attributes in as feature properties — filter/metric
   switching then never refetches.
3. Script it: `scripts/build_tiles.sh` (municipalities, RGint, states, one
   `.pmtiles` per layer-year) + a Makefile target. Tiles are yearly build
   artifacts, not git objects — store under `/var/www/tiles/` on the VM,
   document checksums in METADATA.json notes.
4. Serve statically via Apache (PMTiles needs HTTP range requests —
   on by default; confirm `curl -r 0-15` returns 206).

## Weeks 2–3 — MapLibre migration, layer by layer

5. `npm install maplibre-gl pmtiles` (+ `react-map-gl` if preferred).
6. Add `MapLibreMap.tsx` behind the existing `MapComponent` prop surface and
   a `NEXT_PUBLIC_MAP_ENGINE=maplibre|leaflet` flag; Leaflet path stays
   default until parity.
7. Port order (each with its jest suite green before the next):
   1. basemap + municipal choropleth (fill layer, `setPaintProperty`-driven
      color scales — filter changes become paint updates, no refetch);
   2. tooltips/popups (queryRenderedFeatures) + selection state;
   3. legend + FloatingLayerControl wiring;
   4. infrastructure point/line layers (plants, pipelines, substations);
   5. heatmap (MapLibre native heatmap layer replaces leaflet.heat).
8. Basemap: OSM vector tiles — OpenFreeMap/Versatiles public styles, or
   self-host later. Attribution per ODbL.
9. Flip the flag default to MapLibre when: all map jest suites green, E2E
   green, and manual parity checklist (zoom/pan/filter/select/export) passes.

## Week 4 — perf budget in CI + OSS on-ramp

10. Playwright trace test (`e2e/perf-budget.spec.ts`): load national map,
    assert initial render < 3 s; scripted zoom in/out ×5, assert dropped
    frames < 30% (trace metrics); scripted metric switch, assert paint
    < 100 ms. Report as CI artifact trend first; harden thresholds after a
    week of data.
11. MapLibre OSS: file upstream repros for anything hit during the port;
    pick one `good first issue` (docs or bugfix) and submit — the contributor
    on-ramp you wanted.

## Exit criteria

- [ ] `municipalities_2025.pmtiles` served from the VM; map loads it
- [ ] MapLibre is the default engine; Leaflet code still present as fallback
- [ ] All frontend map suites green on MapLibre; E2E green
- [ ] Perf budget test in CI producing numbers (fps ≥ 30 on national zoom)
- [ ] First upstream MapLibre issue/PR submitted
- [ ] Indicator table September column filled
