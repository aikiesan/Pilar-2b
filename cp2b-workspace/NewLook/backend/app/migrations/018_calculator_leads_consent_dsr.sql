-- =============================================================================
-- Migration 018: calculator_leads — consent hardening + data-subject rights
-- =============================================================================
-- Context: LGPD conformity. The lead-capture form must store EXPLICIT consent
-- (opt-in), the exact consent text version the user agreed to, and a timestamp,
-- so consent is demonstrable (LGPD Art. 8 §1). Default consent is flipped to
-- FALSE (privacy by default). Erasure is a hard DELETE handled by the API.
-- Idempotent: safe to re-run.
-- =============================================================================

-- Privacy by default: never assume consent.
ALTER TABLE calculator_leads ALTER COLUMN consent_lgpd SET DEFAULT FALSE;

-- Demonstrable consent (LGPD Art. 8 §1): which notice version + when.
ALTER TABLE calculator_leads
    ADD COLUMN IF NOT EXISTS consent_text_version TEXT,
    ADD COLUMN IF NOT EXISTS consented_at         TIMESTAMPTZ;

COMMENT ON COLUMN calculator_leads.consent_lgpd
    IS 'Explicit opt-in. The API rejects submissions where this is not TRUE.';
COMMENT ON COLUMN calculator_leads.consent_text_version
    IS 'Version tag of the privacy notice the data subject agreed to.';
COMMENT ON COLUMN calculator_leads.consented_at
    IS 'UTC timestamp consent was granted (demonstrable consent, LGPD Art. 8).';
