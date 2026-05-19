# CP2B Data Handoff Package

This directory contains the core research datasets underlying the PILAR-2b platform, exported for reproducibility and peer use.

**Reference year**: 2023 | **Coverage**: 645 municipalities, São Paulo State, Brazil
**License**: [GPL-3.0](../cp2b-workspace/NewLook/LICENSE) — cite as per [CITATION.cff](../CITATION.cff)

---

## Files

| File | Description |
|------|-------------|
| `00_DATA_DICTIONARY.json` | Schema definitions for all fields in the dataset — variable names, units, data types, and sources |
| `01_master_residue_streams_SP_2023.csv` | Master table of residue streams by municipality — agricultural, livestock, and urban organic waste (tons/year) |
| `02_municipality_summary_SP_2023.csv` | Aggregated biogas potential per municipality after FDE correction factors are applied (Nm³/year) |
| `03_conversion_factors.csv` | Biochemical methane potential (BMP), volatile solids (VS), and FDE factors per residue type, with literature references |
| `04_state_summary_by_stream.csv` | State-level totals grouped by residue stream category |

## Data Sources

- **IBGE** — Municipal production data (livestock census, agricultural census)
- **ABIOVE** — Soybean and sugarcane residue estimates
- **MapBiomas** — Land-use classification (2023)
- **DBFZ / literature** — Biochemical parameters and conversion factors

## Methodology

Residue availability is calculated using the FDE (Fator de Disponibilidade Efetivo) methodology. See [`docs/data/FDE_METHODOLOGY.md`](../cp2b-workspace/NewLook/docs/data/FDE_METHODOLOGY.md) for a full description.
