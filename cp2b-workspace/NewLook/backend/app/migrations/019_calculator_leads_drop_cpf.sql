-- Migration 019: drop CPF/CNPJ from calculator_leads (LGPD data minimisation)
-- ---------------------------------------------------------------------------
-- LGPD Art. 6 III (necessity) + Art. 16: CPF/CNPJ are not necessary for the
-- biogas viability tool, so we stop collecting them AND erase any already
-- stored. The application no longer reads or writes this column (see
-- app/routers/calculator.py). Idempotent and safe to re-run.

ALTER TABLE calculator_leads DROP COLUMN IF EXISTS cpf_cnpj;
