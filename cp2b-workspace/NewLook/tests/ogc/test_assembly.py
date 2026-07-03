"""
OGC ASSEMBLY tests — does the GeoServer stack come up correctly and expose the
expected OGC services and PILAR-2b layers?

Stack-level smoke/integration: GeoServer up, WMS/WFS capabilities served and
well-formed, all cp2b layers advertised. These answer "is the system assembled
correctly" rather than "is a specific map right" (that's test_acceptance.py).

Real HTTP, no mocks. Skips when GeoServer isn't reachable (see conftest).
"""
from __future__ import annotations

import pytest

from conftest import EXPECTED_LAYERS, WORKSPACE, local

pytestmark = pytest.mark.ogc_assembly


class TestServiceUp:
    def test_geoserver_web_reachable(self, http, geoserver):
        r = http.get(f"{geoserver}/web/", timeout=15)
        assert r.status_code == 200

    def test_wms_capabilities_200(self, http, wms_url):
        r = http.get(
            wms_url,
            params={"service": "WMS", "version": "1.3.0", "request": "GetCapabilities"},
            timeout=30,
        )
        assert r.status_code == 200
        assert "xml" in r.headers.get("Content-Type", "").lower()

    def test_wfs_capabilities_200(self, http, wfs_url):
        r = http.get(
            wfs_url,
            params={"service": "WFS", "version": "2.0.0", "request": "GetCapabilities"},
            timeout=30,
        )
        assert r.status_code == 200


class TestWmsCapabilitiesShape:
    def test_root_is_wms_capabilities(self, wms_capabilities):
        assert local(wms_capabilities.tag) == "WMS_Capabilities"

    def test_advertises_getmap(self, wms_capabilities):
        names = {local(e.tag) for e in wms_capabilities.iter()}
        assert "GetMap" in names

    def test_supports_png(self, wms_capabilities):
        formats = {
            e.text.strip()
            for e in wms_capabilities.iter()
            if local(e.tag) == "Format" and e.text
        }
        assert any("png" in f.lower() for f in formats), "WMS must advertise image/png"

    @pytest.mark.parametrize("layer", EXPECTED_LAYERS)
    def test_layer_is_published(self, wms_capabilities, layer):
        # The workspace-scoped WMS endpoint (/geoserver/<ws>/wms) advertises
        # layer <Name>s WITHOUT the workspace prefix ("municipalities"); the
        # global endpoint qualifies them ("cp2b:municipalities"). Accept both.
        published = {
            e.text.strip()
            for e in wms_capabilities.iter()
            if local(e.tag) == "Name" and e.text
        }
        unqualified = layer.split(":", 1)[-1]
        assert (
            layer in published or unqualified in published
        ), f"{layer} not advertised in WMS capabilities"


class TestWfsCapabilitiesShape:
    def test_root_is_wfs_capabilities(self, wfs_capabilities):
        assert local(wfs_capabilities.tag) == "WFS_Capabilities"

    @pytest.mark.parametrize("layer", EXPECTED_LAYERS)
    def test_featuretype_present(self, wfs_capabilities, layer):
        names = {
            e.text.strip()
            for e in wfs_capabilities.iter()
            if local(e.tag) == "Name" and e.text
        }
        assert layer in names, f"{layer} missing from WFS FeatureTypeList"

    def test_supports_geojson_output(self, wfs_capabilities):
        values = {
            e.text.strip().lower()
            for e in wfs_capabilities.iter()
            if local(e.tag) == "Value" and e.text
        }
        assert any("json" in v for v in values), "WFS should offer a JSON output format"
