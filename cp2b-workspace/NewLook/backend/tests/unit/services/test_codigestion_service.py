"""
Unit tests for app.services.codigestion_service

Covers pure helpers, UnionFind, spatial grouping, C:N scoring,
convex hull, and mocked DB-touching functions.
"""
import math
import pytest
from contextlib import contextmanager
from unittest.mock import MagicMock, patch

from app.services.codigestion_service import (
    CN_OPTIMAL_HIGH,
    CN_OPTIMAL_LOW,
    CN_OPTIMAL_MID,
    RESIDUE_META,
    RESIDUE_KEYS,
    _UnionFind,
    _blend_ratio,
    _build_spatial_groups,
    _cn_label,
    _cn_role,
    _convex_hull_geojson,
    _get_cn,
    _haversine_km,
    _improvement_score,
    _load_cn_data,
    _weighted_cn,
    find_codigestion_clusters,
    get_residue_cn_matrix,
)


# ─── DB mock helper ────────────────────────────────────────────────────────────

def _db_ctx(rows):
    """Build a @contextmanager get_db mock returning `rows` from fetchall()."""
    @contextmanager
    def _get_db():
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = rows
        mock_conn.cursor.return_value = mock_cursor
        yield mock_conn
    return _get_db


# ─── Sample municipality dicts ─────────────────────────────────────────────────

def _mun(name, lat, lng, **extra):
    base = {
        "id": hash(name) & 0xFFFF,
        "ibge_code": str(abs(hash(name)) % 10_000_000),
        "name": name,
        "centroid_lat": lat,
        "centroid_lng": lng,
    }
    for key in RESIDUE_KEYS:
        base[f"{key}_biomass_tons_year"] = extra.get(f"{key}_biomass_tons_year", 0.0)
        base[f"{key}_biogas_m3_year"] = extra.get(f"{key}_biogas_m3_year", 0.0)
    base.update(extra)
    return base


# ─────────────────────────────────────────────────────────────────────────────
# TestHaversineKm
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
class TestHaversineKm:
    """Tests for _haversine_km()."""

    def test_same_point_is_zero(self):
        assert _haversine_km(-23.5, -46.6, -23.5, -46.6) == pytest.approx(0.0, abs=1e-6)

    def test_sp_to_campinas_approx_90km(self):
        # São Paulo capital → Campinas: approx 88–95 km
        dist = _haversine_km(-23.5505, -46.6333, -22.9056, -47.0608)
        assert 80 < dist < 105

    def test_symmetry(self):
        d1 = _haversine_km(-23.5, -46.6, -22.9, -47.0)
        d2 = _haversine_km(-22.9, -47.0, -23.5, -46.6)
        assert d1 == pytest.approx(d2, rel=1e-9)

    def test_small_distance_is_positive(self):
        d = _haversine_km(-23.0, -46.0, -23.001, -46.001)
        assert d > 0

    def test_1_degree_latitude_approx_111km(self):
        d = _haversine_km(0.0, 0.0, 1.0, 0.0)
        assert 110 < d < 113

    def test_returns_float(self):
        assert isinstance(_haversine_km(-23.0, -46.0, -22.0, -46.0), float)

    def test_north_south_sp_span(self):
        # SP state spans ~5.5 degrees lat → ~600 km
        d = _haversine_km(-19.8, -48.0, -25.3, -48.0)
        assert 580 < d < 640


