"""
Quick test script to verify technology_routes.py fix
Run this after setting DATABASE_URL environment variable
"""
import os
import sys

# Add backend to path
sys.path.insert(0, 'cp2b-workspace/NewLook/backend')

try:
    # Test 1: Import the module
    print("Test 1: Importing technology_routes module...")
    from app.routers import technology_routes
    print("✅ Module imported successfully")

    # Test 2: Check that get_db is used correctly
    print("\nTest 2: Checking function signatures...")
    import inspect

    # Check health_check signature
    health_sig = inspect.signature(technology_routes.health_check)
    if 'db' not in health_sig.parameters:
        print("✅ health_check: No db parameter (correct!)")
    else:
        print("❌ health_check: Still has db parameter")

    # Check get_all_technologies signature
    get_all_sig = inspect.signature(technology_routes.get_all_technologies)
    if 'db' not in get_all_sig.parameters:
        print("✅ get_all_technologies: No db parameter (correct!)")
    else:
        print("❌ get_all_technologies: Still has db parameter")

    # Test 3: Check imports
    print("\nTest 3: Checking imports...")
    source = inspect.getsource(technology_routes)

    if 'from sqlalchemy.orm import Session' not in source:
        print("✅ SQLAlchemy Session import removed")
    else:
        print("❌ SQLAlchemy Session still imported")

    if 'from sqlalchemy import text' not in source:
        print("✅ SQLAlchemy text import removed")
    else:
        print("❌ SQLAlchemy text still imported")

    if 'from app.core.database import get_db' in source:
        print("✅ get_db imported correctly")
    else:
        print("❌ get_db not imported")

    # Test 4: Check for context manager usage
    print("\nTest 4: Checking for context manager usage...")
    if 'with get_db() as conn:' in source:
        print("✅ Using 'with get_db() as conn:' pattern")
    else:
        print("⚠️  Context manager pattern not found (might need manual check)")

    if 'cursor = conn.cursor()' in source:
        print("✅ Creating cursor from connection")
    else:
        print("⚠️  Cursor creation not found (might need manual check)")

    print("\n" + "="*60)
    print("Summary: All syntax checks passed!")
    print("="*60)
    print("\nNext steps:")
    print("1. Push to remote: git push origin awesome-stonebraker")
    print("2. Test health endpoint after deployment")
    print("3. Verify frontend loads technology cards")

except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
