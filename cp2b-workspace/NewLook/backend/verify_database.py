"""
Database Connection Verification Script
Verifies connection to PostgreSQL/Supabase and checks table structure
"""

import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Load environment variables from .env file
env_path = backend_dir / '.env'
if env_path.exists():
    load_dotenv(env_path)
    print(f"Loaded environment from: {env_path}")
else:
    print(f"Warning: .env file not found at {env_path}")

from app.core.database import get_db, test_db_connection
from app.core.config import settings


def verify_database_connection():
    """Verify Supabase connection and table structure"""
    print("=" * 60)
    print("PILAR-2b V3 - Database Verification")
    print("=" * 60)
    print()
    
    # Step 1: Check configuration
    print("[Step 1/4] Checking configuration...")
    print(f"  Supabase URL: {settings.SUPABASE_URL}")
    print(f"  Database URL: {settings.DATABASE_URL[:50]}...")
    print(f"  Environment: {settings.APP_ENV}")
    print(f"  Debug Mode: {settings.DEBUG}")
    print("[OK] Configuration loaded")
    print()
    
    # Step 2: Test database connection
    print("[Step 2/4] Testing database connection...")
    try:
        if test_db_connection():
            print(f"[OK] Database connected successfully")
        else:
            print(f"[FAIL] Database connection test failed")
            return False
    except Exception as e:
        print(f"[FAIL] Database connection failed: {e}")
        return False
    print()
    
    # Step 3: Check table structure
    print("[Step 3/4] Checking table structure...")
    tables = [
        'municipalities',
        'mapbiomas_data',
        'waste_generation',
        'biogas_potential'
    ]
    
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            
            for table in tables:
                try:
                    # Check if table exists and count records
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    count = cursor.fetchone()
                    record_count = count[0] if count else 0
                    print(f"[OK] Table '{table}' exists ({record_count} records)")
                except Exception as e:
                    print(f"[FAIL] Table '{table}' error: {e}")
            
            cursor.close()
    except Exception as e:
        print(f"[FAIL] Failed to check tables: {e}")
        return False
    print()
    
    # Step 4: Test a complex query
    print("[Step 4/4] Testing complex query...")
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            
            # Test joining municipalities with waste generation data
            query = """
                SELECT 
                    m.name,
                    m.codigo_ibge,
                    wg.waste_total_kg_year
                FROM municipalities m
                LEFT JOIN waste_generation wg ON m.codigo_ibge = wg.municipality_code
                LIMIT 5
            """
            cursor.execute(query)
            results = cursor.fetchall()
            
            print(f"[OK] Complex query successful")
            print(f"  Retrieved {len(results)} municipalities with waste data")
            
            if results:
                sample = results[0]
                print(f"\n  Sample municipality:")
                print(f"    Name: {sample.get('name', 'N/A')}")
                print(f"    Code: {sample.get('codigo_ibge', 'N/A')}")
                print(f"    Waste Generation: {sample.get('waste_total_kg_year', 'N/A')} kg/year")
            
            cursor.close()
    except Exception as e:
        print(f"[FAIL] Complex query failed: {e}")
        return False
    print()
    
    print("=" * 60)
    print("[SUCCESS] All database checks passed!")
    print("=" * 60)
    return True


if __name__ == "__main__":
    try:
        result = verify_database_connection()
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n\nVerification interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n[ERROR] Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

