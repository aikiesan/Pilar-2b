#!/usr/bin/env python3
"""
Bootstrap the first admin account for the local auth system.

Registration is invite-only (admin-created), so the first admin must be seeded.
Reads credentials from the environment and inserts an admin into `auth_users`.
Idempotent: if the email already exists, it is left unchanged.

Usage (on the UNICAMP VM, with the backend venv active and DATABASE_URL set):

    ADMIN_EMAIL=admin@cp2b.unicamp.br \
    ADMIN_PASSWORD='ChangeMe-Strong123' \
    ADMIN_NAME='CP2B Admin' \
    python -m scripts.seed_admin
"""
import os
import sys
from pathlib import Path

# Allow `python backend/scripts/seed_admin.py` as well as `-m scripts.seed_admin`.
BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import get_db_transaction  # noqa: E402
from app.services.auth_service import auth_service  # noqa: E402


def main() -> int:
    email = os.getenv("ADMIN_EMAIL")
    password = os.getenv("ADMIN_PASSWORD")
    name = os.getenv("ADMIN_NAME", "CP2B Admin")
    if not email or not password:
        print("ERROR: set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.")
        return 1

    password_hash = auth_service.hash_password(password)
    with get_db_transaction() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM auth_users WHERE email = %s", (email,))
        if cur.fetchone():
            print(f"Admin already exists: {email} — no change.")
            return 0
        cur.execute(
            """
            INSERT INTO auth_users (email, password_hash, full_name, role, clearance)
            VALUES (%s, %s, %s, 'admin', 2)
            RETURNING id
            """,
            (email, password_hash, name),
        )
        new_id = cur.fetchone()["id"]
    print(f"Created admin {email} (id={new_id}, role=admin, clearance=2).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
