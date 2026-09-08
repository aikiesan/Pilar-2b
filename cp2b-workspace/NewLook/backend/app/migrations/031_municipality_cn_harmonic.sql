-- 031_municipality_cn_harmonic.sql
--
-- The N-additive C:N for São Paulo, beside the arithmetic one already stored.
--
-- Why new columns rather than a correction in place: `cn_molar` is the
-- SV-weighted ARITHMETIC mean of the per-stream C:N ratios, which is not the C:N
-- of a mixture — nitrogen is additive, so the blend ratio is ΣVS / Σ(VS/CN).
-- Migration 030 shipped the arithmetic value and PR #213 had to withdraw the map
-- layers built on it (44% of municipalities misclassified). See
-- docs/data/CNPQ_TYPOLOGY.md.
--
-- `cn_molar` stays because the published figures were generated from it; it has
-- to remain reproducible until they are regenerated. The two live side by side,
-- named for the method each one used, which is what 030's own comment asked for.
--
-- SÃO PAULO ONLY. These columns are NULL for the 853 Minas Gerais rows, and that
-- is deliberate: the corrected pipeline output covers the 645 SP municipalities
-- and nothing else. A NULL here means "not computed", never "zero" — the map
-- hides the C:N modes outside SP rather than drawing an empty choropleth.
--
-- Source: analysis/paper_figures/P2/canonical/dossier/dossier_municipios.csv
-- (sha256 bc6af196…), the working set behind the biochemical validation dossier.
-- It carries 13 residue streams, including sewage, which the SP+MG snapshot
-- feeding `cn_molar` does not.

ALTER TABLE municipality_typology
    ADD COLUMN IF NOT EXISTS cn_harm     double precision,
    ADD COLUMN IF NOT EXISTS regime_harm text,
    ADD COLUMN IF NOT EXISTS dom_stream  text,
    ADD COLUMN IF NOT EXISTS d_gas_km    double precision;

CREATE INDEX IF NOT EXISTS idx_municipality_typology_regime_harm
    ON municipality_typology (regime_harm)
    WHERE regime_harm IS NOT NULL;

COMMENT ON COLUMN municipality_typology.cn_harm IS
  'N-additive blend C:N — SUM(VS)/SUM(VS/CN), 13 streams. SP only; NULL for MG. '
  'This is the method the validation dossier declares. Median 32.26 over the 645.';
COMMENT ON COLUMN municipality_typology.regime_harm IS
  'Nutrient regime from cn_harm: sweet (20-30), N-deficit (>30), N-excess (<20). '
  'SP only. 191 / 345 / 109 respectively — NOT the same split as `regime`, which '
  'is derived from the arithmetic cn_molar and misclassifies.';
COMMENT ON COLUMN municipality_typology.dom_stream IS
  'Dominant residue stream by VS, from the dossier working set. SP only.';
COMMENT ON COLUMN municipality_typology.d_gas_km IS
  'Distance to the nearest gas infrastructure, km. Mobilisation filter, applied '
  'after the chemistry — see the dossier, scale (d). SP only.';
