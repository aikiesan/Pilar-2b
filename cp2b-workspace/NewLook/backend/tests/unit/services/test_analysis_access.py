"""Who may see a registry analysis: the pure rule and the SQL that must agree."""

import os
import uuid
from datetime import datetime, timedelta, timezone

import psycopg2
import psycopg2.extras
import pytest

from app.models.auth import UserProfile
from app.services.analysis_access import (
    can_view,
    effective_level,
    viewer_level,
    visible_analyses_sql,
)

NOW = datetime(2026, 12, 1, tzinfo=timezone.utc)
PAST = NOW - timedelta(days=30)
FUTURE = NOW + timedelta(days=30)


def make_user(clearance=0, role="autenticado", is_active=True) -> UserProfile:
    return UserProfile(
        id=str(uuid.uuid4()),
        email="u@example.com",
        full_name="Test User",
        role=role,
        clearance=clearance,
        is_active=is_active,
        created_at=NOW,
        updated_at=NOW,
    )


def make_analysis(level=3, opens_at=None, is_active=True, id="demo_xy"):
    return {"id": id, "level": level, "opens_at": opens_at, "is_active": is_active}


@pytest.mark.parametrize(
    "clearance,level,expected", [(1, 1, True), (1, 2, False), (3, 3, True), (0, 1, False)]
)
def test_level_rule(clearance, level, expected):
    user = make_user(clearance=clearance)
    assert can_view(user, make_analysis(level=level), "none", NOW) is expected


def test_anonymous_sees_only_level_0():
    assert can_view(None, make_analysis(level=0), "none", NOW)
    assert not can_view(None, make_analysis(level=1), "none", NOW)


def test_inactive_account_counts_as_anonymous():
    user = make_user(clearance=3, is_active=False)
    assert viewer_level(user) == 0
    assert not can_view(user, make_analysis(level=1), "none", NOW)
    assert can_view(user, make_analysis(level=0), "none", NOW)


def test_inactive_account_grant_opens_nothing():
    user = make_user(clearance=3, is_active=False)
    assert not can_view(user, make_analysis(level=3), None, NOW)


def test_inactive_admin_is_anonymous():
    user = make_user(role="admin", clearance=3, is_active=False)
    assert not can_view(user, make_analysis(level=1), "none", NOW)
    assert not can_view(user, make_analysis(level=0, is_active=False), "none", NOW)


def test_admin_sees_everything_even_inactive_analysis():
    admin = make_user(role="admin", clearance=0)
    assert can_view(admin, make_analysis(level=3, is_active=False), "none", NOW)


def test_inactive_analysis_hidden_even_with_grant():
    user = make_user(clearance=3)
    assert not can_view(user, make_analysis(level=0, is_active=False), None, NOW)


def test_grant_opens_above_level():
    user = make_user(clearance=1)
    assert can_view(user, make_analysis(level=3), FUTURE, NOW)


def test_expired_grant_does_not():
    user = make_user(clearance=1)
    assert not can_view(user, make_analysis(level=3), NOW - timedelta(seconds=1), NOW)


def test_grant_expiring_exactly_now_does_not():
    user = make_user(clearance=1)
    assert not can_view(user, make_analysis(level=3), NOW, NOW)


def test_grant_without_expiry_lasts():
    user = make_user(clearance=0)
    assert can_view(user, make_analysis(level=3), None, NOW)


def test_opens_at_past_makes_level_3_public():
    assert effective_level(3, PAST, NOW) == 0
    assert can_view(None, make_analysis(level=3, opens_at=PAST), "none", NOW)


def test_opens_at_exactly_now_opens():
    assert effective_level(3, NOW, NOW) == 0


def test_opens_at_future_keeps_level():
    assert effective_level(3, FUTURE, NOW) == 3
    assert not can_view(None, make_analysis(level=3, opens_at=FUTURE), "none", NOW)


def test_sql_uses_placeholders_only():
    user = make_user(clearance=1)
    sql, params = visible_analyses_sql(user, analysis_id="demo_xy")
    assert "demo_xy" not in sql and user.id not in sql
    assert sql.count("%s") == len(params)
    assert "demo_xy" in params


