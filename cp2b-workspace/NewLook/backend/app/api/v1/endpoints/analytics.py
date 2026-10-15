"""
First-party audience statistics, stored in the platform's database on the
UNICAMP VM: no third-party analytics service. Two layers:

- Anonymous totals, for every visit (/hit, /time; migration 038). No cookie, no
  identifier, nothing stored on the device: the browser sends the page path,
  the language, a device class, whether the page opened the visit (the first
  page of a page load) with the referring site's host, and later how long the
  page stayed visible. Only daily totals
  are kept, so no row can be tied to a person (LGPD art. 12).
- Consented page views (/pageview; migration 036), only after the visitor
  chose "Accept all" in the cookie banner (LGPD art. 7 I); "Essential only"
  deletes the statistics cookie and stops them. Pseudonymous and minimised: a
  random visitor id (first-party cookie, about 13 months), a random session
  id, and the same page fields. Rows older than ANALYTICS_RETENTION_DAYS are
  deleted.

No IP address or user-agent string is stored by either layer.
"""

import logging
import re
from datetime import date
from typing import List, Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from psycopg2 import sql
from pydantic import BaseModel, Field, field_validator

from app.core.config import settings
from app.core.database import get_db, get_db_transaction
from app.middleware.auth import require_admin
from app.middleware.rate_limit import read_limiter
from app.models.auth import UserProfile

logger = logging.getLogger(__name__)

router = APIRouter()

# A URL path as the browser sends it: percent-encoded, no query or fragment.
_PATH = re.compile(r"/[A-Za-z0-9\-._~%/]*")
_HOST = re.compile(r"[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*")
# One measurement of visible time counts at most half an hour: a tab left open
# in the foreground is not someone reading.
MAX_VISIBLE_SECONDS = 30 * 60
# The day a count belongs to, in the platform's time zone.
_TODAY = "(now() AT TIME ZONE 'America/Sao_Paulo')::date"


def _bare_path(value: str) -> str:
    # A query string can carry personal data (an e-mail in a link): never kept.
    value = value.split("?", 1)[0].split("#", 1)[0]
    if not _PATH.fullmatch(value):
        raise ValueError("not a URL path")
    return value


def _bare_host(value: Optional[str]) -> Optional[str]:
    # Only a host name; anything else (a full URL, a path) is dropped.
    if value is None:
        return None
    value = value.strip().lower()
    return value if _HOST.fullmatch(value) else None


class PageView(BaseModel):
    visitor_id: UUID
    session_id: UUID
    path: str = Field(min_length=1, max_length=300)
    locale: Literal["pt-BR", "en"]
    referrer_host: Optional[str] = Field(default=None, max_length=253)
    device: Literal["mobile", "tablet", "desktop"]

    _path = field_validator("path")(_bare_path)
    _host = field_validator("referrer_host")(_bare_host)


class Hit(BaseModel):
    """One page view, counted anonymously: no identifier of any kind."""

    path: str = Field(min_length=1, max_length=300)
    locale: Literal["pt-BR", "en"]
    device: Literal["mobile", "tablet", "desktop"]
    # The first page of a page load: entries count visits.
    entry: bool = False
    # Only an entry has a referring site; on any later page it is ignored.
    referrer_host: Optional[str] = Field(default=None, max_length=253)

    _path = field_validator("path")(_bare_path)
    _host = field_validator("referrer_host")(_bare_host)


class VisibleTime(BaseModel):
    """How long one view of a page stayed visible, counted anonymously."""

    path: str = Field(min_length=1, max_length=300)
    seconds: int = Field(ge=1, le=24 * 60 * 60)

    _path = field_validator("path")(_bare_path)


class Count(BaseModel):
    key: str
    views: int
    visitors: int


class Day(BaseModel):
    day: date
    views: int
    visitors: int


class Summary(BaseModel):
    days: int
    views: int
    visitors: int
    sessions: int
    per_day: List[Day]
    pages: List[Count]
    locales: List[Count]
    devices: List[Count]
    referrers: List[Count]


_last_purge: Optional[date] = None


def _purge_expired(cur) -> None:
    """Once a day per worker, delete the page views past the retention period."""
    global _last_purge
    today = date.today()
    if _last_purge == today:
        return
    cur.execute(
        "DELETE FROM analytics_pageviews WHERE occurred_at < now() - make_interval(days => %s)",
        (settings.ANALYTICS_RETENTION_DAYS,),
    )
    _last_purge = today


