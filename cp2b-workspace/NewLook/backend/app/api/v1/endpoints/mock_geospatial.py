"""
PILAR-2b V3 - Mock Geospatial API Endpoints
Serves sample data (16 municipalities) for dashboard development
"""

from fastapi import APIRouter, HTTPException
from pathlib import Path
import json
from typing import Dict, Any

router = APIRouter()

# Load sample data once at startup
SAMPLE_DATA_PATH = Path(__file__).parent.parent.parent.parent / "data" / "sample_municipalities.json"

_sample_geojson = None


def load_sample_data() -> Dict[str, Any]:
    """Load sample GeoJSON data from file"""
    global _sample_geojson

    if _sample_geojson is None:
        if not SAMPLE_DATA_PATH.exists():
            raise FileNotFoundError(f"Sample data not found: {SAMPLE_DATA_PATH}")

        with open(SAMPLE_DATA_PATH, 'r', encoding='utf-8') as f:
            _sample_geojson = json.load(f)

    return _sample_geojson


@router.get("/municipalities/geojson")
async def get_municipalities_geojson():
    """
    Get sample municipalities as GeoJSON FeatureCollection

    Returns 16 municipalities from Araraquara region with Point geometries
    """
    try:
        geojson = load_sample_data()
        return geojson
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/municipalities")
async def get_municipalities_list():
    """
    Get list of municipalities with basic info (non-GeoJSON format)
    """
    try:
        geojson = load_sample_data()
        municipalities = []

        for feature in geojson['features']:
            props = feature['properties']
            municipalities.append({
                "id": props['id'],
                "name": props['name'],
                "ibge_code": props['ibge_code'],
                "population": props['population'],
                "total_biogas_m3_year": props['total_biogas_m3_year'],
                "potential_category": props['potential_category'],
                "immediate_region": props['immediate_region']
            })

        # Sort by biogas potential (descending)
        municipalities.sort(key=lambda x: x['total_biogas_m3_year'], reverse=True)

        return {
            "total": len(municipalities),
            "municipalities": municipalities
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/municipalities/{municipality_id}")
async def get_municipality_detail(municipality_id: str):
    """
    Get detailed information for a single municipality

    Args:
        municipality_id: IBGE code (e.g., "3503208" for Araraquara)
    """
    try:
        geojson = load_sample_data()

        # Find municipality by ID
        for feature in geojson['features']:
            if str(feature['properties']['id']) == municipality_id or \
               str(feature['properties']['ibge_code']) == municipality_id:
                return {
                    "type": "Feature",
                    "geometry": feature['geometry'],
                    "properties": feature['properties']
                }

        raise HTTPException(status_code=404, detail=f"Municipality {municipality_id} not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistics/summary")
async def get_summary_statistics():
    """
    Get summary statistics for sample municipalities
    """
    try:
        geojson = load_sample_data()
        features = geojson['features']

        # Calculate statistics
        total_biogas = sum(f['properties']['total_biogas_m3_year'] for f in features)
        total_population = sum(f['properties']['population'] for f in features)
        avg_biogas = total_biogas / len(features)

        # Find top municipalities
        sorted_features = sorted(features, key=lambda f: f['properties']['total_biogas_m3_year'], reverse=True)
        top_5 = sorted_features[:5]

        # Category distribution
        categories = {}
        for f in features:
            cat = f['properties']['potential_category'] or 'SEM DADOS'
            categories[cat] = categories.get(cat, 0) + 1

        # Sector breakdown (aggregate)
        total_agricultural = sum(f['properties']['agricultural_biogas_m3_year'] for f in features)
        total_livestock = sum(f['properties']['livestock_biogas_m3_year'] for f in features)
        total_urban = sum(f['properties']['urban_biogas_m3_year'] for f in features)

        return {
            "total_municipalities": len(features),
            "total_biogas_m3_year": total_biogas,
            "average_biogas_m3_year": avg_biogas,
            "total_population": total_population,
            "top_municipality": {
                "name": top_5[0]['properties']['name'],
                "biogas_m3_year": top_5[0]['properties']['total_biogas_m3_year']
            },
            "top_5_municipalities": [
                {
                    "name": f['properties']['name'],
                    "biogas_m3_year": f['properties']['total_biogas_m3_year']
                }
                for f in top_5
            ],
            "categories": categories,
            "sector_breakdown": {
                "agricultural": total_agricultural,
                "livestock": total_livestock,
                "urban": total_urban
            },
            "sector_percentages": {
                "agricultural": (total_agricultural / total_biogas * 100) if total_biogas > 0 else 0,
                "livestock": (total_livestock / total_biogas * 100) if total_biogas > 0 else 0,
                "urban": (total_urban / total_biogas * 100) if total_biogas > 0 else 0
            },
            "note": "Sample data - 16 municipalities from Araraquara region"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rankings")
async def get_rankings(
    limit: int = 10,
    criteria: str = "total"
):
    """
    Get ranked municipalities by different criteria

    Args:
        limit: Number of municipalities to return (default: 10)
        criteria: Ranking criteria - "total", "agricultural", "livestock", "urban"
    """
    try:
        geojson = load_sample_data()
        features = geojson['features']

        # Determine sort key based on criteria
        sort_keys = {
            "total": "total_biogas_m3_year",
            "agricultural": "agricultural_biogas_m3_year",
            "livestock": "livestock_biogas_m3_year",
            "urban": "urban_biogas_m3_year"
        }

        if criteria not in sort_keys:
            raise HTTPException(status_code=400, detail=f"Invalid criteria: {criteria}")

        sort_key = sort_keys[criteria]

        # Sort and limit
        sorted_features = sorted(
            features,
            key=lambda f: f['properties'][sort_key],
            reverse=True
        )[:limit]

        rankings = []
        for idx, feature in enumerate(sorted_features, 1):
            props = feature['properties']
            rankings.append({
                "rank": idx,
                "id": props['id'],
                "name": props['name'],
                "ibge_code": props['ibge_code'],
                "biogas_m3_year": props[sort_key],
                "population": props['population'],
                "category": props['potential_category']
            })

        return {
            "criteria": criteria,
            "total_ranked": len(rankings),
            "rankings": rankings
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        geojson = load_sample_data()
        return {
            "status": "healthy",
            "sample_municipalities": geojson['metadata']['total_municipalities'],
            "data_source": "PILAR-2b V2 (Sample)"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
