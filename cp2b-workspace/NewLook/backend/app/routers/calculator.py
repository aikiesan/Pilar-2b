"""
CP2B Biogas Viability Calculator Router
Lead capture + calculation persistence for the farm-level viability tool.
"""

from fastapi import APIRouter, Request
from pydantic import BaseModel, EmailStr
from typing import Optional, Any
import json

from app.core.database import get_db_transaction

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class LeadData(BaseModel):
    nome: str
    email: str
    cpf_cnpj: Optional[str] = None
    municipality_id: Optional[int] = None
    municipality_name: Optional[str] = None
    consent_lgpd: bool = True


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


# ── Endpoint ─────────────────────────────────────────────────────────────────

@router.post("/submit")
async def submit_calculator(payload: CalculatorSubmission, request: Request):
    """
    Persist a calculator lead + results snapshot.
    Returns the generated lead_id so the frontend can reference it later.
    """
    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    referrer = request.headers.get("referer")

    with get_db_transaction() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO calculator_leads (
                nome, email, cpf_cnpj,
                municipality_id, municipality_name, consent_lgpd,
                activity_type, quantity_input, active_months,
                outputs_selected, calc_results,
                ip_address, user_agent, referrer
            ) VALUES (
                %s, %s, %s,
                %s, %s, %s,
                %s, %s::jsonb, %s::integer[],
                %s::text[], %s::jsonb,
                %s, %s, %s
            )
            RETURNING id, created_at
            """,
            (
                payload.lead.nome,
                payload.lead.email,
                payload.lead.cpf_cnpj,
                payload.lead.municipality_id,
                payload.lead.municipality_name,
                payload.lead.consent_lgpd,
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
        "lead_id": str(row[0]),
        "created_at": row[1].isoformat(),
        "results": payload.calc_results,
    }
