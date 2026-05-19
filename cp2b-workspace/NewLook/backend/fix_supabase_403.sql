-- ============================================================================
-- SUPABASE 403 ACCESS DENIED FIX SCRIPT
-- Run these commands in Supabase SQL Editor one section at a time
-- Test the curl command after EACH section
-- ============================================================================

-- ============================================================================
-- SECTION 1: Check Current Role Permissions
-- ============================================================================
SELECT
    rolname,
    rolsuper,
    rolinherit,
    rolcreaterole,
    rolcreatedb
FROM pg_roles
WHERE rolname IN ('anon', 'authenticated', 'service_role', 'authenticator', 'postgres')
ORDER BY rolname;

-- Check what roles authenticator inherits
SELECT
    r.rolname as role,
    m.rolname as member_of
FROM pg_roles r
LEFT JOIN pg_auth_members am ON r.oid = am.member
LEFT JOIN pg_roles m ON am.roleid = m.oid
WHERE r.rolname IN ('anon', 'authenticated', 'service_role', 'authenticator')
ORDER BY r.rolname;

-- ============================================================================
-- SECTION 2: Verify Table Existence and Ownership
-- ============================================================================
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('municipalities', 'scientific_references')
ORDER BY tablename;

-- ============================================================================
-- SECTION 3: Check Current Table Permissions
-- ============================================================================
SELECT
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('municipalities', 'scientific_references')
ORDER BY table_name, grantee, privilege_type;

-- ============================================================================
-- FIX 1: Grant Schema Usage (CRITICAL)
-- This allows roles to access the public schema at all
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ============================================================================
-- FIX 2: Grant Table Permissions
-- Grant SELECT (read) permissions to all roles
-- ============================================================================
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Specifically for our tables
GRANT ALL ON TABLE municipalities TO service_role;
GRANT ALL ON TABLE scientific_references TO service_role;
GRANT SELECT ON TABLE municipalities TO anon, authenticated;
GRANT SELECT ON TABLE scientific_references TO anon, authenticated;

-- ============================================================================
-- FIX 3: Grant Sequence Permissions (for INSERT operations)
-- ============================================================================
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- ============================================================================
-- FIX 4: Ensure Authenticator Role Has Member Access
-- The authenticator role needs to be able to "become" the service roles
-- ============================================================================
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;

-- ============================================================================
-- FIX 5: Verify/Fix Table Ownership
-- Tables should be owned by postgres for PostgREST to work properly
-- ============================================================================
ALTER TABLE municipalities OWNER TO postgres;
ALTER TABLE scientific_references OWNER TO postgres;

-- Also fix sequences
ALTER SEQUENCE municipalities_id_seq OWNER TO postgres;
ALTER SEQUENCE scientific_references_id_seq OWNER TO postgres;

-- ============================================================================
-- FIX 6: Disable RLS (if enabled)
-- Row Level Security can block access even with correct permissions
-- ============================================================================
ALTER TABLE municipalities DISABLE ROW LEVEL SECURITY;
ALTER TABLE scientific_references DISABLE ROW LEVEL SECURITY;

-- Drop any existing RLS policies
DROP POLICY IF EXISTS "Enable read access for all users" ON municipalities;
DROP POLICY IF EXISTS "Enable read access for all users" ON scientific_references;
DROP POLICY IF EXISTS "Enable all access for service role" ON municipalities;
DROP POLICY IF EXISTS "Enable all access for service role" ON scientific_references;

-- ============================================================================
-- FIX 7: Reload PostgREST Schema Cache
-- This forces Supabase to recognize the permission changes
-- ============================================================================
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these to verify the fixes worked
-- ============================================================================

-- 1. Check if tables are visible in the API schema
SELECT
    schemaname,
    tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Verify final permissions
SELECT
    table_name,
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('municipalities', 'scientific_references')
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY table_name, grantee;

-- 3. Check RLS status
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('municipalities', 'scientific_references');

-- 4. Test if authenticator can switch roles
SELECT
    r.rolname,
    ARRAY_AGG(m.rolname) as can_become
FROM pg_roles r
LEFT JOIN pg_auth_members am ON r.oid = am.member
LEFT JOIN pg_roles m ON am.roleid = m.oid
WHERE r.rolname = 'authenticator'
GROUP BY r.rolname;

-- ============================================================================
-- EXPECTED OUTPUT FROM VERIFICATION:
-- ============================================================================
-- 1. Both tables should appear in pg_tables
-- 2. service_role should have ALL privileges on both tables
-- 3. anon and authenticated should have SELECT on both tables
-- 4. rowsecurity should be FALSE for both tables
-- 5. authenticator should be able to become: anon, authenticated, service_role

-- ============================================================================
-- IF STILL FAILING: Check these additional settings
-- ============================================================================

-- Check if PostgREST is configured to expose the schema
SELECT * FROM pg_catalog.pg_namespace WHERE nspname = 'public';

-- Check if there are any row-level security policies still active
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('municipalities', 'scientific_references');

-- ============================================================================
-- NUCLEAR OPTION: Full Reset (only if nothing else works)
-- ============================================================================
-- REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated, service_role;
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
-- GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
-- NOTIFY pgrst, 'reload schema';
