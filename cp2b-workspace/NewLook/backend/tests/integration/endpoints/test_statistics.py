"""
Integration tests for Statistics API endpoints.
Covers /statistics/summary and /statistics/category/{category}.
"""

from contextlib import contextmanager
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.middleware.auth import require_authenticated
from app.models.auth import UserProfile

# ─── Auth override helper ─────────────────────────────────────────────────────


def _mock_authenticated_user():
    """Return a minimal UserProfile suitable for require_authenticated."""
    now = datetime.now(timezone.utc)
    return UserProfile(
        id="test-user-id",
        email="test@example.com",
        full_name="Test User",
        role="autenticado",
        created_at=now,
        updated_at=now,
    )


@contextmanager
def _authenticated_client():
    """Yield a TestClient with the auth dependency overridden."""
    app.dependency_overrides[require_authenticated] = _mock_authenticated_user
    try:
        with TestClient(app) as c:
            yield c
    finally:
        app.dependency_overrides.pop(require_authenticated, None)


# ─── DB mock helper ───────────────────────────────────────────────────────────


def _make_db_patch(fetchone_values):
    """
    Return a context-manager mock for get_db whose cursor.fetchone() returns
    successive values from ``fetchone_values``.

    Each element can be a dict-like object (normal result) or an Exception
    (which will be raised from cursor.execute()).
    """
    call_index = [0]

    @contextmanager
    def mock_get_db():
        mock_conn = MagicMock()
        mock_cursor = MagicMock()

        def _execute(sql, *args, **kwargs):
            idx = call_index[0]
            if idx < len(fetchone_values):
                val = fetchone_values[idx]
                if isinstance(val, Exception):
                    call_index[0] += 1
                    raise val
            call_index[0] += 1

        def _fetchone():
            idx = call_index[0] - 1
            if idx < len(fetchone_values):
                val = fetchone_values[idx]
                if isinstance(val, Exception):
                    return None
                return val
            return None

        mock_cursor.execute.side_effect = _execute
        mock_cursor.fetchone.side_effect = _fetchone
        mock_conn.cursor.return_value = mock_cursor
        yield mock_conn

    return mock_get_db


def _patch_db(fetchone_values):
    return patch("app.api.v1.endpoints.statistics.get_db", new=_make_db_patch(fetchone_values))


# ─── Sample DB row ────────────────────────────────────────────────────────────

SUMMARY_ROW = {
    "total_municipalities": 645,
    "municipalities_with_data": 612,
    "total_biogas": 15_000_000_000.0,
    "total_energy": 3_000_000.0,
    "total_co2": 2_500_000.0,
    "total_population": 45_000_000,
    "total_urban": 6_000_000_000.0,
    "total_agricultural": 5_000_000_000.0,
    "total_livestock": 4_000_000_000.0,
}

SUMMARY_ROW_ZEROS = {
    "total_municipalities": 0,
    "municipalities_with_data": 0,
    "total_biogas": 0,
    "total_energy": 0,
    "total_co2": 0,
    "total_population": 0,
    "total_urban": 0,
    "total_agricultural": 0,
    "total_livestock": 0,
}

CATEGORY_ROW = {
    "count": 412,
    "total": 5_000_000_000.0,
    "avg": 12_135_922.0,
    "maximum": 850_000_000.0,
    "minimum": 1_200.0,
}

CATEGORY_ROW_ZEROS = {
    "count": 0,
    "total": 0,
    "avg": 0,
    "maximum": 0,
    "minimum": 0,
}


# ─── /statistics/summary ──────────────────────────────────────────────────────