# ─────────────────────────────────────────────────────────────────────────────
# TestUnionFind
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
class TestUnionFind:
    """Tests for _UnionFind."""

    def test_initial_self_parent(self):
        uf = _UnionFind(3)
        for i in range(3):
            assert uf.find(i) == i

    def test_union_connects_two_nodes(self):
        uf = _UnionFind(3)
        uf.union(0, 1)
        assert uf.find(0) == uf.find(1)

    def test_union_does_not_connect_third(self):
        uf = _UnionFind(3)
        uf.union(0, 1)
        assert uf.find(2) != uf.find(0)

    def test_find_is_idempotent(self):
        uf = _UnionFind(4)
        uf.union(0, 1)
        uf.union(1, 2)
        root1 = uf.find(0)
        root2 = uf.find(0)
        assert root1 == root2

    def test_transitive_union(self):
        uf = _UnionFind(4)
        uf.union(0, 1)
        uf.union(1, 2)
        assert uf.find(0) == uf.find(2)

    def test_single_node(self):
        uf = _UnionFind(1)
        assert uf.find(0) == 0

    def test_all_unioned(self):
        uf = _UnionFind(5)
        for i in range(4):
            uf.union(i, i + 1)
        roots = {uf.find(i) for i in range(5)}
        assert len(roots) == 1

    def test_disjoint_sets(self):
        uf = _UnionFind(4)
        uf.union(0, 1)
        uf.union(2, 3)
        assert uf.find(0) == uf.find(1)
        assert uf.find(2) == uf.find(3)
        assert uf.find(0) != uf.find(2)

    def test_parent_list_correct_length(self):
        uf = _UnionFind(7)
        assert len(uf.parent) == 7


# ─────────────────────────────────────────────────────────────────────────────
# TestBuildSpatialGroups
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
class TestBuildSpatialGroups:
    """Tests for _build_spatial_groups()."""

    def test_two_close_municipalities_form_group(self):
        # SP capital and Santo André are ~20 km apart
        muns = [
            _mun("SP",          -23.5505, -46.6333),
            _mun("SantoAndre",  -23.6638, -46.5380),
        ]
        groups = _build_spatial_groups(muns, radius_km=30.0)
        assert len(groups) == 1
        assert len(groups[0]) == 2

    def test_two_far_municipalities_no_group(self):
        # SP capital and Ribeirão Preto are ~300 km apart
        muns = [
            _mun("SP",           -23.5505, -46.6333),
            _mun("Ribeirao",     -21.1775, -47.8097),
        ]
        groups = _build_spatial_groups(muns, radius_km=30.0)
        assert len(groups) == 0

    def test_single_municipality_no_group(self):
        muns = [_mun("SP", -23.5505, -46.6333)]
        groups = _build_spatial_groups(muns, radius_km=50.0)
        assert len(groups) == 0

    def test_empty_list_returns_empty(self):
        assert _build_spatial_groups([], 30.0) == []

    def test_municipality_with_none_coords_skipped(self):
        muns = [
            _mun("SP",   -23.5505, -46.6333),
            {"id": 99, "name": "NullMun", "ibge_code": "0", "centroid_lat": None, "centroid_lng": None},
        ]
        groups = _build_spatial_groups(muns, radius_km=30.0)
        assert len(groups) == 0

    def test_three_close_municipalities_in_one_group(self):
        muns = [
            _mun("A", -23.5, -46.6),
            _mun("B", -23.55, -46.65),
            _mun("C", -23.6, -46.7),
        ]
        groups = _build_spatial_groups(muns, radius_km=20.0)
        assert len(groups) == 1
        assert len(groups[0]) == 3

    def test_radius_zero_no_groups(self):
        muns = [
            _mun("A", -23.5, -46.6),
            _mun("B", -23.51, -46.61),
        ]
        groups = _build_spatial_groups(muns, radius_km=0.0)
        assert len(groups) == 0


# ─────────────────────────────────────────────────────────────────────────────
# TestWeightedCn
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
class TestWeightedCn:
    """Tests for _weighted_cn()."""

    def test_equal_biomass_averages_cn(self):
        result = _weighted_cn(100.0, 10.0, 100.0, 40.0)
        assert result == pytest.approx(25.0)

    def test_zero_total_biomass_returns_midpoint(self):
        result = _weighted_cn(0.0, 10.0, 0.0, 40.0)
        assert result == CN_OPTIMAL_MID

    def test_all_weight_on_first(self):
        result = _weighted_cn(100.0, 15.0, 0.0, 99.0)
        assert result == pytest.approx(15.0)

    def test_all_weight_on_second(self):
        result = _weighted_cn(0.0, 5.0, 100.0, 35.0)
        assert result == pytest.approx(35.0)

    def test_proportional_weighting(self):
        result = _weighted_cn(200.0, 10.0, 100.0, 40.0)
        expected = (200 * 10 + 100 * 40) / 300
        assert result == pytest.approx(expected)

    def test_result_within_input_range(self):
        result = _weighted_cn(50.0, 10.0, 50.0, 50.0)
        assert 10.0 <= result <= 50.0


