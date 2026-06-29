"""
CP2B Biogas Viability Calculator Router
Lead capture + calculation persistence for the farm-level viability tool.

LGPD note: personal data (name, e-mail) is only persisted when the data subject
gives EXPLICIT consent. Data minimisation (LGPD Art. 6 III): CPF/CNPJ are NOT
collected — they are unnecessary for a viability tool. Consent is opt-in by default
(privacy by default) and is stored with the notice version and a timestamp so
it is demonstrable (LGPD Art. 8 §1). Data subjects can access and erase their
record via the endpoints below (LGPD Art. 18).
"""

from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime, timezone
import json

from app.core.database import get_db_transaction, get_db

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
    type: str   # 'tons' | 'hectares' | 'heads'
    value: float
    species_breakdown: Optional[dict[str, float]] = None


class CalculatorSubmission(BaseModel):
    lead: LeadData
    activity_type: str
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
async def get_lead(lead_id: int):
    """
    Data-subject ACCESS right (LGPD Art. 18 II).
    Returns the personal data stored for a given lead_id so the data subject can
    review exactly what is held about them.
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
            WHERE id = %s
            """,
            (lead_id,),
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
async def delete_lead(lead_id: int):
    """
    Data-subject ERASURE right (LGPD Art. 18 VI).
    Hard-deletes the lead record. Idempotent: returns deleted=false if the record
    did not exist.
    """
    with get_db_transaction() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM calculator_leads WHERE id = %s RETURNING id",
            (lead_id,),
        )
        deleted = cursor.fetchone()

    return {
        "lead_id": str(lead_id),
        "deleted": deleted is not None,
    }
