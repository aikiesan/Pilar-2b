"""
Integration tests for Maps API endpoints.
Covers /maps/layers, /maps/layers/{layer_id}/geojson, and /maps/bounds.

maps.py serves purely static/hardcoded data — no database dependency —
so these tests focus on routing, response structure, and edge-case IDs.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# ─── /maps/layers ─────────────────────────────────────────────────────────────


@pytest.mark.integration
class TestGetAvailableLayers:
    """Tests for GET /api/v1/maps/layers"""

    def test_layers_returns_200(self):
        """Endpoint returns HTTP 200."""
        response = client.get("/api/v1/maps/layers")
        assert response.status_code == 200

    def test_layers_has_layers_key(self):
        """Response body contains a top-level 'layers' list."""
        response = client.get("/api/v1/maps/layers")
        data = response.json()
        assert "layers" in data
        assert isinstance(data["layers"], list)

    def test_layers_count(self):
        """Three layers are defined: municipalities, biogas_potential, biomass_sources."""
        response = client.get("/api/v1/maps/layers")
        layers = response.json()["layers"]
        assert len(layers) == 3

    def test_layers_required_fields(self):
        """Each layer contains id, name, type, description, and url."""
        response = client.get("/api/v1/maps/layers")
        layers = response.json()["layers"]
        for layer in layers:
            for field in ("id", "name", "type", "description", "url"):
                assert field in layer, f"Missing field '{field}' in layer {layer.get('id')}"

    def test_layers_municipalities_present(self):
        """'municipalities' layer exists with correct type."""
        response = client.get("/api/v1/maps/layers")
        ids = {layer["id"] for layer in response.json()["layers"]}
        assert "municipalities" in ids

    def test_layers_biogas_potential_present(self):
        """'biogas_potential' choropleth layer is listed."""
        response = client.get("/api/v1/maps/layers")
        layer = next(
            (l for l in response.json()["layers"] if l["id"] == "biogas_potential"),
            None,
        )
        assert layer is not None
        assert layer["type"] == "choropleth"

    def test_layers_biomass_sources_present(self):
        """'biomass_sources' points layer is listed."""
        response = client.get("/api/v1/maps/layers")
        layer = next(
            (l for l in response.json()["layers"] if l["id"] == "biomass_sources"),
            None,
        )
        assert layer is not None
        assert layer["type"] == "points"

    def test_layers_urls_point_to_geojson_endpoint(self):
        """Each layer's url references the /geojson endpoint."""
        response = client.get("/api/v1/maps/layers")
        for layer in response.json()["layers"]:
            assert (
                "/geojson" in layer["url"]
            ), f"Layer '{layer['id']}' url does not contain '/geojson': {layer['url']}"


# ─── /maps/layers/{layer_id}/geojson ─────────────────────────────────────────