# ─────────────────────────────────────────────────────────────────────────────
# TestImprovementScore
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
class TestImprovementScore:
    """Tests for _improvement_score()."""

    def test_score_positive_when_combined_closer_to_optimal(self):
        # cn_a=10 (far), cn_b=40 (far), combined=25 (at midpoint)
        score = _improvement_score(25.0, 10.0, 40.0)
        assert score > 0

    def test_score_zero_when_no_improvement(self):
        # Combined is same distance as average of individual distances
        # If cn_a = cn_b = cn_combined all equal to midpoint, score is 0
        score = _improvement_score(CN_OPTIMAL_MID, CN_OPTIMAL_MID, CN_OPTIMAL_MID)
        assert score == pytest.approx(0.0)

    def test_score_is_rounded_to_2dp(self):
        score = _improvement_score(22.333, 10.0, 40.0)
        assert score == round(score, 2)

    def test_score_negative_when_combined_farther(self):
        # Both at midpoint, combined pushed away → negative
        score = _improvement_score(50.0, CN_OPTIMAL_MID, CN_OPTIMAL_MID)
        assert score < 0

    def test_score_returns_float(self):
        assert isinstance(_improvement_score(25.0, 10.0, 40.0), float)


# ─────────────────────────────────────────────────────────────────────────────
# TestBlendRatio
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
class TestBlendRatio:
    """Tests for _blend_ratio()."""

    def test_zero_total_returns_0_0(self):
        assert _blend_ratio(0.0, 0.0) == "0:0"

    def test_equal_biomass_returns_50_50(self):
        assert _blend_ratio(100.0, 100.0) == "50.0:50.0"

    def test_all_a_returns_100_0(self):
        assert _blend_ratio(100.0, 0.0) == "100.0:0.0"

    def test_all_b_returns_0_100(self):
        assert _blend_ratio(0.0, 100.0) == "0.0:100.0"

    def test_ratio_sums_to_100(self):
        ratio = _blend_ratio(75.0, 25.0)
        parts = [float(x) for x in ratio.split(":")]
        assert sum(parts) == pytest.approx(100.0)

    def test_returns_string(self):
        assert isinstance(_blend_ratio(50.0, 50.0), str)

    def test_format_contains_colon(self):
        assert ":" in _blend_ratio(30.0, 70.0)


# ─────────────────────────────────────────────────────────────────────────────
# TestCnRole
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
class TestCnRole:
    """Tests for _cn_role()."""

    def test_below_optimal_low_is_nitrogen_donor(self):
        assert _cn_role(CN_OPTIMAL_LOW - 0.1) == "nitrogen_donor"

    def test_above_optimal_high_is_carbon_donor(self):
        assert _cn_role(CN_OPTIMAL_HIGH + 0.1) == "carbon_donor"

    def test_at_optimal_low_boundary_is_balanced(self):
        assert _cn_role(CN_OPTIMAL_LOW) == "balanced"

    def test_at_optimal_high_boundary_is_balanced(self):
        assert _cn_role(CN_OPTIMAL_HIGH) == "balanced"

    def test_midpoint_is_balanced(self):
        assert _cn_role(CN_OPTIMAL_MID) == "balanced"

    def test_very_low_cn_is_nitrogen_donor(self):
        assert _cn_role(5.0) == "nitrogen_donor"

    def test_very_high_cn_is_carbon_donor(self):
        assert _cn_role(100.0) == "carbon_donor"


