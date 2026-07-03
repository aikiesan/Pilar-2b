-- =============================================================================
-- Migration 020: Local, self-hosted authentication (UNICAMP VM)
-- =============================================================================
-- Replaces the mocked / Supabase-based auth with VM-local accounts.
-- All authentication data lives in PostgreSQL on the UNICAMP VM, behind the proxy.
--
-- Tables:
--   auth_users          — internal user accounts (invite-only; admin-created)
--   auth_token_denylist — revoked JWT ids (jti) for real logout / revocation
--   auth_access_log     — accountability log for confidential-resource access (LGPD Art. 37/46)
--
-- Roles:      visitante < autenticado < interno < admin
-- Clearance:  0 public · 1 internal · 2 confidential  (gates data tiers independently of role)
--
-- Idempotent: safe to re-run.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

-- -----------------------------------------------------------------------------
-- 1. auth_users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_users (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email              CITEXT UNIQUE NOT NULL,
    password_hash      TEXT NOT NULL,
    full_name          TEXT NOT NULL,
    role               TEXT NOT NULL DEFAULT 'autenticado'
                         CHECK (role IN ('visitante','autenticado','interno','admin')),
    clearance          SMALLINT NOT NULL DEFAULT 0
                         CHECK (clearance BETWEEN 0 AND 2),  -- 0 public · 1 internal · 2 confidential
    is_active          BOOLEAN NOT NULL DEFAULT TRUE,
    failed_login_count INTEGER NOT NULL DEFAULT 0,
    locked_until       TIMESTAMPTZ,
    last_login_at      TIMESTAMPTZ,
    created_by         UUID REFERENCES auth_users(id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_users_email  ON auth_users (email);
CREATE INDEX IF NOT EXISTS idx_auth_users_active ON auth_users (is_active);

COMMENT ON TABLE  auth_users IS 'VM-local internal accounts. Data-minimised: only what is needed to authenticate and authorise. LGPD legal basis: legitimate interest / contract execution (internal staff).';
COMMENT ON COLUMN auth_users.clearance IS '0 public · 1 internal · 2 confidential — gates data tiers independently of role.';

-- -----------------------------------------------------------------------------
-- 2. auth_token_denylist  (logout / revocation)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_token_denylist (
    jti         UUID PRIMARY KEY,            -- JWT id claim
    user_id     UUID REFERENCES auth_users(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,        -- when the underlying token would have expired (for purging)
    revoked_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_denylist_expires ON auth_token_denylist (expires_at);

-- -----------------------------------------------------------------------------
-- 3. auth_access_log  (LGPD accountability — who accessed confidential resources)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_access_log (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID REFERENCES auth_users(id) ON DELETE SET NULL,
    email       CITEXT,            -- denormalised so the log survives user deletion (accountability)
    resource    TEXT NOT NULL,     -- e.g. 'confidential:experimental-tool'
    action      TEXT NOT NULL DEFAULT 'access',
    ip_address  TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_access_log_user ON auth_access_log (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_access_log_time ON auth_access_log (occurred_at DESC);

-- -----------------------------------------------------------------------------
-- 4. Repoint FKs that referenced Supabase's auth.users → local auth_users
--    Guarded: only runs where the table + FK constraint actually exist, so the
--    migration is safe on a fresh local DB that never had Supabase tables.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT tc.table_name, tc.constraint_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_schema = 'auth'
          AND ccu.table_name = 'users'
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', rec.table_name, rec.constraint_name);
        EXECUTE format(
            'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth_users(id) ON DELETE SET NULL',
            rec.table_name, rec.constraint_name || '_local', rec.column_name);
        RAISE NOTICE 'Repointed %.% → auth_users', rec.table_name, rec.column_name;
    END LOOP;
END $$;
