"""
Supabase 403 Diagnostic Tool
Comprehensive checks for REST API access issues
"""

import os
import requests
from dotenv import load_dotenv
from supabase import create_client
import psycopg2

# Load environment
load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
ANON_KEY = os.getenv('SUPABASE_ANON_KEY')
SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
DATABASE_URL = os.getenv('DATABASE_URL')

print("=" * 80)
print("SUPABASE 403 DIAGNOSTIC TOOL")
print("=" * 80)

# Test 1: Check environment variables
print("\n[1] Checking environment variables...")
if SUPABASE_URL and ANON_KEY and SERVICE_KEY:
    print(f"  [OK] SUPABASE_URL: {SUPABASE_URL}")
    print(f"  [OK] ANON_KEY: {'*' * 20}...{ANON_KEY[-10:]}")
    print(f"  [OK] SERVICE_KEY: {'*' * 20}...{SERVICE_KEY[-10:]}")
else:
    print("  [ERROR] Missing environment variables!")
    exit(1)

# Test 2: Direct REST API call with requests
print("\n[2] Testing REST API with requests library...")
try:
    headers = {
        'apikey': SERVICE_KEY,
        'Authorization': f'Bearer {SERVICE_KEY}',
        'Content-Type': 'application/json'
    }

    # Test municipalities
    url = f"{SUPABASE_URL}/rest/v1/municipalities?select=id&limit=1"
    response = requests.get(url, headers=headers)

    print(f"  Status Code: {response.status_code}")
    print(f"  Response: {response.text[:200]}")

    if response.status_code == 200:
        print("  [OK] REST API is working!")
    elif response.status_code == 403:
        print("  [ERROR] 403 Access Denied - Permissions issue")
    elif response.status_code == 404:
        print("  [ERROR] 404 Not Found - Table might not be exposed in API")
    else:
        print(f"  [WARNING] Unexpected status: {response.status_code}")

except Exception as e:
    print(f"  [ERROR] Request failed: {e}")

# Test 3: Supabase Python SDK
print("\n[3] Testing with Supabase Python SDK...")
try:
    client = create_client(SUPABASE_URL, SERVICE_KEY)
    result = client.table('municipalities').select('id').limit(1).execute()

    if result.data:
        print(f"  [OK] SDK works! Got {len(result.data)} record(s)")
        print(f"  Data: {result.data}")
    else:
        print("  [WARNING] No data returned")

except Exception as e:
    print(f"  [ERROR] SDK failed: {e}")

# Test 4: Direct PostgreSQL query
print("\n[4] Testing direct PostgreSQL access...")
try:
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()

    # Check if tables exist
    cursor.execute("""
        SELECT tablename, tableowner
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN ('municipalities', 'scientific_references')
    """)
    tables = cursor.fetchall()

    if tables:
        print(f"  [OK] Found {len(tables)} table(s):")
        for table, owner in tables:
            print(f"    - {table} (owner: {owner})")
    else:
        print("  [ERROR] Tables not found!")

    # Check permissions
    cursor.execute("""
        SELECT
            grantee,
            table_name,
            privilege_type
        FROM information_schema.role_table_grants
        WHERE table_schema = 'public'
        AND table_name = 'municipalities'
        AND grantee IN ('anon', 'authenticated', 'service_role')
        ORDER BY grantee, privilege_type
    """)
    grants = cursor.fetchall()

    if grants:
        print(f"\n  [INFO] Current permissions:")
        for grantee, table, priv in grants:
            print(f"    {grantee}: {priv} on {table}")
    else:
        print("\n  [WARNING] No permissions found for API roles!")
        print("  [ACTION] Run fix_supabase_403.sql to grant permissions")

    # Check RLS status
    cursor.execute("""
        SELECT tablename, rowsecurity
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN ('municipalities', 'scientific_references')
    """)
    rls_status = cursor.fetchall()

    print(f"\n  [INFO] Row Level Security status:")
    for table, rls in rls_status:
        status = "ENABLED" if rls else "DISABLED"
        symbol = "[WARNING]" if rls else "[OK]"
        print(f"    {symbol} {table}: {status}")
        if rls:
            print(f"      [ACTION] Disable RLS: ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;")

    # Check role membership
    cursor.execute("""
        SELECT
            r.rolname as role,
            ARRAY_AGG(m.rolname) as member_of
        FROM pg_roles r
        LEFT JOIN pg_auth_members am ON r.oid = am.member
        LEFT JOIN pg_roles m ON am.roleid = m.oid
        WHERE r.rolname = 'authenticator'
        GROUP BY r.rolname
    """)
    role_membership = cursor.fetchone()

    if role_membership:
        print(f"\n  [INFO] Authenticator role membership:")
        print(f"    {role_membership[0]} can become: {role_membership[1]}")
        if 'service_role' not in str(role_membership[1]):
            print("    [WARNING] service_role not granted to authenticator!")
            print("    [ACTION] Run: GRANT service_role TO authenticator;")

    cursor.close()
    conn.close()
    print("\n  [OK] PostgreSQL connection successful")

except psycopg2.OperationalError as e:
    print(f"  [ERROR] Connection failed: {e}")
    print("  [INFO] Using connection string from DATABASE_URL")
except Exception as e:
    print(f"  [ERROR] Query failed: {e}")

# Test 5: Check API settings
print("\n[5] Recommendations:")
print("  1. Go to Supabase Dashboard -> Settings -> API")
print("  2. Verify 'Exposed schemas' includes 'public'")
print("  3. Check 'Extra search path' is empty or includes 'public'")
print("  4. Run all SQL commands from fix_supabase_403.sql")
print("  5. After each SQL section, run test_supabase_api.bat")

print("\n" + "=" * 80)
print("DIAGNOSTIC COMPLETE")
print("=" * 80)

# Summary
print("\n[SUMMARY]")
print("If REST API returned 403:")
print("  -> Run sections 1-7 from fix_supabase_403.sql in Supabase SQL Editor")
print("  -> Test after each section with: test_supabase_api.bat")
print("\nIf PostgreSQL shows no permissions:")
print("  -> Permissions need to be granted (see SQL script)")
print("\nIf RLS is enabled:")
print("  -> Disable it or create permissive policies")
