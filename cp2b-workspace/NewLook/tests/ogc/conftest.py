"""
Shared fixtures for the PILAR-2b OGC test suites (assembly + acceptance).

These are REAL tests against a running GeoServer — no mocks. They follow the
same gating philosophy as the backend integration tests (TEST_DATABASE_URL):
if a live GeoServer isn't reachable, every test SKIPS rather than failing, so
the suite is safe to collect anywhere. In CI the OGC workflow stands up
PostGIS + GeoServer, provisions the cp2b layers, then sets GEOSERVER_URL.

Env:
  GEOSERVER_URL        GeoServer base, default http://localhost:8080/geoserver
  GEOSERVER_WORKSPACE  published workspace, default "cp2b"
"""
from __future__ import annotations

import os
import xml.etree.ElementTree as ET

import pytest
import requests

GEOSERVER_URL = os.getenv("GEOSERVER_URL", "http://localhost:8080/geoserver").rstrip("/")
WORKSPACE = os.getenv("GEOSERVER_WORKSPACE", "cp2b")

# Layers the provisioning script publishes (workspace-qualified).
EXPECTED_LAYERS = [
    f"{WORKSPACE}:municipalities",
    f"{WORKSPACE}:biogas_plants",
    f"{WORKSPACE}:gas_pipelines",
    f"{WORKSPACE}:power_transmission_lines",
    f"{WORKSPACE}:power_substations",
    f"{WORKSPACE}:wastewater_treatment_plants",
]

# São Paulo state bounding box (lon/lat) — acceptance tests render/inspect here.
SP_BBOX = {"min_lng": -53.1, "min_lat": -25.3, "max_lng": -44.2, "max_lat": -19.8}


def local(tag: str) -> str:
    """Strip the XML namespace from an ElementTree tag for ns-agnostic matching."""
    return tag.rsplit("}", 1)[-1]


def _reachable(url: str, timeout: float = 5.0) -> bool:
    try:
        return requests.get(url, timeout=timeout).status_code < 500
    except requests.RequestException:
        return False


@pytest.fixture(scope="session")
def http() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": "pilar2b-ogc-tests"})
    return s


@pytest.fixture(scope="session")
def geoserver(http) -> str:
    """GeoServer base URL; SKIP the whole suite if it isn't reachable."""
    web = f"{GEOSERVER_URL}/web/"
    if not _reachable(web):
        pytest.skip(
            f"GeoServer not reachable at {GEOSERVER_URL} "
            "(set GEOSERVER_URL to a running instance to run OGC tests)"
        )
    return GEOSERVER_URL


@pytest.fixture(scope="session")
def wms_url(geoserver) -> str:
    return f"{geoserver}/{WORKSPACE}/wms"


@pytest.fixture(scope="session")
def wfs_url(geoserver) -> str:
    return f"{geoserver}/{WORKSPACE}/wfs"


@pytest.fixture(scope="session")
def wms_capabilities(http, wms_url) -> ET.Element:
    r = http.get(
        wms_url,
        params={"service": "WMS", "version": "1.3.0", "request": "GetCapabilities"},
        timeout=30,
    )
    assert r.status_code == 200, f"WMS GetCapabilities HTTP {r.status_code}"
    return ET.fromstring(r.content)


@pytest.fixture(scope="session")
def wfs_capabilities(http, wfs_url) -> ET.Element:
    r = http.get(
        wfs_url,
        params={"service": "WFS", "version": "2.0.0", "request": "GetCapabilities"},
        timeout=30,
    )
    assert r.status_code == 200, f"WFS GetCapabilities HTTP {r.status_code}"
    return ET.fromstring(r.content)
