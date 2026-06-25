-- =============================================================================
-- Migration 019: calculator_leads — drop CPF/CNPJ (data minimisation)
-- =============================================================================
-- LGPD Art. 6, III (necessidade): the tax identifier (CPF/CNPJ) is not necessary
-- for the viability-calculator lead purpose, so it is removed entirely from
-- both the API and storage. Idempotent: safe to re-run.
-- =============================================================================

ALTER TABLE calculator_leads DROP COLUMN IF EXISTS cpf_cnpj;
