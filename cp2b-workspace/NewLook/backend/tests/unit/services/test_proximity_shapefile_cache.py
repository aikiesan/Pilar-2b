"""Proximity analyses read each shapefile from disk once, not once per request."""

import geopandas as gpd
import pytest
from shapely.geometry import box

import app.services.proximity_service as proximity


@pytest.fixture
def utm_shapefile(tmp_path, monkeypatch):
    monkeypatch.setattr(proximity, "_shapefiles", {})
    path = tmp_path / "municipios.shp"
    gpd.GeoDataFrame(
        {"NM_MUN": ["A", "B"]},
        geometry=[box(300000, 7400000, 301000, 7401000), box(302000, 7400000, 303000, 7401000)],
        crs="EPSG:31983",
    ).to_file(path)
    return path


@pytest.mark.unit
def test_reads_once_and_serves_wgs84(utm_shapefile, monkeypatch):
    reads = []
    real_read = gpd.read_file
    monkeypatch.setattr(proximity.gpd, "read_file", lambda p: reads.append(p) or real_read(p))

    first = proximity.read_shapefile_wgs84(utm_shapefile)
    second = proximity.read_shapefile_wgs84(utm_shapefile)

    assert reads == [utm_shapefile]
    assert second is first
    assert first.crs.to_epsg() == 4326
    assert list(first["NM_MUN"]) == ["A", "B"]