@pytest.mark.integration
class TestGetLayerGeoJSON:
    """Tests for GET /api/v1/maps/layers/{layer_id}/geojson"""

    # ── municipalities ────────────────────────────────────────────────────────

    def test_municipalities_returns_200(self):
        """municipalities layer returns HTTP 200."""
        response = client.get("/api/v1/maps/layers/municipalities/geojson")
        assert response.status_code == 200

    def test_municipalities_geojson_structure(self):
        """Response is a valid GeoJSON FeatureCollection."""
        response = client.get("/api/v1/maps/layers/municipalities/geojson")
        data = response.json()
        assert data["type"] == "FeatureCollection"
        assert "features" in data
        assert isinstance(data["features"], list)
        assert len(data["features"]) > 0

    def test_municipalities_feature_structure(self):
        """Each Feature has type, properties, and geometry."""
        response = client.get("/api/v1/maps/layers/municipalities/geojson")
        feature = response.json()["features"][0]
        assert feature["type"] == "Feature"
        assert "properties" in feature
        assert "geometry" in feature

    def test_municipalities_properties(self):
        """Municipality feature properties contain id, name, population, biogas_potential."""
        response = client.get("/api/v1/maps/layers/municipalities/geojson")
        props = response.json()["features"][0]["properties"]
        for key in ("id", "name", "population", "biogas_potential"):
            assert key in props, f"Missing property '{key}'"

    def test_municipalities_geometry_type(self):
        """Municipality geometry is a Polygon."""
        response = client.get("/api/v1/maps/layers/municipalities/geojson")
        geom = response.json()["features"][0]["geometry"]
        assert geom["type"] == "Polygon"
        assert "coordinates" in geom

    # ── biomass_sources ───────────────────────────────────────────────────────

    def test_biomass_sources_returns_200(self):
        """biomass_sources layer returns HTTP 200."""
        response = client.get("/api/v1/maps/layers/biomass_sources/geojson")
        assert response.status_code == 200

    def test_biomass_sources_geojson_structure(self):
        """Response is a valid GeoJSON FeatureCollection."""
        response = client.get("/api/v1/maps/layers/biomass_sources/geojson")
        data = response.json()
        assert data["type"] == "FeatureCollection"
        assert isinstance(data["features"], list)
        assert len(data["features"]) > 0

    def test_biomass_sources_geometry_type(self):
        """biomass_sources feature geometry is a Point."""
        response = client.get("/api/v1/maps/layers/biomass_sources/geojson")
        geom = response.json()["features"][0]["geometry"]
        assert geom["type"] == "Point"
        assert len(geom["coordinates"]) == 2

    def test_biomass_sources_properties(self):
        """biomass_sources feature properties contain id, name, type, capacity."""
        response = client.get("/api/v1/maps/layers/biomass_sources/geojson")
        props = response.json()["features"][0]["properties"]
        for key in ("id", "name", "type", "capacity"):
            assert key in props, f"Missing property '{key}'"

    # ── unknown layer ─────────────────────────────────────────────────────────

    def test_unknown_layer_returns_404(self):
        """Requesting an unknown layer id returns HTTP 404."""
        response = client.get("/api/v1/maps/layers/nonexistent_layer/geojson")
        assert response.status_code == 404

    def test_unknown_layer_error_message(self):
        """404 response body contains the unknown layer id."""
        layer_id = "totally_made_up"
        response = client.get(f"/api/v1/maps/layers/{layer_id}/geojson")
        assert response.status_code == 404
        detail = response.json()["detail"]
        assert layer_id in detail

    def test_biogas_potential_layer_not_implemented(self):
        """biogas_potential is listed but has no sample data — returns 404."""
        response = client.get("/api/v1/maps/layers/biogas_potential/geojson")
        # The endpoint only handles 'municipalities' and 'biomass_sources';
        # everything else raises a 404.
        assert response.status_code == 404


# ─── /maps/bounds ─────────────────────────────────────────────────────────────


@pytest.mark.integration
class TestGetMapBounds:
    """Tests for GET /api/v1/maps/bounds"""

    def test_bounds_returns_200(self):
        """Endpoint returns HTTP 200."""
        response = client.get("/api/v1/maps/bounds")
        assert response.status_code == 200

    def test_bounds_top_level_keys(self):
        """Response contains 'bounds', 'center', and 'zoom'."""
        response = client.get("/api/v1/maps/bounds")
        data = response.json()
        assert "bounds" in data
        assert "center" in data
        assert "zoom" in data

    def test_bounds_cardinal_directions(self):
        """bounds object has north, south, east, west keys."""
        response = client.get("/api/v1/maps/bounds")
        bounds = response.json()["bounds"]
        for direction in ("north", "south", "east", "west"):
            assert direction in bounds, f"Missing key '{direction}'"

    def test_bounds_north_greater_than_south(self):
        """north latitude is numerically greater than south latitude."""
        response = client.get("/api/v1/maps/bounds")
        bounds = response.json()["bounds"]
        assert bounds["north"] > bounds["south"]

    def test_bounds_east_greater_than_west(self):
        """east longitude is numerically greater than west longitude."""
        response = client.get("/api/v1/maps/bounds")
        bounds = response.json()["bounds"]
        assert bounds["east"] > bounds["west"]

    def test_center_has_lat_lng(self):
        """center object contains lat and lng."""
        response = client.get("/api/v1/maps/bounds")
        center = response.json()["center"]
        assert "lat" in center
        assert "lng" in center

    def test_center_within_bounds(self):
        """Center coordinates fall inside the reported bounding box."""
        response = client.get("/api/v1/maps/bounds")
        data = response.json()
        bounds = data["bounds"]
        center = data["center"]
        assert bounds["south"] <= center["lat"] <= bounds["north"]
        assert bounds["west"] <= center["lng"] <= bounds["east"]

    def test_zoom_is_positive_integer(self):
        """zoom is a positive integer."""
        response = client.get("/api/v1/maps/bounds")
        zoom = response.json()["zoom"]
        assert isinstance(zoom, int)
        assert zoom > 0
