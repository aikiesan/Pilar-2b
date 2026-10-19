"""
Financing observatory (Estratégia 2027, C18): R$ per m³/day of biomethane
capacity from public BNDES approvals, and the capital share of a m³ produced.
"""

import logging

from fastapi import APIRouter, HTTPException

from app.services.canonical_loader import load_financing_params
from app.services.financing_service import summary

logger = logging.getLogger(__name__)
router = APIRouter()

NOTE = (
    "Só capital, sem O&M nem matéria-prima. Quando o investimento total não foi "
    "divulgado, o financiamento do BNDES é um limite inferior."
)


@router.get("/benchmarks", summary="CAPEX per m³/day of BNDES-financed biomethane plants")
async def get_financing_benchmarks():
    try:
        return {**summary(load_financing_params()), "note": NOTE}
    except FileNotFoundError as e:
        logger.error(f"Financing parameters missing: {e}")
        raise HTTPException(status_code=503, detail="Financing parameters not available")
