"""
External open-data integrations for PILAR-2b.

A thin, additive client layer that pulls public Brazilian open data (IBGE, ANEEL,
…) and normalises it onto the **IBGE 7-digit municipality code** join key, so it
can refresh the canonical biomass inputs that already feed the forward engine
(`app.services.biogas_forward`). It does NOT re-implement the biomass/biogas
science — it feeds it.

See docs/data/DATA_INTEGRATIONS.md for the data-flow and the source catalogue,
and docs/data/OPEN_DATA_API_LANDSCAPE.md for the wider landscape.
"""
