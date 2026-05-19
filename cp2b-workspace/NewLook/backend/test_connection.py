"""
Test Supabase Database Connection
Quick script to verify connection before running migrations
"""

import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

print("=" * 80)
print("Testing Supabase Database Connection")
print("=" * 80)
print(f"\nConnection string: {DATABASE_URL[:50]}...{DATABASE_URL[-20:]}")

try:
    # Test connection
    print("\n[1] Attempting to connect...")
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    print("✓ Connection successful!")

    # Test PostgreSQL version
    print("\n[2] Checking PostgreSQL version...")
    cursor.execute("SELECT version();")
    version = cursor.fetchone()[0]
    print(f"✓ PostgreSQL: {version.split(',')[0]}")

    # Test PostGIS extension
    print("\n[3] Checking PostGIS extension...")
    cursor.execute("SELECT PostGIS_version();")
    postgis_version = cursor.fetchone()[0]
    print(f"✓ PostGIS: {postgis_version}")

    # Check if municipalities table exists
    print("\n[4] Checking if municipalities table exists...")
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = 'municipalities'
        );
    """)
    table_exists = cursor.fetchone()[0]
    if table_exists:
        print("✓ municipalities table exists")

        # Count existing records
        cursor.execute("SELECT COUNT(*) FROM municipalities;")
        count = cursor.fetchone()[0]
        print(f"  Current records: {count}")
    else:
        print("✗ municipalities table does NOT exist")
        print("  You need to run: 001_initial_schema.sql first")

    # Check if scientific_references table exists
    print("\n[5] Checking if scientific_references table exists...")
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = 'scientific_references'
        );
    """)
    table_exists = cursor.fetchone()[0]
    if table_exists:
        print("✓ scientific_references table exists")

        # Count existing records
        cursor.execute("SELECT COUNT(*) FROM scientific_references;")
        count = cursor.fetchone()[0]
        print(f"  Current records: {count}")
    else:
        print("✗ scientific_references table does NOT exist")
        print("  You need to run: 001_initial_schema.sql first")

    cursor.close()
    conn.close()

    print("\n" + "=" * 80)
    print("✓ All connection tests passed!")
    print("=" * 80)
    print("\nReady to run migration: python -m app.migrations.import_v2_data")

except psycopg2.OperationalError as e:
    print(f"\n✗ Connection failed: {e}")
    print("\nTroubleshooting:")
    print("1. Check if DATABASE_URL is correct in .env")
    print("2. Verify password is URL-encoded (# becomes %23)")
    print("3. Check if Supabase project is active")
    print("4. Verify firewall/network allows connection to Supabase")
    exit(1)

except Exception as e:
    print(f"\n✗ Error: {e}")
    exit(1)