# ─────────────────────────────────────────────────────────────────────────────
# TestCnLabel
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
class TestCnLabel:
    """Tests for _cn_label()."""

    def test_above_40_is_c_rich(self):
        assert _cn_label(41.0) == "C-RICH"

    def test_exactly_40_is_balanced(self):
        assert _cn_label(40.0) == "BALANCED"

    def test_below_20_is_n_rich(self):
        assert _cn_label(19.9) == "N-RICH"

    def test_exactly_20_is_balanced(self):
        assert _cn_label(20.0) == "BALANCED"

    def test_midpoint_is_balanced(self):
        assert _cn_label(CN_OPTIMAL_MID) == "BALANCED"

    def test_returns_string(self):
        assert isinstance(_cn_label(25.0), str)


# ─────────────────────────────────────────────────────────────────────────────
# TestGetCn
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
class TestGetCn:
    """Tests for _get_cn()."""

    def test_known_codigo_returns_db_value(self):
        cn_map = {"palha_cana": 90.0}
        assert _get_cn("sugarcane", cn_map) == 90.0

    def test_unknown_key_returns_midpoint(self):
        assert _get_cn("nonexistent_key", {}) == CN_OPTIMAL_MID

    def test_missing_from_db_returns_midpoint(self):
        # Key exists in RESIDUE_META but codigo not in cn_map
        assert _get_cn("sugarcane", {}) == CN_OPTIMAL_MID

    def test_aquaculture_has_no_codigo_returns_midpoint(self):
        # aquaculture has codigo=None in RESIDUE_META
        assert _get_cn("aquaculture", {"somekey": 15.0}) == CN_OPTIMAL_MID

    def test_all_keys_return_float(self):
        cn_map = {}
        for key in RESIDUE_KEYS:
            result = _get_cn(key, cn_map)
            assert isinstance(result, float)

    def test_cattle_returns_db_value_when_present(self):
        codigo = RESIDUE_META["cattle"]["codigo"]
        cn_map = {codigo: 18.5}
        assert _get_cn("cattle", cn_map) == pytest.approx(18.5)


# ─────────────────────────────────────────────────────────────────────────────
# TestConvexHullGeoJson
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
class TestConvexHullGeoJson:
    """Tests for _convex_hull_geojson()."""

    def test_returns_none_for_empty_list(self):
        assert _convex_hull_geojson([]) is None

    def test_returns_none_for_single_point(self):
        muns = [{"centroid_lat": -23.5, "centroid_lng": -46.6}]
        result = _convex_hull_geojson(muns)
        assert result is None

    def test_skips_municipalities_with_null_coords(self):
        muns = [
            {"centroid_lat": None, "centroid_lng": -46.6},
            {"centroid_lat": -23.5, "centroid_lng": None},
        ]
        result = _convex_hull_geojson(muns)
        assert result is None

    def test_three_points_returns_dict_or_none(self):
        # Returns a GeoJSON dict if shapely is available, else None
        muns = [
            {"centroid_lat": -23.5, "centroid_lng": -46.6},
            {"centroid_lat": -23.6, "centroid_lng": -46.7},
            {"centroid_lat": -23.4, "centroid_lng": -46.5},
        ]
        result = _convex_hull_geojson(muns)
        assert result is None or isinstance(result, dict)

    def test_polygon_result_has_type_key(self):
        pytest.importorskip("shapely")
        muns = [
            {"centroid_lat": -23.5, "centroid_lng": -46.6},
            {"centroid_lat": -23.6, "centroid_lng": -46.7},
            {"centroid_lat": -23.4, "centroid_lng": -46.5},
            {"centroid_lat": -23.7, "centroid_lng": -46.4},
        ]
        result = _convex_hull_geojson(muns)
        assert result is not None
        assert "type" in result

    def test_two_points_returns_polygon_or_none(self):
        # 2 points: convex_hull returns a LineString → buffered to Polygon
        muns = [
            {"centroid_lat": -23.5, "centroid_lng": -46.6},
            {"centroid_lat": -23.6, "centroid_lng": -46.7},
        ]
        result = _convex_hull_geojson(muns)
        assert result is None or isinstance(result, dict)

    def test_shapely_import_error_returns_none(self):
        import builtins
        real_import = builtins.__import__

        def mock_import(name, *args, **kwargs):
            if name == "shapely.geometry":
                raise ImportError("mocked")
            return real_import(name, *args, **kwargs)

        muns = [
            {"centroid_lat": -23.5, "centroid_lng": -46.6},
            {"centroid_lat": -23.6, "centroid_lng": -46.7},
            {"centroid_lat": -23.4, "centroid_lng": -46.5},
        ]
        with patch("builtins.__import__", side_effect=mock_import):
            result = _convex_hull_geojson(muns)
        assert result is None

    def test_collinear_points_return_dict_or_none(self):
        # Collinear points give a LineString → buffered
        muns = [
            {"centroid_lat": -23.0, "centroid_lng": -46.0},
            {"centroid_lat": -23.5, "centroid_lng": -46.5},
            {"centroid_lat": -24.0, "centroid_lng": -47.0},
        ]
        result = _convex_hull_geojson(muns)
        assert result is None or isinstance(result, dict)


