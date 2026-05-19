"""
Simple Technology Routes Data Seeder
Connects directly to Supabase using environment variables.
Safe to re-run (uses ON CONFLICT DO NOTHING).

Usage:
    python scripts/seed_tech_data_simple.py

Required environment variables:
    SUPABASE_DB_URL or DATABASE_URL
"""

import sys
import os
sys.path.append('.')

from data.seed_technologies import INITIAL_TECHNOLOGIES
import psycopg2
from psycopg2.extras import RealDictCursor


def get_db_url():
    """Get database URL from environment."""
    db_url = os.getenv('SUPABASE_DB_URL') or os.getenv('DATABASE_URL')

    if not db_url:
        print("❌ Error: No database URL found in environment variables")
        print("   Set SUPABASE_DB_URL or DATABASE_URL")
        print()
        print("   Example:")
        print("   export DATABASE_URL='postgresql://user:pass@host:5432/postgres'")
        sys.exit(1)

    return db_url


def seed_technologies():
    """Seed the technology_cards table with initial data."""
    db_url = get_db_url()

    print(f"🔗 Connecting to database...")

    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        print(f"✅ Connected successfully")
        print(f"📊 Seeding {len(INITIAL_TECHNOLOGIES)} technologies...")

        inserted_count = 0
        skipped_count = 0

        for tech in INITIAL_TECHNOLOGIES:
            try:
                cursor.execute("""
                    INSERT INTO technology_cards (
                        id, category, name_pt, name_en, emoji,
                        description_pt, description_en, color,
                        can_connect_to, can_receive_from, is_custom
                    ) VALUES (
                        %(id)s, %(category)s, %(name_pt)s, %(name_en)s, %(emoji)s,
                        %(description_pt)s, %(description_en)s, %(color)s,
                        %(can_connect_to)s, %(can_receive_from)s, FALSE
                    )
                    ON CONFLICT (id) DO NOTHING
                    RETURNING id
                """, tech)

                result = cursor.fetchone()
                if result:
                    inserted_count += 1
                    print(f"   ✓ {tech['name_pt']} ({tech['id']})")
                else:
                    skipped_count += 1

            except Exception as e:
                print(f"   ✗ Failed to insert {tech['id']}: {e}")
                continue

        conn.commit()

        print()
        print(f"✅ Successfully seeded {inserted_count} new technologies")
        print(f"⏭️  Skipped {skipped_count} existing technologies")
        print(f"📊 Total in seed data: {len(INITIAL_TECHNOLOGIES)}")

        # Show breakdown by category
        categories = {}
        for tech in INITIAL_TECHNOLOGIES:
            cat = tech['category']
            categories[cat] = categories.get(cat, 0) + 1

        print("\n📋 Breakdown by category:")
        for cat, count in sorted(categories.items()):
            print(f"   {cat}: {count}")

        cursor.close()
        conn.close()

        return True

    except psycopg2.OperationalError as e:
        print(f"❌ Database connection error: {e}")
        print()
        print("💡 Make sure:")
        print("   1. DATABASE_URL is set correctly")
        print("   2. You've run the migration (010_technology_routes.sql)")
        print("   3. Your Supabase database is accessible")
        return False

    except Exception as e:
        print(f"❌ Error seeding technologies: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("🌱 Technology Routes Data Seeder")
    print("=" * 50)
    success = seed_technologies()
    print("=" * 50)

    if success:
        print("✅ Seeding complete!")
    else:
        print("❌ Seeding failed")

    sys.exit(0 if success else 1)
