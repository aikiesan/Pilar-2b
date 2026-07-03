"""
OGC ACCEPTANCE tests — do the PILAR-2b layers actually behave correctly?

Domain acceptance criteria over the live OGC services: a real (non-blank) map is
rendered for the biogas layer, WFS returns features with the expected attributes
and CRS, requests are bounded to São Paulo, and bad requests fail cleanly.

Real HTTP, no mocks. Skips when GeoServer isn't reachable (see conftest).

Note on axis order: WMS 1.3.0 + EPSG:4326 is lat/lon, a classic foot-gun. These
tests use CRS:84 (always lon/lat) for GetMap to keep BBOX unambiguous.
"""
from __future__ import annotations

import io
import json

import pytest

from conftest import SP_BBOX, WORKSPACE, local

pytestmark = pytest.mark.ogc_acceptance

MUNICIPALITIES = f"{WORKSPACE}:municipalities"

# lon/lat BBOX string for CRS:84 over São Paulo state.
SP_BBOX_84 = f"{SP_BBOX['min_lng']},{SP_BBOX['min_lat']},{SP_BBOX['max_lng']},{SP_BBOX['max_lat']}"


def _getmap_params(layer: str) -> dict:
    return {
        "service": "WMS",
        "version": "1.3.0",
        "request": "GetMap",
        "layers": layer,
        "crs": "CRS:84",          # lon/lat, no axis ambiguity
        "bbox": SP_BBOX_84,
        "width": "512",
        "height": "512",
        "format": "image/png",
        "transparent": "true",
    }


class TestWmsGetMap:
    def test_getmap_returns_png(self, http, wms_url):
        r = http.get(wms_url, params=_getmap_params(MUNICIPALITIES), timeout=60)
        assert r.status_code == 200, r.text[:300]
        assert r.headers.get("Content-Type", "").startswith("image/png"), (
            f"expected image/png, got {r.headers.get('Content-Type')} — "
            f"body: {r.content[:300]!r}"
        )

    def test_getmap_is_a_valid_image(self, http, wms_url):
        from PIL import Image  # deferred so collection works without Pillow

        r = http.get(wms_url, params=_getmap_params(MUNICIPALITIES), timeout=60)
        img = Image.open(io.BytesIO(r.content))
        assert img.format == "PNG"
        assert img.size == (512, 512)

    def test_getmap_is_not_blank(self, http, wms_url):
        """A correctly-styled, data-backed layer must paint *something*."""
        from PIL import Image

        r = http.get(wms_url, params=_getmap_params(MUNICIPALITIES), timeout=60)
        img = Image.open(io.BytesIO(r.content)).convert("RGBA")
        # Non-blank = more than one distinct pixel and not fully transparent.
        colors = img.getcolors(maxcolors=512 * 512) or []
        assert len(colors) > 1, "GetMap returned a single flat/empty image"
        alphas = {px[3] for _, px in colors}
        assert any(a > 0 for a in alphas), "GetMap image is fully transparent"


class TestWfsGetFeature:
    def _getfeature(self, http, wfs_url, **extra):
        params = {
            "service": "WFS",
            "version": "2.0.0",
            "request": "GetFeature",
            "typeNames": MUNICIPALITIES,
            "count": "1",
            "outputFormat": "application/json",
            "srsName": "urn:ogc:def:crs:EPSG::4326",
        }
        params.update(extra)
        return http.get(wfs_url, params=params, timeout=60)

    def test_getfeature_json_is_feature_collection(self, http, wfs_url):
        r = self._getfeature(http, wfs_url)
        assert r.status_code == 200, r.text[:300]
        data = json.loads(r.content)
        assert data.get("type") == "FeatureCollection"
        assert isinstance(data.get("features"), list)

    def test_getfeature_returns_at_least_one_feature(self, http, wfs_url):
        data = json.loads(self._getfeature(http, wfs_url).content)
        assert len(data["features"]) >= 1, "no municipality features returned"

    def test_feature_has_expected_attributes(self, http, wfs_url):
        data = json.loads(self._getfeature(http, wfs_url).content)
        props = data["features"][0]["properties"]
        # Core PILAR-2b attributes that downstream clients rely on.
        for key in ("municipality_name", "total_biogas_m3_year"):
            assert key in props, f"expected attribute '{key}' missing from WFS feature"

    def test_feature_geometry_within_sao_paulo(self, http, wfs_url):
        data = json.loads(self._getfeature(http, wfs_url).content)
        geom = data["features"][0]["geometry"]
        assert geom and geom.get("coordinates"), "feature has no geometry"
        # Flatten nested coordinate arrays to (lon, lat) pairs.
        flat = []
        stack = [geom["coordinates"]]
        while stack:
            item = stack.pop()
            if (
                isinstance(item, (list, tuple))
                and len(item) == 2
                and all(isinstance(c, (int, float)) for c in item)
            ):
                flat.append(item)
            elif isinstance(item, (list, tuple)):
                stack.extend(item)
        assert flat, "could not extract coordinates"
        for lon, lat in flat:
            assert SP_BBOX["min_lng"] - 1 <= lon <= SP_BBOX["max_lng"] + 1, f"lon {lon} outside SP"
            assert SP_BBOX["min_lat"] - 1 <= lat <= SP_BBOX["max_lat"] + 1, f"lat {lat} outside SP"


class TestErrorHandling:
    def test_unknown_layer_returns_service_exception(self, http, wms_url):
        params = _getmap_params(f"{WORKSPACE}:does_not_exist")
        r = http.get(wms_url, params=params, timeout=30)
        # GeoServer answers with an OGC ServiceExceptionReport (XML), not a PNG.
        body = r.text.lower()
        assert "exception" in body, "expected an OGC ServiceException for a bad layer"
        assert not r.headers.get("Content-Type", "").startswith("image/png")

    def test_missing_required_param_is_rejected(self, http, wms_url):
        # GetMap without LAYERS must error, not return a blank tile.
        params = _getmap_params(MUNICIPALITIES)
        del params["layers"]
        r = http.get(wms_url, params=params, timeout=30)
        assert "exception" in r.text.lower()
