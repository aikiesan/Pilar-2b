"""
Seed Technology Routes Data
Loads initial 25+ biogas technologies into the database.
Safe to re-run (uses ON CONFLICT DO NOTHING).
"""

import sys
sys.path.append('.')

from app.core.database import get_db
from sqlalchemy import text
from data.seed_technologies import INITIAL_TECHNOLOGIES


def seed_technologies():
    """Seed the technology_cards table with initial data."""
    with get_db() as db:
        try:
            inserted_count = 0

            for tech in INITIAL_TECHNOLOGIES:
                query = text("""
                    INSERT INTO technology_cards (
                        id, category, name_pt, name_en, emoji,
                        description_pt, description_en, color,
                        can_connect_to, can_receive_from, is_custom
                    ) VALUES (
                        :id, :category, :name_pt, :name_en, :emoji,
                        :description_pt, :description_en, :color,
                        :can_connect_to, :can_receive_from, FALSE
                    )
                    ON CONFLICT (id) DO NOTHING
                    RETURNING id
                """)

                result = db.execute(query, tech)
                if result.rowcount > 0:
                    inserted_count += 1

            db.commit()

            print(f"✅ Successfully seeded {inserted_count} new technologies")
            print(f"📊 Total technologies in seed data: {len(INITIAL_TECHNOLOGIES)}")

            # Show breakdown by category
            categories = {}
            for tech in INITIAL_TECHNOLOGIES:
                cat = tech['category']
                categories[cat] = categories.get(cat, 0) + 1

            print("\n📋 Breakdown by category:")
            for cat, count in sorted(categories.items()):
                print(f"   {cat}: {count}")

            return True

        except Exception as e:
            db.rollback()
            print(f"❌ Error seeding technologies: {e}")
            import traceback
            traceback.print_exc()
            return False


if __name__ == "__main__":
    success = seed_technologies()
    sys.exit(0 if success else 1)

