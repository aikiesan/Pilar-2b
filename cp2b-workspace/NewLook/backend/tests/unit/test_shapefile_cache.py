"""Each shapefile is read from disk once per process, and shared in WGS84."""

import geopandas as gpd
import pytest
from shapely.geometry import box

import app.utils.shapefile_loader as shapefile_loader
from app.api.v1.endpoints import geospatial


@pytest.fixture
def utm_shapefile(tmp_path, monkeypatch):
    monkeypatch.setattr(shapefile_loader, "_shapefiles", {})
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
    monkeypatch.setattr(
        shapefile_loader.gpd, "read_file", lambda p: reads.append(p) or real_read(p)
    )

    first = shapefile_loader.read_shapefile_wgs84(utm_shapefile)
    second = shapefile_loader.read_shapefile_wgs84(utm_shapefile)

    assert reads == [utm_shapefile]
    assert second is first
    assert first.crs.to_epsg() == 4326
    assert list(first["NM_MUN"]) == ["A", "B"]


@pytest.mark.unit
def test_the_geospatial_endpoints_share_the_proximity_copy(utm_shapefile, monkeypatch):
    monkeypatch.setattr(geospatial, "SHAPEFILE_PATH", utm_shapefile)

    assert geospatial._load_geo_gdf() is shapefile_loader.read_shapefile_wgs84(utm_shapefile)


@pytest.mark.unit
def test_falls_back_to_the_local_copy(utm_shapefile, tmp_path, monkeypatch):
    monkeypatch.setattr(geospatial, "SHAPEFILE_PATH", tmp_path / "missing.shp")
    monkeypatch.setattr(geospatial, "SHAPEFILE_PATH_ALT", utm_shapefile)

    assert list(geospatial._load_geo_gdf()["NM_MUN"]) == ["A", "B"]