@router.post("/pageview", status_code=status.HTTP_204_NO_CONTENT)
@read_limiter.limit("120/minute")
async def record_pageview(request: Request, view: PageView):
    """Record one page view (sent by the browser only with the visitor's consent)."""
    try:
        with get_db_transaction() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO analytics_pageviews
                    (visitor_id, session_id, path, locale, referrer_host, device)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    str(view.visitor_id),
                    str(view.session_id),
                    view.path,
                    view.locale,
                    view.referrer_host,
                    view.device,
                ),
            )
            _purge_expired(cur)
    except Exception:
        logger.exception("Page view not recorded")
        raise HTTPException(status_code=500, detail="Could not record the page view")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/hit", status_code=status.HTTP_204_NO_CONTENT)
@read_limiter.limit("120/minute")
async def record_hit(request: Request, hit: Hit):
    """Add one view to the anonymous daily totals (sent for every visitor)."""
    try:
        with get_db_transaction() as conn:
            conn.cursor().execute(
                f"""
                INSERT INTO analytics_page_counts
                    (day, path, locale, device, entry, referrer_host, views)
                VALUES ({_TODAY}, %s, %s, %s, %s, %s, 1)
                ON CONFLICT (day, path, locale, device, entry, referrer_host)
                DO UPDATE SET views = analytics_page_counts.views + 1
                """,
                (
                    hit.path,
                    hit.locale,
                    hit.device,
                    hit.entry,
                    (hit.referrer_host or "") if hit.entry else "",
                ),
            )
    except Exception:
        logger.exception("Anonymous page view not counted")
        raise HTTPException(status_code=500, detail="Could not count the page view")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/time", status_code=status.HTTP_204_NO_CONTENT)
@read_limiter.limit("120/minute")
async def record_visible_time(request: Request, measured: VisibleTime):
    """Add the visible time of one page view to the anonymous daily totals."""
    try:
        with get_db_transaction() as conn:
            conn.cursor().execute(
                f"""
                INSERT INTO analytics_page_time (day, path, seconds)
                VALUES ({_TODAY}, %s, %s)
                ON CONFLICT (day, path)
                DO UPDATE SET seconds = analytics_page_time.seconds + EXCLUDED.seconds
                """,
                (measured.path, min(measured.seconds, MAX_VISIBLE_SECONDS)),
            )
    except Exception:
        logger.exception("Visible time not counted")
        raise HTTPException(status_code=500, detail="Could not count the visible time")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


_COUNT_BY = sql.SQL("""
    SELECT {column} AS key, count(*) AS views, count(DISTINCT visitor_id) AS visitors
    FROM analytics_pageviews
    WHERE occurred_at >= now() - make_interval(days => %s) AND {column} IS NOT NULL
    GROUP BY {column}
    ORDER BY views DESC, key
    LIMIT %s
    """)


def _counts(
    cur, column: Literal["path", "locale", "device", "referrer_host"], days: int, limit: int
):
    cur.execute(_COUNT_BY.format(column=sql.Identifier(column)), (days, limit))
    return [dict(row) for row in cur.fetchall()]


@router.get("/summary", response_model=Summary)
@read_limiter.limit("30/minute")
async def summary(
    request: Request,
    days: int = Query(30, ge=1, le=400),
    admin: UserProfile = Depends(require_admin),
):
    """Audience over the last `days` days (admin only): totals, per day, top pages."""
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT count(*) AS views,
                       count(DISTINCT visitor_id) AS visitors,
                       count(DISTINCT session_id) AS sessions
                FROM analytics_pageviews
                WHERE occurred_at >= now() - make_interval(days => %s)
                """,
                (days,),
            )
            totals = dict(cur.fetchone())
            cur.execute(
                """
                SELECT (occurred_at AT TIME ZONE 'America/Sao_Paulo')::date AS day,
                       count(*) AS views, count(DISTINCT visitor_id) AS visitors
                FROM analytics_pageviews
                WHERE occurred_at >= now() - make_interval(days => %s)
                GROUP BY 1
                ORDER BY 1
                """,
                (days,),
            )
            per_day = [dict(row) for row in cur.fetchall()]
            pages = _counts(cur, "path", days, 20)
            locales = _counts(cur, "locale", days, 5)
            devices = _counts(cur, "device", days, 5)
            referrers = _counts(cur, "referrer_host", days, 10)
    except Exception:
        logger.exception("Analytics summary failed")
        raise HTTPException(status_code=500, detail="Could not read the statistics")
    return {
        "days": days,
        **totals,
        "per_day": per_day,
        "pages": pages,
        "locales": locales,
        "devices": devices,
        "referrers": referrers,
    }