def test_sql_anonymous_has_no_grant_lookup():
    sql, params = visible_analyses_sql(None)
    assert "analysis_grants" not in sql
    assert sql.count("%s") == len(params)


@pytest.fixture
def db():
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Needs TEST_DATABASE_URL")
    conn = psycopg2.connect(url)
    try:
        yield conn
    finally:
        conn.rollback()  # nothing is ever committed
        conn.close()


@pytest.mark.database
def test_sql_filter_agrees_with_can_view(db):
    cur = db.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    # The DB's own clock is the reference, as it is in the SQL.
    cur.execute("SELECT now() AS n")
    now = cur.fetchone()["n"]

    specs = []  # (id, level, opens_at, is_active)
    for level in (0, 1, 2, 3):
        for tag, opens in (
            ("null", None),
            ("past", now - timedelta(days=1)),
            ("fut", now + timedelta(days=1)),
        ):
            for active in (True, False):
                aid = f"t4_{level}_{tag}_{'on' if active else 'off'}"
                specs.append((aid, level, opens, active))
    for aid, level, opens, active in specs:
        cur.execute(
            """INSERT INTO analyses (id, title_pt, title_en, question_pt, question_en,
                   x_label_pt, x_label_en, y_label_pt, y_label_en, x_method, y_method,
                   answer_cell, uf_prefixes, level, opens_at, is_active)
               VALUES (%s,'t','t','q','q','x','x','y','y','tertile','tertile',0,%s,%s,%s,%s)""",
            (aid, ["35"], level, opens, active),
        )

    def add_user(clearance, role="autenticado", active=True):
        uid = str(uuid.uuid4())
        cur.execute(
            """INSERT INTO auth_users
                   (id, email, password_hash, full_name, role, clearance, is_active)
               VALUES (%s,%s,'x','T',%s,%s,%s)""",
            (uid, f"{uid}@t4.example.com", role, clearance, active),
        )
        return make_user(clearance, role, active).model_copy(update={"id": uid})

    viewers = {
        "anonymous": None,
        "c0": add_user(0),
        "c1": add_user(1),
        "c2": add_user(2),
        "c3": add_user(3),
        "inactive_c3": add_user(3, active=False),
        "admin": add_user(0, role="admin"),
        "inactive_admin": add_user(3, role="admin", active=False),
        "grants": add_user(0),
        "inactive_grants": add_user(0, active=False),
    }
    # Expired, open-ended and future-expiry grants, on different analyses.
    grant_rows = {
        "grants": {
            "t4_3_null_on": None,
            "t4_2_fut_on": now + timedelta(days=5),
            "t4_1_null_on": now - timedelta(seconds=5),
            "t4_0_null_off": None,
            "t4_3_null_off": None,
        },
        "inactive_grants": {"t4_3_null_on": None, "t4_2_null_on": now + timedelta(days=5)},
        "c1": {"t4_3_fut_on": None, "t4_2_past_on": now - timedelta(days=2)},
    }
    for who, gs in grant_rows.items():
        for aid, exp in gs.items():
            cur.execute(
                "INSERT INTO analysis_grants (analysis_id, user_id, expires_at)"
                " VALUES (%s,%s,%s)",
                (aid, viewers[who].id, exp),
            )

    cur.execute("SELECT * FROM analyses WHERE id LIKE 't4\\_%'")
    rows = cur.fetchall()
    assert len(rows) == len(specs)

    def pure_ids(who, user):
        grants = grant_rows.get(who, {})
        return {
            row["id"]
            for row in rows
            if can_view(user, row, grants[row["id"]] if row["id"] in grants else "none", now)
        }

    for who, user in viewers.items():
        expected = pure_ids(who, user)
        sql, params = visible_analyses_sql(user)
        cur.execute(sql, params)
        got = {r["id"] for r in cur.fetchall() if r["id"].startswith("t4_")}
        assert got == expected, who

        # The detail variant agrees per id too.
        for row in rows:
            sql, params = visible_analyses_sql(user, analysis_id=row["id"])
            cur.execute(sql, params)
            assert (len(cur.fetchall()) == 1) == (row["id"] in expected), (who, row["id"])
