-- =============================================================================
-- Migration 043: four-level clearance scale and the analysis registry
-- =============================================================================
-- Why: bivariate analyses become rows with an access level, so the clearance
-- that gates them needs four steps instead of three.
--
-- Changes:
--   1. auth_users.clearance goes from 0 public / 1 internal / 2 confidential
--      to 0 public / 1 registered / 2 partner / 3 internal. Old rows are
--      remapped: admin, interno or old clearance >= 1 -> 3, then active 0 -> 1.
--   2. Creates analyses, analysis_values, analysis_classes, analysis_breaks
--      and analysis_grants.
--
-- Safe to re-run: the remap runs only while the old CHECK (cap at 2) is still
-- on the column; once the new CHECK is in, a second run changes nothing.
-- Not safe to run twice by hand-editing the CHECK back to 0-2 first.
--
-- Check:
--   SELECT clearance, role, count(*) FROM auth_users GROUP BY 1, 2 ORDER BY 1, 2;
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--    WHERE conrelid = 'auth_users'::regclass AND contype = 'c'
--      AND pg_get_constraintdef(oid) LIKE '%clearance%';
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Clearance scale
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    old_check TEXT;
BEGIN
    -- The old CHECK is the marker that the remap has not run yet.
    SELECT conname INTO old_check
      FROM pg_constraint
     WHERE conrelid = 'auth_users'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) LIKE '%clearance%'
       AND pg_get_constraintdef(oid) LIKE '%<= 2%'
     LIMIT 1;

    IF old_check IS NOT NULL THEN
        -- The old cap at 2 would reject the 3s below, so it goes first.
        EXECUTE format('ALTER TABLE auth_users DROP CONSTRAINT %I', old_check);
        -- First read the old scale (1 internal, 2 confidential, admin) ...
        UPDATE auth_users
           SET clearance = 3
         WHERE role IN ('admin', 'interno') OR clearance >= 1;
        -- ... then shift the old public ACTIVE accounts up to registered.
        UPDATE auth_users
           SET clearance = 1
         WHERE clearance = 0 AND is_active;

        ALTER TABLE auth_users
            ADD CONSTRAINT auth_users_clearance_check
            CHECK (clearance BETWEEN 0 AND 3);
    END IF;
END $$;

ALTER TABLE auth_users ALTER COLUMN clearance SET DEFAULT 0;

COMMENT ON COLUMN auth_users.clearance IS
    '0 público · 1 registrado · 2 parceiro · 3 interno — o que a pessoa pode ver.';

-- -----------------------------------------------------------------------------
-- 2. Registry
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analyses (
    id            TEXT PRIMARY KEY CHECK (id ~ '^[a-z0-9_]{1,40}$'),
    title_pt      TEXT NOT NULL,
    title_en      TEXT NOT NULL,
    question_pt   TEXT NOT NULL,
    question_en   TEXT NOT NULL,
    x_label_pt    TEXT NOT NULL,
    x_label_en    TEXT NOT NULL,
    y_label_pt    TEXT NOT NULL,
    y_label_en    TEXT NOT NULL,
    x_method      TEXT NOT NULL CHECK (x_method IN ('tertile_nonzero', 'tertile', 'fixed_count')),
    y_method      TEXT NOT NULL CHECK (y_method IN ('tertile_nonzero', 'tertile', 'fixed_count')),
    x_invert      BOOLEAN NOT NULL DEFAULT FALSE,
    y_invert      BOOLEAN NOT NULL DEFAULT FALSE,
    answer_cell   SMALLINT NOT NULL CHECK (answer_cell BETWEEN 0 AND 8),
    layers        TEXT[] NOT NULL DEFAULT '{}',
    source_pt     TEXT NOT NULL DEFAULT '',
    source_en     TEXT NOT NULL DEFAULT '',
    uf_prefixes   TEXT[] NOT NULL,
    level         SMALLINT NOT NULL DEFAULT 3 CHECK (level BETWEEN 0 AND 3),
    opens_at      TIMESTAMPTZ,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by    UUID REFERENCES auth_users(id) ON DELETE SET NULL
);

-- Raw values stay here to recompute breaks; no endpoint serves them.
CREATE TABLE IF NOT EXISTS analysis_values (
    analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    ibge_code   CHAR(7) NOT NULL,
    x           DOUBLE PRECISION,
    y           DOUBLE PRECISION,
    PRIMARY KEY (analysis_id, ibge_code)
);

-- Load result: what the API delivers. NULL cell = one of the two values missing.
CREATE TABLE IF NOT EXISTS analysis_classes (
    analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    ibge_code   CHAR(7) NOT NULL,
    cell        SMALLINT CHECK (cell BETWEEN 0 AND 8),
    PRIMARY KEY (analysis_id, ibge_code)
);

-- Tercile cuts per UF and axis; NULL when the axis has too few values.
CREATE TABLE IF NOT EXISTS analysis_breaks (
    analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    uf_prefix   CHAR(2) NOT NULL,
    axis        CHAR(1) NOT NULL CHECK (axis IN ('x', 'y')),
    b1          DOUBLE PRECISION,
    b2          DOUBLE PRECISION,
    PRIMARY KEY (analysis_id, uf_prefix, axis)
);

CREATE TABLE IF NOT EXISTS analysis_grants (
    analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    granted_by  UUID REFERENCES auth_users(id) ON DELETE SET NULL,
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ,
    note        TEXT,
    PRIMARY KEY (analysis_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_analysis_grants_user ON analysis_grants (user_id);

COMMIT;