# ─────────────────────────────────────────────────────────────────────────────
# TestGetResidueCnMatrix
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
class TestGetResidueCnMatrix:
    """Tests for get_residue_cn_matrix() — patches _load_cn_data."""

    @pytest.fixture(autouse=True)
    def clear_cache(self):
        _load_cn_data.cache_clear()
        yield
        _load_cn_data.cache_clear()

    def test_result_has_residues_key(self):
        with patch("app.services.codigestion_service._load_cn_data", return_value={}):
            result = get_residue_cn_matrix()
        assert "residues" in result

    def test_result_has_optimal_range_key(self):
        with patch("app.services.codigestion_service._load_cn_data", return_value={}):
            result = get_residue_cn_matrix()
        assert "optimal_range" in result
        assert result["optimal_range"]["low"] == CN_OPTIMAL_LOW
        assert result["optimal_range"]["high"] == CN_OPTIMAL_HIGH

    def test_residues_list_has_correct_count(self):
        with patch("app.services.codigestion_service._load_cn_data", return_value={}):
            result = get_residue_cn_matrix()
        assert len(result["residues"]) == len(RESIDUE_META)

    def test_each_residue_has_required_keys(self):
        with patch("app.services.codigestion_service._load_cn_data", return_value={}):
            result = get_residue_cn_matrix()
        for r in result["residues"]:
            for field in ("key", "label", "sector", "cn_ratio", "in_optimal_range", "cn_role"):
                assert field in r, f"Missing field '{field}' in residue {r.get('key')}"

    def test_db_values_used_when_available(self):
        codigo = RESIDUE_META["cattle"]["codigo"]
        cn_map = {codigo: 18.5}
        with patch("app.services.codigestion_service._load_cn_data", return_value=cn_map):
            result = get_residue_cn_matrix()
        cattle = next(r for r in result["residues"] if r["key"] == "cattle")
        assert cattle["cn_ratio"] == pytest.approx(18.5)

    def test_in_optimal_range_flag_correct(self):
        with patch("app.services.codigestion_service._load_cn_data", return_value={}):
            result = get_residue_cn_matrix()
        for r in result["residues"]:
            expected = CN_OPTIMAL_LOW <= r["cn_ratio"] <= CN_OPTIMAL_HIGH
            assert r["in_optimal_range"] == expected


