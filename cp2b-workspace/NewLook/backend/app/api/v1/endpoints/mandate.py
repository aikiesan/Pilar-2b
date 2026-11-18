"""
Biomethane mandate panel (Estratégia 2027, C26): the CNPE target of each year
against the biomethane Brazil and São Paulo produce (ANP, monthly).
"""

import logging

from fastapi import APIRouter, HTTPException

from app.services.canonical_loader import load_mandate_params
from app.services.mandate_service import panel

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/panel", summary="Mandate targets, ANP production and coverage")
async def get_mandate_panel():
    try:
        return panel(load_mandate_params())
    except FileNotFoundError as e:
        logger.error(f"Mandate parameters missing: {e}")
        raise HTTPException(status_code=503, detail="Mandate parameters not available")
    except ValueError as e:
        logger.error(f"Mandate parameters invalid: {e}")
        raise HTTPException(status_code=500, detail="Mandate parameters invalid")