@pytest.mark.integration
class TestGetSummaryStatistics:
    """Tests for GET /api/v1/statistics/summary (public, no auth required)."""

    def test_summary_happy_path(self):
        """Returns structured summary with all expected top-level keys."""
        with _patch_db([SUMMARY_ROW]):
            response = TestClient(app).get("/api/v1/statistics/summary")

        assert response.status_code == 200
        data = response.json()

        # Top-level structure
        assert "total_municipalities" in data
        assert "municipalities_with_biogas_data" in data
        assert "total_biogas_m3_year" in data
        assert "total_energy_mwh_year" in data
        assert "total_co2_reduction_tons_year" in data
        assert "total_population" in data
        assert "average_biogas_m3_year" in data
        assert "by_category" in data
        assert "metadata" in data

        # Numeric sanity
        assert data["total_municipalities"] == 645
        assert data["municipalities_with_biogas_data"] == 612
        assert data["total_biogas_m3_year"] == 15_000_000_000.0
        assert data["total_population"] == 45_000_000

    def test_summary_by_category_structure(self):
        """by_category contains urban, agricultural, livestock each with total_m3_year and percentage."""
        with _patch_db([SUMMARY_ROW]):
            response = TestClient(app).get("/api/v1/statistics/summary")

        data = response.json()
        by_cat = data["by_category"]

        for key in ("urban", "agricultural", "livestock"):
            assert key in by_cat, f"Missing category: {key}"
            assert "total_m3_year" in by_cat[key]
            assert "percentage" in by_cat[key]

        # Percentages should be > 0 when biogas total is non-zero
        assert by_cat["urban"]["percentage"] > 0
        assert by_cat["agricultural"]["percentage"] > 0

    def test_summary_percentages_sum_to_100(self):
        """Urban + agricultural + livestock percentages equal 100% of the total biogas."""
        with _patch_db([SUMMARY_ROW]):
            response = TestClient(app).get("/api/v1/statistics/summary")

        by_cat = response.json()["by_category"]
        total = (
            by_cat["urban"]["percentage"]
            + by_cat["agricultural"]["percentage"]
            + by_cat["livestock"]["percentage"]
        )
        assert abs(total - 100.0) < 0.1, f"Percentages don't add up to 100: {total}"

    def test_summary_metadata_present(self):
        """metadata key contains source and note."""
        with _patch_db([SUMMARY_ROW]):
            response = TestClient(app).get("/api/v1/statistics/summary")

        meta = response.json()["metadata"]
        assert "source" in meta
        assert "note" in meta

    def test_summary_all_zeros(self):
        """Handles a database row with all-zero values without errors."""
        with _patch_db([SUMMARY_ROW_ZEROS]):
            response = TestClient(app).get("/api/v1/statistics/summary")

        assert response.status_code == 200
        data = response.json()
        assert data["total_municipalities"] == 0
        assert data["total_biogas_m3_year"] == 0.0
        assert data["average_biogas_m3_year"] == 0
        # Percentages should be 0 when total biogas is 0
        for cat in ("urban", "agricultural", "livestock"):
            assert data["by_category"][cat]["percentage"] == 0

    def test_summary_db_error(self):
        """Returns 500 on database failure."""
        with _patch_db([Exception("connection timeout")]):
            response = TestClient(app).get("/api/v1/statistics/summary")

        assert response.status_code == 500
        assert "Failed to fetch summary statistics" in response.json()["detail"]


# ─── /statistics/category/{category} ─────────────────────────────────────────


@pytest.mark.integration
class TestGetCategoryStatistics:
    """Tests for GET /api/v1/statistics/category/{category} (requires auth)."""

    def test_category_urban_happy_path(self):
        """Returns statistics for the 'urban' category."""
        with _patch_db([CATEGORY_ROW]):
            with _authenticated_client() as c:
                response = c.get("/api/v1/statistics/category/urban")

        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "urban"
        assert "municipalities_with_data" in data
        assert "total_m3_year" in data
        assert "average_m3_year" in data
        assert "max_m3_year" in data
        assert "min_m3_year" in data
        assert data["municipalities_with_data"] == 412
        assert data["total_m3_year"] == 5_000_000_000.0

    def test_category_agricultural_happy_path(self):
        """Returns statistics for the 'agricultural' category."""
        with _patch_db([CATEGORY_ROW]):
            with _authenticated_client() as c:
                response = c.get("/api/v1/statistics/category/agricultural")

        assert response.status_code == 200
        assert response.json()["category"] == "agricultural"

    def test_category_livestock_happy_path(self):
        """Returns statistics for the 'livestock' category."""
        with _patch_db([CATEGORY_ROW]):
            with _authenticated_client() as c:
                response = c.get("/api/v1/statistics/category/livestock")

        assert response.status_code == 200
        assert response.json()["category"] == "livestock"

    def test_category_invalid_returns_400(self):
        """Returns 400 for an unrecognised category name."""
        with _authenticated_client() as c:
            response = c.get("/api/v1/statistics/category/invalid_category")

        assert response.status_code == 400
        detail = response.json()["detail"]
        assert "Invalid category" in detail

    def test_category_unauthenticated_returns_403_or_401(self):
        """Unauthenticated requests are rejected."""
        response = TestClient(app).get("/api/v1/statistics/category/urban")
        assert response.status_code in (401, 403)

    def test_category_all_zeros(self):
        """Handles zero-value database row gracefully."""
        with _patch_db([CATEGORY_ROW_ZEROS]):
            with _authenticated_client() as c:
                response = c.get("/api/v1/statistics/category/urban")

        assert response.status_code == 200
        data = response.json()
        assert data["total_m3_year"] == 0.0
        assert data["municipalities_with_data"] == 0

    def test_category_db_error(self):
        """Returns 500 on database failure."""
        with _patch_db([Exception("query failed")]):
            with _authenticated_client() as c:
                response = c.get("/api/v1/statistics/category/urban")

        assert response.status_code == 500
        assert "Failed to fetch category statistics" in response.json()["detail"]
