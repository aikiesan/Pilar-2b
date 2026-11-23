-- =============================================================================
-- Migration 040: sign-up with approval (access requests)
-- =============================================================================
-- Why: anyone may now ask for an account. The request waits for the person to
-- confirm their e-mail and then for an admin to approve it, choosing the
-- person's level (auth_users.clearance) at that moment.
--
-- Changes:
--   1. auth_users gains the request's state and what the admin needs to decide:
--        status            pending_email -> pending_review -> approved | rejected
--        email_verified_at when the person clicked the confirmation link
--        institution       where they work or study
--        purpose           what they want the account for (up to 500 chars)
--        reviewed_by, reviewed_at, review_note   the admin's decision
--      Accounts that exist before this migration are approved. New rows start
--      at pending_email.
--   2. auth_email_tokens: single-use links sent by e-mail (confirm the
--      address, reset the password). Only the sha256 of the token is stored.
--   3. Index for the admin's queue: status, then age.
--
-- Number: 040 was reserved for this file and it is applied after 041-043.
-- It does not depend on them, and they do not read these columns.
--
-- Safe to re-run: every statement is IF NOT EXISTS, and the status column is
-- added with DEFAULT 'approved' only when it does not exist yet, so a second
-- run never touches an account's state.
--
-- Check:
--   SELECT status, is_active, count(*) FROM auth_users GROUP BY 1, 2 ORDER BY 1, 2;
--   SELECT column_default FROM information_schema.columns
--    WHERE table_name = 'auth_users' AND column_name = 'status';
--   -- expected: every existing account 'approved'; default 'pending_email'
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Request state on auth_users
-- -----------------------------------------------------------------------------
-- Added with DEFAULT 'approved' so the accounts already there are approved;
-- the default then moves to 'pending_email' for every account created later.
ALTER TABLE auth_users
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'
        CHECK (status IN ('pending_email', 'pending_review', 'approved', 'rejected'));
ALTER TABLE auth_users ALTER COLUMN status SET DEFAULT 'pending_email';

ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS institution TEXT;
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS purpose TEXT
    CHECK (purpose IS NULL OR char_length(purpose) <= 500);
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS reviewed_by UUID
    REFERENCES auth_users(id) ON DELETE SET NULL;
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS review_note TEXT;

CREATE INDEX IF NOT EXISTS idx_auth_users_status_created
    ON auth_users (status, created_at);

COMMENT ON COLUMN auth_users.status IS
    'pending_email (address not confirmed) -> pending_review (waiting for an admin) -> approved | rejected. Only approved + is_active may sign in.';
COMMENT ON COLUMN auth_users.purpose IS
    'What the person said they want the account for, shown to the admin who decides.';

-- -----------------------------------------------------------------------------
-- 2. Single-use e-mail links
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_email_tokens (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL CHECK (kind IN ('verify_email', 'reset_password')),
    token_hash  TEXT NOT NULL UNIQUE,      -- sha256 hex of the token; the token itself is never stored
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_email_tokens_user
    ON auth_email_tokens (user_id, kind);

COMMENT ON TABLE auth_email_tokens IS
    'Single-use links sent by e-mail: verify_email (48 h), reset_password (1 h). Stores only sha256(token).';

COMMIT;