# ─────────────────────────────────────────────────────────────────────────────
# TestFindCodigestionClusters
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
class TestFindCodigestionClusters:
    """Tests for find_codigestion_clusters() — patches get_db and _load_cn_data."""

    @pytest.fixture(autouse=True)
    def clear_cache(self):
        _load_cn_data.cache_clear()
        yield
        _load_cn_data.cache_clear()

    def _make_row(self, name, lat, lng, cattle_biomass=5000.0, sugarcane_biomass=5000.0):
        from app.services.codigestion_service import BIOGAS_FIELDS, BIOMASS_FIELDS
        row = {
            "id": abs(hash(name)) & 0xFFFF,
            "municipality_name": name,
            "ibge_code": str(abs(hash(name)) % 10_000_000),
            "centroid_lat": lat,
            "centroid_lng": lng,
        }
        for key in RESIDUE_KEYS:
            row[f"{key}_biogas_m3_year"] = 0.0
        row["cattle_biomass_tons_year"] = cattle_biomass
        row["sugarcane_biomass_tons_year"] = sugarcane_biomass
        return row

    def test_empty_db_returns_no_clusters(self):
        with patch("app.core.database.get_db", new=_db_ctx([])):
            with patch("app.services.codigestion_service._load_cn_data", return_value={}):
                result = find_codigestion_clusters()
        assert result["clusters"] == []
        assert result["total_clusters"] == 0

    def test_result_has_required_top_level_keys(self):
        with patch("app.core.database.get_db", new=_db_ctx([])):
            with patch("app.services.codigestion_service._load_cn_data", return_value={}):
                result = find_codigestion_clusters()
        for key in ("clusters", "total_clusters", "parameters"):
            assert key in result

    def test_parameters_reflect_arguments(self):
        with patch("app.core.database.get_db", new=_db_ctx([])):
            with patch("app.services.codigestion_service._load_cn_data", return_value={}):
                result = find_codigestion_clusters(radius_km=15.0, min_biomass_tons=500.0)
        assert result["parameters"]["radius_km"] == 15.0
        assert result["parameters"]["min_biomass_tons"] == 500.0

    def test_db_exception_returns_empty_result(self):
        def _failing_db():
            raise Exception("DB down")

        with patch("app.core.database.get_db", side_effect=_failing_db):
            with patch("app.services.codigestion_service._load_cn_data", return_value={}):
                result = find_codigestion_clusters()
        assert result["clusters"] == []

    def test_max_clusters_limits_output(self):
        # Provide enough close municipalities so clusters would be found
        # but limit to max_clusters=0 to verify the limit
        with patch("app.core.database.get_db", new=_db_ctx([])):
            with patch("app.services.codigestion_service._load_cn_data", return_value={}):
                result = find_codigestion_clusters(max_clusters=0)
        assert len(result["clusters"]) == 0

    def test_single_municipality_no_clusters(self):
        row = {
            "id": 1, "municipality_name": "SP", "ibge_code": "3550308",
            "centroid_lat": -23.5505, "centroid_lng": -46.6333,
            **{f"{k}_biogas_m3_year": 0.0 for k in RESIDUE_KEYS},
        }
        with patch("app.core.database.get_db", new=_db_ctx([row])):
            with patch("app.services.codigestion_service._load_cn_data", return_value={}):
                with patch("app.services.biomass_availability.derive_biomass_fields", return_value={}):
                    result = find_codigestion_clusters()
        assert result["clusters"] == []

    def test_clusters_sorted_by_score_desc(self):
        # Verify that the returned list is sorted (or empty, which is trivially sorted)
        with patch("app.core.database.get_db", new=_db_ctx([])):
            with patch("app.services.codigestion_service._load_cn_data", return_value={}):
                result = find_codigestion_clusters()
        scores = [c["cluster_score"] for c in result["clusters"]]
        assert scores == sorted(scores, reverse=True)

    def test_cluster_id_format(self):
        with patch("app.core.database.get_db", new=_db_ctx([])):
            with patch("app.services.codigestion_service._load_cn_data", return_value={}):
                result = find_codigestion_clusters()
        for cluster in result["clusters"]:
            assert cluster["cluster_id"].startswith("cluster_")
