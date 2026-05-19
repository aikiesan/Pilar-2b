"""
Check if technology_routes tables exist and have data
"""
import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text
from app.core.config import settings

def check_tech_tables():
    """Check if technology_routes tables exist and have data"""
    engine = create_engine(settings.DATABASE_URL)

    with engine.connect() as conn:
        print("=" * 60)
        print("TECHNOLOGY ROUTES DATABASE CHECK")
        print("=" * 60)

        # Check if tables exist
        tables = ['technology_cards', 'technology_references', 'user_routes']

        for table in tables:
            try:
                result = conn.execute(text(f"""
                    SELECT COUNT(*) as count
                    FROM information_schema.tables
                    WHERE table_name = '{table}'
                """))
                exists = result.fetchone()[0] > 0

                if exists:
                    # Count rows
                    count_result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    row_count = count_result.fetchone()[0]
                    print(f"✓ {table}: EXISTS ({row_count} rows)")
                else:
                    print(f"✗ {table}: DOES NOT EXIST")

            except Exception as e:
                print(f"✗ {table}: ERROR - {e}")

        # Show sample technology cards if they exist
        try:
            result = conn.execute(text("""
                SELECT id, category, name_pt, is_custom
                FROM technology_cards
                LIMIT 5
            """))
            rows = result.fetchall()

            if rows:
                print("\nSample technology cards:")
                for row in rows:
                    print(f"  - {row.id} ({row.category}): {row.name_pt} [custom={row.is_custom}]")
            else:
                print("\n⚠️  technology_cards table is EMPTY!")
                print("   Run: python scripts/seed_tech_data_simple.py")

        except Exception as e:
            print(f"\n⚠️  Could not query technology_cards: {e}")
            print("   Tables may not exist. Run migration 010_technology_routes.sql")

        print("=" * 60)

if __name__ == "__main__":
    check_tech_tables()
