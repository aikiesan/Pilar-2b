"""
CP2B Biogas Viability Calculator Router
Lead capture + calculation persistence for the farm-level viability tool.

LGPD note: personal data (name, e-mail) is only persisted when the data subject
gives EXPLICIT consent. Data minimisation (LGPD Art. 6 III): CPF/CNPJ are NOT
collected — they are unnecessary for a viability tool. Consent is opt-in by default
(privacy by default) and is stored with the notice version and a timestamp so
it is demonstrable (LGPD Art. 8 §1). Data subjects can access and erase their
record via the endpoints below (LGPD Art. 18).

Access/erasure verification: there is no user auth system in this app, so the
data-subject endpoints require the e-mail stored on the lead as a verification
factor. lead_id alone is a guessable sequential integer; requiring the matching
e-mail keeps the endpoints exercisable by the data subject (who knows their own
e-mail and received the lead_id at submission time) but not by an enumerating
third party. Mismatches return the same 404 / deleted=false as a nonexistent
id, so the endpoints do not leak which lead_ids exist.
"""

import json
from datetime import datetime, timezone
from typing import Any, Literal, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel

from app.core.database import get_db, get_db_transaction

router = APIRouter()

# Version tag of the privacy notice in force. Bump when the notice text changes
# so we can prove exactly what each data subject agreed to.
CONSENT_TEXT_VERSION = "2026-06-25"


# ── Schemas ──────────────────────────────────────────────────────────────────


class LeadData(BaseModel):
    nome: str
    email: str
    municipality_id: Optional[int] = None
    municipality_name: Optional[str] = None
    # Privacy by default: consent must be an explicit opt-in from the client.
    consent_lgpd: bool = False


class QuantityInput(BaseModel):
    type: str  # 'tons' | 'hectares' | 'heads'
    value: float
    species_breakdown: Optional[dict[str, float]] = None


class CalculatorSubmission(BaseModel):
    lead: LeadData
    # Mirrors the calculator_leads_activity_type_check DB constraint so invalid
    # values are rejected as 422 at the schema instead of a 500 CheckViolation.
    activity_type: Literal[
        "sugarcane",
        "swine",
        "cattle_beef",
        "cattle_dairy",
        "poultry_eggs",
        "poultry_meat",
        "mixed",
    ]
    quantity_input: QuantityInput
    active_months: list[int]
    outputs_selected: list[str]
    calc_results: dict[str, Any]


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.post("/submit")
async def submit_calculator(payload: CalculatorSubmission, request: Request):
    """
    Persist a calculator lead + results snapshot.

    Requires EXPLICIT LGPD consent: if ``lead.consent_lgpd`` is not True the
    request is rejected and nothing is stored. Returns the generated lead_id so
    the frontend can reference it later (and the data subject can use it to
    exercise access/erasure rights).
    """
    # Consent gate — refuse to store personal data without an explicit opt-in.
    if not payload.lead.consent_lgpd:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "Consent required",
                "code": "LGPD_CONSENT_REQUIRED",
                "suggestion": (
                    "Personal data is only stored with explicit consent. "
                    "Set lead.consent_lgpd = true after the user accepts the "
                    "privacy notice."
                ),
            },
        )

    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    referrer = request.headers.get("referer")
    consented_at = datetime.now(timezone.utc)

    with get_db_transaction() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO calculator_leads (
                nome, email,
                municipality_id, municipality_name, consent_lgpd,
                consent_text_version, consented_at,
                activity_type, quantity_input, active_months,
                outputs_selected, calc_results,
                ip_address, user_agent, referrer
            ) VALUES (
                %s, %s,
                %s, %s, %s,
                %s, %s,
                %s, %s::jsonb, %s::integer[],
                %s::text[], %s::jsonb,
                %s, %s, %s
            )
            RETURNING id, created_at
            """,
            (
                payload.lead.nome,
                payload.lead.email,
                payload.lead.municipality_id,
                payload.lead.municipality_name,
                payload.lead.consent_lgpd,
                CONSENT_TEXT_VERSION,
                consented_at,
                payload.activity_type,
                json.dumps(payload.quantity_input.model_dump()),
                payload.active_months,
                payload.outputs_selected,
                json.dumps(payload.calc_results),
                ip,
                user_agent,
                referrer,
            ),
        )
        row = cursor.fetchone()

    return {
        "lead_id": str(row["id"]),
        "created_at": row["created_at"].isoformat(),
        "consent_text_version": CONSENT_TEXT_VERSION,
        "results": payload.calc_results,
    }


@router.get("/leads/{lead_id}")
async def get_lead(
    # calculator_leads.id is a UUID (see /submit, which returns it as a string);
    # typing it as int made every real access request fail with 422.
    lead_id: UUID,
    email: str = Query(
        ...,
        description=(
            "E-mail stored on the lead — identity verification for the data "
            "subject. Must match the e-mail submitted with the lead."
        ),
    ),
):
    """
    Data-subject ACCESS right (LGPD Art. 18 II).
    Returns the personal data stored for a given lead_id so the data subject can
    review exactly what is held about them. Requires the lead's own e-mail as a
    verification factor; a mismatch is indistinguishable from a nonexistent id.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, nome, email,
                   municipality_id, municipality_name,
                   consent_lgpd, consent_text_version, consented_at,
                   activity_type, ip_address, user_agent, referrer, created_at
            FROM calculator_leads
            WHERE id = %s AND LOWER(email) = LOWER(%s)
            """,
            (str(lead_id), email.strip()),
        )
        row = cursor.fetchone()
        cursor.close()

    if row is None:
        raise HTTPException(status_code=404, detail={"error": "Lead not found"})

    # Normalise timestamps for JSON.
    record = dict(row)
    for key in ("consented_at", "created_at"):
        if record.get(key) is not None:
            record[key] = record[key].isoformat()
    return record


@router.delete("/leads/{lead_id}")
async def delete_lead(
    lead_id: UUID,
    email: str = Query(
        ...,
        description=(
            "E-mail stored on the lead — identity verification for the data "
            "subject. Must match the e-mail submitted with the lead."
        ),
    ),
):
    """
    Data-subject ERASURE right (LGPD Art. 18 VI).
    Hard-deletes the lead record. Requires the lead's own e-mail as a
    verification factor. Idempotent: returns deleted=false if the record did
    not exist — or if the e-mail does not match (indistinguishable on purpose).
    """
    with get_db_transaction() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM calculator_leads WHERE id = %s AND LOWER(email) = LOWER(%s) "
            "RETURNING id",
            (str(lead_id), email.strip()),
        )
        deleted = cursor.fetchone()

    return {
        "lead_id": str(lead_id),
        "deleted": deleted is not None,
    }
