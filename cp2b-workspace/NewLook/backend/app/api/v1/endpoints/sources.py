"""
Sources of the data the platform shows: the registry every map layer and page
block cites, so the page can put a source button beside each one.
"""

import logging

from fastapi import APIRouter, HTTPException

from app.services.canonical_loader import load_data_sources
from app.services.data_sources import catalog

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", summary="Sources of every map layer and page block")
async def get_sources():
    try:
        return catalog(load_data_sources())
    except FileNotFoundError as e:
        logger.error(f"Source registry missing: {e}")
        raise HTTPException(status_code=503, detail="Source registry not available")
    except ValueError as e:
        logger.error(f"Source registry invalid: {e}")
        raise HTTPException(status_code=500, detail="Source registry invalid")
