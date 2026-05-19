"""
Maps and geospatial data API endpoints
"""
from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.get("/layers")
async def get_available_layers():
    """Get available map layers"""
    return {
        "layers": [
            {
                "id": "municipalities",
                "name": "Municípios SP",
                "type": "vector",
                "description": "Boundaries of São Paulo municipalities",
                "url": "/api/v1/maps/layers/municipalities/geojson"
            },
            {
                "id": "biogas_potential",
                "name": "Potencial de Biogás",
                "type": "choropleth",
                "description": "Biogas potential by municipality",
                "url": "/api/v1/maps/layers/biogas_potential/geojson"
            },
            {
                "id": "biomass_sources",
                "name": "Fontes de Biomassa",
                "type": "points",
                "description": "Agricultural and waste biomass sources",
                "url": "/api/v1/maps/layers/biomass_sources/geojson"
            }
        ]
    }

@router.get("/layers/{layer_id}/geojson")
async def get_layer_geojson(layer_id: str):
    """Get GeoJSON data for a specific layer"""

    # Sample GeoJSON for municipalities
    if layer_id == "municipalities":
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "id": 1,
                        "name": "São Paulo",
                        "population": 12396372,
                        "biogas_potential": 850.5
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [-46.8, -23.4],
                            [-46.3, -23.4],
                            [-46.3, -23.8],
                            [-46.8, -23.8],
                            [-46.8, -23.4]
                        ]]
                    }
                }
            ]
        }

    # Sample points for biomass sources
    elif layer_id == "biomass_sources":
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "id": 1,
                        "name": "Fazenda São João",
                        "type": "agricultural",
                        "capacity": 150.5
                    },
                    "geometry": {
                        "type": "Point",
                        "coordinates": [-46.6333, -23.5505]
                    }
                }
            ]
        }

    else:
        raise HTTPException(status_code=404, detail=f"Layer {layer_id} not found")

@router.get("/bounds")
async def get_map_bounds():
    """Get default map bounds for São Paulo state"""
    return {
        "bounds": {
            "north": -19.8,
            "south": -25.3,
            "east": -44.2,
            "west": -53.1
        },
        "center": {
            "lat": -22.55,
            "lng": -48.65
        },
        "zoom": 7
    }