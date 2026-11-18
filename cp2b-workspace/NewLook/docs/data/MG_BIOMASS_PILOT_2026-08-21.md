# Minas Gerais biomass pilot — verified state and biodigestion path

Date: 2026-08-21
Environment: local Docker Desktop (`cp2b_maps`)

## What is live now

- Municipality spine: **853/853 MG municipalities**, refreshed from the
  official IBGE 2025 mesh (`MG_Municipios_2025`; SIRGAS 2000). The raw
  shapefile remains local and outside Git.
- Public API scope: **645 SP + 853 MG = 1,498**, no other UF returned.
- PAM 2023: **59,570 MG timeseries rows**, including 55,407 `pam_*` records
  across 67 products and 851 municipalities with at least one reported product.
  Suppressed/not-surveyed cells remain null.
- PAM units were re-audited against the Notes sheets: abacaxi and coco-da-baía
  are stored as `mil frutos`; the other 65 products use tonnes. They are not
  summed across incompatible units.
- Five modeled agricultural residue streams carry measured-source provenance.

| Stream | Reported crop production (Mt/year) | Derived gross residue (Mt/year) | Municipalities |
|---|---:|---:|---:|
| Sugarcane | 82.544 | 19.646 | 849 |
| Soybean | 8.459 | 11.843 | 849 |
| Corn | 8.297 | 9.127 | 849 |
| Coffee | 1.735 | 1.735 | 808 |
| Citrus | 1.127 | 0.563 | 808 |
| **Total modeled crop residue** | — | **42.914** | 849 with a positive total |

The units are annual. PAM reports crop production in tonnes/year. The platform
keeps that source value in the timeseries and writes residue tonnes/year to the
biomass columns after RPR conversion. For sugarcane, the modeled stream is
bagasse: `production × mill-delivery fraction × RPR`. The 82.54 Mt/year crop
total therefore becomes 19.65 Mt/year of gross bagasse residue; it is not a
tonnes/day value mislabeled as tonnes/year.

## What is not ready yet

- **Livestock:** the national PPM 3939/74/3940 workbooks are not present in the
  local source archive, so cow, swine, poultry and aquaculture residues have not
  been promoted for MG.
- **Urban:** exact SNIS municipal consolidated source files are absent. The
  current processed SP extract is incomplete/damaged and must not be extrapolated
  to MG. FORSU, pruning/green waste and sewage sludge remain separate `no_data`
  streams in MG. See `URBAN_RESIDUES_AUDIT_2026-08-21.md`.
- **Economic optimization:** CAPEX/OPEX, tariffs, product prices and avoided-cost
  assumptions are not yet versioned as a scenario dataset.

The UI consequently enables MG agricultural residue filters but keeps livestock
and urban residue filters disabled. MG remains labelled beta and is excluded
from published SP totals.

## Wider crop inventory already preserved

The national PAM workbooks contain 67 products for both SP and MG. Only five
currently have complete, versioned RPR/TS/VS/BMP/FDE chains and therefore become
residue/biogas potential. The remaining production is now retained in Docker as
an auditable development inventory without changing the validated biomass
columns.

Largest MG production-only candidates in 2023 are batata-inglesa (1.386 Mt),
sorgo (1.354 Mt), banana (0.847 Mt), feijão (0.579 Mt), mandioca (0.573 Mt),
tomate (0.562 Mt) and trigo (0.459 Mt). These are crop production, not residue
mass. Each needs a crop-specific residue definition and cited conversion chain
before it can appear in biomass totals.

## Municipal decentralized biodigestion model

Build the restricted feature as a traceable chain, never as one opaque score:

1. **Feedstock inventory:** gross generation, collectible fraction, current
   competing use, seasonality, moisture/TS/VS, C:N, BMP and methane fraction.
2. **Co-digestion recipes:** constrain C:N, organic loading, inhibition,
   hydraulic retention and maximum share per substrate. Sugarcane residues are
   carbon-rich; cattle/swine manure can provide moisture, buffering and nitrogen.
3. **Spatial supply:** evaluate farm/municipal clusters at explicit collection
   radii, road distance, haulable wet mass and seasonal storage.
4. **Plant scale and use case:** self-consumption first (thermal demand, CHP or
   biomethane vehicle/fleet demand), then exportable surplus.
5. **Products and mass balance:** raw biogas, methane/biomethane, upgrading CO2,
   electricity, useful heat, digestate solids/liquids and retained N-P-K.
6. **Optional downstream conversion:** biochar is **not** a direct anaerobic
   digestion product. It requires digestate separation/drying and pyrolysis, with
   its own energy, yield, emissions and market assumptions.
7. **Economics and uncertainty:** annualized CAPEX, OPEX, transport, avoided
   energy/fertilizer cost, product revenue and min/medium/max parameter bands.

The existing SP biochemical-matching artifacts under
`analysis/paper_figures/P2/` already implement much of the recipe/C:N/transport
logic. The next analytical milestone is to rerun that engine on MG after PPM
lands, then publish only recipes whose source coverage and constraint checks are
green.

## Immediate next gates

1. Acquire/export exact IBGE PPM tables for 2024 and promote MG with `--uf MG`.
2. Acquire exact SNIS municipal consolidated files and resolve the urban
   tonnes/day versus tonnes/year semantics before any MG urban estimate.
3. Add MG biochemical recipe outputs for sugarcane + cattle/swine combinations.
4. Version an economic-scenario table and keep the optimization UI restricted
   until authentication/tester roles are implemented.
