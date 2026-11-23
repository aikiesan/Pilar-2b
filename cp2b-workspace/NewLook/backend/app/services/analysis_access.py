"""Who may see a registry analysis.

The rule lives twice on purpose: `can_view` (pure, easy to test) and
`visible_analyses_sql` (filters in the database so endpoints never fetch
what they must not show). A test keeps the two in agreement.

Rule:
- active admin: every analysis, active or not;
- anyone else: never an inactive analysis; an active one when the viewer
  level reaches the effective analysis level, or an unexpired grant exists;
- an inactive account counts as anonymous (level 0, grants open nothing).
"""

from datetime import datetime
from typing import Literal, Optional, TypedDict

from app.models.auth import UserProfile


class AnalysisRow(TypedDict, total=False):
    """Columns of `analyses` the rule reads (the row has more)."""

    id: str
    level: int
    opens_at: Optional[datetime]
    is_active: bool


def _is_active_user(user: Optional[UserProfile]) -> bool:
    return user is not None and user.is_active


def _is_admin(user: Optional[UserProfile]) -> bool:
    return _is_active_user(user) and user.role == "admin"


def viewer_level(user: Optional[UserProfile]) -> int:
    """0 without a user or with an inactive account, else the clearance."""
    if not _is_active_user(user):
        return 0
    return user.clearance


def effective_level(level: int, opens_at: Optional[datetime], now: datetime) -> int:
    """An analysis whose embargo ended is public."""
    if opens_at is not None and opens_at <= now:
        return 0
    return level


def can_view(
    user: Optional[UserProfile],
    analysis: AnalysisRow,
    grant_expires_at: Optional[datetime] | Literal["none"],
    now: datetime,
) -> bool:
    """`grant_expires_at`: "none" = no grant, None = grant that never expires."""
    if _is_admin(user):
        return True
    if not analysis["is_active"]:
        return False
    if viewer_level(user) >= effective_level(analysis["level"], analysis["opens_at"], now):
        return True
    if not _is_active_user(user) or isinstance(grant_expires_at, str):
        return False
    return grant_expires_at is None or grant_expires_at > now


def visible_analyses_sql(
    user: Optional[UserProfile], analysis_id: Optional[str] = None
) -> tuple[str, tuple]:
    """SELECT a.* FROM analyses filtered by the same rule, with the DB's now().

    `analysis_id` narrows to one row (detail endpoint). Values go only through
    placeholders. The grants lookup exists only for an active account, so an
    anonymous request never compares anything to a NULL user id.
    """
    sql = "SELECT a.* FROM analyses a WHERE "
    params: list = []
    if _is_admin(user):
        sql += "TRUE"
    else:
        level_ok = (
            "(CASE WHEN a.opens_at IS NOT NULL AND a.opens_at <= now() "
            "THEN 0 ELSE a.level END) <= %s"
        )
        params.append(viewer_level(user))
        if _is_active_user(user):
            granted = (
                "EXISTS (SELECT 1 FROM analysis_grants g "
                "WHERE g.analysis_id = a.id AND g.user_id = %s "
                "AND (g.expires_at IS NULL OR g.expires_at > now()))"
            )
            params.append(user.id)
            sql += f"a.is_active AND ({level_ok} OR {granted})"
        else:
            sql += f"a.is_active AND {level_ok}"
    if analysis_id is not None:
        sql += " AND a.id = %s"
        params.append(analysis_id)
    sql += " ORDER BY a.id"
    return sql, tuple(params)
