-- =============================================================================
-- Migration 017: Create calculator_leads table
-- =============================================================================
-- Backs app/routers/calculator.py :: submit_calculator (POST /submit).
-- The INSERT existed without a CREATE TABLE, so the lead-capture form 500s
-- in production with: UndefinedTable "calculator_leads".
-- Columns + types mirror the INSERT column list and the ::jsonb / ::integer[]
-- / ::text[] casts in that endpoint exactly.
-- Idempotent: safe to re-run.
-- =============================================================================

CREATE TABLE IF NOT EXISTS calculator_leads (
    id                BIGSERIAL PRIMARY KEY,

    -- Lead identity (LeadData)
    nome              TEXT        NOT NULL,
    email             TEXT        NOT NULL,
    cpf_cnpj          TEXT,
    municipality_id   INTEGER,
    municipality_name TEXT,
    consent_lgpd      BOOLEAN     NOT NULL DEFAULT TRUE,

    -- Submission payload
    activity_type     TEXT        NOT NULL,
    quantity_input    JSONB,
    active_months     INTEGER[],
    outputs_selected  TEXT[],
    calc_results      JSONB,

    -- Request metadata
    ip_address        TEXT,
    user_agent        TEXT,
    referrer          TEXT,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Common lookups: dedupe/contact by email, recent-first listing.
CREATE INDEX IF NOT EXISTS idx_calculator_leads_email      ON calculator_leads (email);
CREATE INDEX IF NOT EXISTS idx_calculator_leads_created_at ON calculator_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calculator_leads_municipio  ON calculator_leads (municipality_id);
