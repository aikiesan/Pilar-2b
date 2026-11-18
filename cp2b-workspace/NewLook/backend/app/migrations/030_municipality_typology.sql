-- 030_municipality_typology.sql
--
-- Per-municipality co-digestion typology for São Paulo (645) and Minas Gerais
-- (853) — 1 498 rows, the platform's SP+MG scope.
--
-- Source: PILAR-2b canonical engine (p2_canon.py), delivered as
-- ENTREGA_clusters_CNPq/04_dados_entrada/SP_MG_municipios_indicadores.csv
-- (snapshot: data/raw/cnpq_typology/2026/, sha256 601d227d…).
--
-- Why a new table rather than columns on municipality_summary: that table is
-- SP-only (645 rows) and keyed on a double-precision ibge_code. This typology
-- covers SP+MG and is the join the map's C/N and typology layers read.
--
-- cn_molar is the SV-weighted arithmetic C:N from the canonical engine. The
-- N-additive balance is a known open question (see the ENTREGA INVENTARIO);
-- the column name records the method actually used, so a future N-additive
-- column can sit beside it instead of silently replacing it.

CREATE TABLE IF NOT EXISTS municipality_typology (
    ibge_code        integer PRIMARY KEY,
    uf               char(2)          NOT NULL,
    municipality_name text            NOT NULL,

    -- C:N — SV-weighted arithmetic mean (canonical engine).
    cn_molar         double precision NOT NULL,

    -- Categorical typology: dominant residue family.
    tipologia        text             NOT NULL,
    tip_dom_share    double precision,

    -- Nutrient regime: C-dominante / Equilibrado / N-dominante.
    regime           text             NOT NULL,
    share_c_rich     double precision,
    share_n_rich     double precision,

    -- Diversity + pairing readiness.
    shannon_h        double precision,
    total_vs_t       double precision,
    via_a            boolean,
    via_b            boolean,
    via_b_classe     text,

    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_municipality_typology_uf        ON municipality_typology (uf);
CREATE INDEX IF NOT EXISTS idx_municipality_typology_tipologia ON municipality_typology (tipologia);
CREATE INDEX IF NOT EXISTS idx_municipality_typology_regime    ON municipality_typology (regime);

COMMENT ON TABLE  municipality_typology IS
  'SP+MG co-digestion typology (1498 municipalities) from the canonical engine.';
COMMENT ON COLUMN municipality_typology.cn_molar IS
  'SV-weighted arithmetic C:N. NOT the N-additive balance — see docs/data/CNPQ_TYPOLOGY.md.';
