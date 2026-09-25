"""
Newsletter sign-ups, stored in the platform's database on the UNICAMP VM.

The site's three sign-up forms (footer, About page, cookie banner) post here.

LGPD: an address is stored only when the visitor subscribes (consent, art. 7 I),
together with the privacy notice version and the time, so the consent can be
demonstrated (art. 8 §1-2). Data-minimised: no IP address, no browser details.
Each address has an unsubscribe token for the link in the newsletter e-mails;
an admin can list or export the addresses, and every export is recorded in
auth_access_log (art. 37).
"""

import csv
import io
import logging
from datetime import datetime
from typing import List, Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import Response
from pydantic import BaseModel, EmailStr, Field

from app.core.database import get_db, get_db_transaction
from app.middleware.auth import require_admin
from app.middleware.rate_limit import auth_limiter, read_limiter
from app.models.auth import UserProfile
from app.services.auth_service import auth_service

logger = logging.getLogger(__name__)

router = APIRouter()

# The privacy notice version a sign-up agrees to. Bump it with the notice
# (frontend/src/app/[locale]/privacy/page.tsx) so each consent names its text.
CONSENT_TEXT_VERSION = "2026-09-25"

Locale = Literal["pt-BR", "en"]
Source = Literal["footer", "about", "cookie_banner"]


class SubscribeRequest(BaseModel):
    email: EmailStr = Field(max_length=254)
    locale: Locale = "pt-BR"
    source: Source
    # Privacy by default: the forms send true only on the visitor's own submit.
    consent: bool = False


class UnsubscribeRequest(BaseModel):
    token: UUID


class StatusResponse(BaseModel):
    status: Literal["subscribed", "unsubscribed"]


class Subscriber(BaseModel):
    email: str
    locale: str
    source: str
    consent_text_version: str
    consented_at: datetime
    unsubscribed_at: Optional[datetime] = None


class SubscriberList(BaseModel):
    active: int
    unsubscribed: int
    subscribers: List[Subscriber]


def _error(status_code: int, code: str, message: str) -> HTTPException:
    """An error the forms word in the page's language by its stable `code`."""
    return HTTPException(status_code=status_code, detail={"code": code, "message": message})


@router.post("/subscribe", response_model=StatusResponse)
@auth_limiter.limit("5/minute")
async def subscribe(request: Request, payload: SubscribeRequest):
    """
    Store an address for the newsletter.

    The answer is the same whether the address was new or already on the list,
    so the endpoint does not reveal who subscribed. Subscribing again renews the
    consent (notice version and time) and undoes an earlier unsubscribe.
    """
    if not payload.consent:
        raise _error(
            status.HTTP_403_FORBIDDEN,
            "consent_required",
            "An address is only stored when the visitor subscribes.",
        )
    try:
        with get_db_transaction() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO newsletter_subscribers (email, locale, source, consent_text_version)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (email) DO UPDATE SET
                    locale = EXCLUDED.locale,
                    source = EXCLUDED.source,
                    consent_text_version = EXCLUDED.consent_text_version,
                    consented_at = now(),
                    unsubscribed_at = NULL
                """,
                (payload.email, payload.locale, payload.source, CONSENT_TEXT_VERSION),
            )
    except Exception:
        logger.exception("Newsletter sign-up failed")
        raise _error(
            status.HTTP_500_INTERNAL_SERVER_ERROR, "server_error", "Could not save the sign-up"
        )
    return {"status": "subscribed"}


@router.post("/unsubscribe", response_model=StatusResponse)
@auth_limiter.limit("10/minute")
async def unsubscribe(request: Request, payload: UnsubscribeRequest):
    """
    Take an address off the list by the token in its unsubscribe link.

    Unsubscribing twice is fine; a token that matches no address is a 404 (it
    is random, so guessing one is not a way to learn who subscribed).
    """
    try:
        with get_db_transaction() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                UPDATE newsletter_subscribers
                SET unsubscribed_at = COALESCE(unsubscribed_at, now())
                WHERE unsubscribe_token = %s
                RETURNING id
                """,
                (str(payload.token),),
            )
            found = cur.fetchone()
    except Exception:
        logger.exception("Newsletter unsubscribe failed")
        raise _error(status.HTTP_500_INTERNAL_SERVER_ERROR, "server_error", "Could not unsubscribe")
    if found is None:
        raise _error(status.HTTP_404_NOT_FOUND, "invalid_token", "Unknown unsubscribe link")
    return {"status": "unsubscribed"}


# Spreadsheet programs run a cell that starts with one of these as a formula.
_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def _csv_cell(value: object) -> str:
    text = "" if value is None else str(value)
    return f"'{text}" if text.startswith(_FORMULA_PREFIXES) else text


def _subscribers_csv(rows: List[dict]) -> str:
    out = io.StringIO()
    writer = csv.writer(out)
    columns = list(Subscriber.model_fields)
    writer.writerow(columns)
    for row in rows:
        writer.writerow([_csv_cell(row.get(column)) for column in columns])
    return out.getvalue()


@router.get("/subscribers", response_model=SubscriberList)
@read_limiter.limit("30/minute")
async def list_subscribers(
    request: Request,
    output: Literal["json", "csv"] = Query(
        "json", alias="format", description="csv downloads a spreadsheet"
    ),
    include_unsubscribed: bool = Query(False),
    admin: UserProfile = Depends(require_admin),
):
    """The newsletter list (admin only). Every call is recorded in auth_access_log."""
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT count(*) FILTER (WHERE unsubscribed_at IS NULL) AS active,
                       count(*) FILTER (WHERE unsubscribed_at IS NOT NULL) AS unsubscribed
                FROM newsletter_subscribers
                """)
            counts = cur.fetchone()
            cur.execute(
                """
                SELECT email, locale, source, consent_text_version, consented_at, unsubscribed_at
                FROM newsletter_subscribers
                WHERE %s OR unsubscribed_at IS NULL
                ORDER BY consented_at DESC
                """,
                (include_unsubscribed,),
            )
            rows = [dict(row) for row in cur.fetchall()]
    except Exception:
        logger.exception("Newsletter list failed")
        raise _error(
            status.HTTP_500_INTERNAL_SERVER_ERROR, "server_error", "Could not read the list"
        )

    await auth_service.log_access(
        admin,
        "newsletter:subscribers",
        action="export" if output == "csv" else "list",
        ip_address=request.client.host if request.client else None,
    )

    if output == "csv":
        return Response(
            content=_subscribers_csv(rows),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": 'attachment; filename="newsletter-subscribers.csv"'},
        )
    return {
        "active": counts["active"],
        "unsubscribed": counts["unsubscribed"],
        "subscribers": rows,
    }
