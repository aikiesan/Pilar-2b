"""/admin/analyses: the admin sets each analysis level, opening date and grants.

Every route needs an admin and answers `Cache-Control: private, no-store`
(also set for errors by `app.middleware.no_store`). Unlike the public
/analyses routes, a missing analysis or person is a plain 404: only an admin
gets this far, so there is nothing to hide.
"""

import re
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Response, status
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel, Field, field_validator, model_validator

from app.core.database import get_db, get_db_transaction
from app.middleware.auth import require_admin
from app.models.auth import UserProfile

router = APIRouter()

NO_STORE = {"Cache-Control": "private, no-store"}
_ID_RE = re.compile(r"[a-z0-9_]{1,40}")

_ANALYSIS_COLS = "id, title_pt, level, opens_at, is_active"
_GRANT_SELECT = """
    SELECT g.user_id::text AS user_id, u.full_name, u.email,
           gb.full_name AS granted_by_name, g.granted_at, g.expires_at, g.note
      FROM analysis_grants g
      JOIN auth_users u ON u.id = g.user_id
      LEFT JOIN auth_users gb ON gb.id = g.granted_by
"""


def _aware(value: Optional[datetime]) -> Optional[datetime]:
    # A date without an offset would be read in the server's zone: refuse it.
    if value is not None and value.utcoffset() is None:
        raise ValueError("datetime must include a timezone offset")
    return value


class AnalysisPatch(BaseModel):
    """Only the fields sent change. `opens_at: null` clears the opening date."""

    level: Optional[int] = Field(None, ge=0, le=3)
    opens_at: Optional[datetime] = None
    is_active: Optional[bool] = None

    _opens_at_aware = field_validator("opens_at")(_aware)

    @model_validator(mode="after")
    def _something_to_change(self):
        sent = self.model_fields_set
        if not sent:
            raise ValueError("send at least one of level, opens_at, is_active")
        # level and is_active are NOT NULL columns: null is not a way to clear them.
        for name in ("level", "is_active"):
            if name in sent and getattr(self, name) is None:
                raise ValueError(f"{name} cannot be null")
        return self


class GrantBody(BaseModel):
    expires_at: Optional[datetime] = None
    note: Optional[str] = Field(None, max_length=200)

    _expires_aware = field_validator("expires_at")(_aware)


def _not_found(what: str) -> HTTPException:
    return HTTPException(status_code=404, detail=f"{what} not found", headers=NO_STORE)


def _check_ids(analysis_id: str, user_id: Optional[str] = None) -> Optional[str]:
    # Malformed ids are plain 404s and never reach the database (a bad UUID
    # would raise a driver error there). Returns the user id in canonical
    # form (a urn:uuid: or upper-case spelling parses), which is what every
    # query must use.
    if not _ID_RE.fullmatch(analysis_id):
        raise _not_found("Analysis")
    if user_id is None:
        return None
    try:
        return str(uuid.UUID(user_id))
    except ValueError:
        raise _not_found("User")


def _analysis_exists(cur, analysis_id: str) -> bool:
    cur.execute("SELECT 1 AS ok FROM analyses WHERE id = %s", (analysis_id,))
    return cur.fetchone() is not None


@router.get("")
def list_admin_analyses(response: Response, admin: UserProfile = Depends(require_admin)) -> list:
    response.headers.update(NO_STORE)
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute("""
                SELECT a.id, a.title_pt, a.level, a.opens_at, a.is_active,
                       (SELECT count(*) FROM analysis_classes c
                         WHERE c.analysis_id = a.id AND c.cell IS NOT NULL) AS municipalities,
                       (SELECT count(*) FROM analysis_grants g
                         WHERE g.analysis_id = a.id
                           AND (g.expires_at IS NULL OR g.expires_at > now())) AS grants
                  FROM analyses a
                 ORDER BY a.id
                """)
            rows = cur.fetchall()
        finally:
            cur.close()
    return [dict(r) for r in rows]


@router.patch("/{analysis_id}")
def patch_analysis(
    analysis_id: str,
    payload: AnalysisPatch,
    response: Response,
    admin: UserProfile = Depends(require_admin),
) -> dict:
    response.headers.update(NO_STORE)
    _check_ids(analysis_id)
    # Column names come from this fixed list, never from the request.
    sets, params = [], []
    for column in ("level", "opens_at", "is_active"):
        if column in payload.model_fields_set:
            sets.append(f"{column} = %s")
            params.append(getattr(payload, column))
    sets += ["updated_by = %s", "updated_at = now()"]
    params += [admin.id, analysis_id]
    with get_db_transaction() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute(
                f"UPDATE analyses SET {', '.join(sets)} WHERE id = %s"
                f" RETURNING {_ANALYSIS_COLS}",
                params,
            )
            row = cur.fetchone()
        finally:
            cur.close()
    if row is None:
        raise _not_found("Analysis")
    return dict(row)


@router.get("/{analysis_id}/grants")
def list_grants(
    analysis_id: str, response: Response, admin: UserProfile = Depends(require_admin)
) -> list:
    response.headers.update(NO_STORE)
    _check_ids(analysis_id)
    with get_db() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            if not _analysis_exists(cur, analysis_id):
                raise _not_found("Analysis")
            cur.execute(
                _GRANT_SELECT + " WHERE g.analysis_id = %s ORDER BY u.full_name, u.email",
                (analysis_id,),
            )
            rows = cur.fetchall()
        finally:
            cur.close()
    return [dict(r) for r in rows]


@router.put("/{analysis_id}/grants/{user_id}")
def put_grant(
    analysis_id: str,
    user_id: str,
    response: Response,
    body: GrantBody = Body(default_factory=GrantBody),
    admin: UserProfile = Depends(require_admin),
) -> dict:
    response.headers.update(NO_STORE)
    user_id = _check_ids(analysis_id, user_id) or user_id
    with get_db_transaction() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            if not _analysis_exists(cur, analysis_id):
                raise _not_found("Analysis")
            cur.execute("SELECT 1 AS ok FROM auth_users WHERE id = %s", (user_id,))
            if cur.fetchone() is None:
                raise _not_found("User")
            # A grant for an inactive account is fine: it opens nothing until
            # the account is active again. Re-granting records the latest admin
            # and time, so the list shows who last touched it.
            cur.execute(
                """
                INSERT INTO analysis_grants (analysis_id, user_id, granted_by, expires_at, note)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (analysis_id, user_id) DO UPDATE
                   SET granted_by = EXCLUDED.granted_by, granted_at = now(),
                       expires_at = EXCLUDED.expires_at, note = EXCLUDED.note
                """,
                (analysis_id, user_id, admin.id, body.expires_at, body.note),
            )
            cur.execute(
                _GRANT_SELECT + " WHERE g.analysis_id = %s AND g.user_id = %s",
                (analysis_id, user_id),
            )
            row = cur.fetchone()
        finally:
            cur.close()
    return dict(row)


@router.delete("/{analysis_id}/grants/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_grant(
    analysis_id: str,
    user_id: str,
    admin: UserProfile = Depends(require_admin),
) -> Response:
    user_id = _check_ids(analysis_id, user_id) or user_id
    with get_db_transaction() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                "DELETE FROM analysis_grants WHERE analysis_id = %s AND user_id = %s"
                " RETURNING 1 AS ok",
                (analysis_id, user_id),
            )
            found = cur.fetchone()
        finally:
            cur.close()
    if found is None:
        raise _not_found("Grant")
    return Response(status_code=status.HTTP_204_NO_CONTENT, headers=NO_STORE)
