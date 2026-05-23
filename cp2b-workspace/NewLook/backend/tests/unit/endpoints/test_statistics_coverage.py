"""
Statistics endpoint — coverage for /summary and /category/{category}.

The existing test suite has ~70% coverage of statistics.py.
These tests cover the remaining branches: summary arithmetic, by_category
percentages, invalid category rejection, and the authenticated category endpoint.
"""

import pytest
from datetime import datetime, timezone
from unittest.mock import MagicMock
from fastapi.testclient import TestClient


# ─── Summary row factory ──────────────────────────────────────────────────────

def _summary_row(
    total=645,
    with_data=600,
    total_biogas=1_000_000_000.0,
    total_energy=400_000.0,
    total_co2=100_000.0,
    total_population=44_000_000,
    total_urban=200_000_000.0,
    total_agricultural=500_000_000.0,
    total_livestock=300_000_000.0,
):
    row = {
        "total_municipalities": total,
        "municipalities_with_data": with_data,
        "total_biogas": total_biogas,
        "total_energy": total_energy,
        "total_co2": total_co2,
        "total_population": total_population,
        "total_urban": total_urban,
        "total_agricultural": total_agricultural,
        "total_livestock": total_livestock,
    }
    mock = MagicMock()
    mock.__getitem__ = lambda self, k: row[k]
    mock.get = lambda k, default=None: row.get(k, default)
    return mock


def _category_row(count=400, total=500_000_000.0, avg=1_250_000.0,
                  maximum=80_000_000.0, minimum=1_000.0):
    row = {"count": count, "total": total, "avg": avg,
           "maximum": maximum, "minimum": minimum}
    mock = MagicMock()
    mock.__getitem__ = lambda self, k: row[k]
    mock.get = lambda k, default=None: row.get(k, default)
    return mock


# ─── Summary endpoint ─────────────────────────────────────────────────────────

@pytest.mark.unit
class TestSummaryStatistics:

    def test_returns_200(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _summary_row()
        response = client.get("/api/v1/statistics/summary")
        assert response.status_code == 200

    def test_has_total_municipalities(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _summary_row(total=645)
        data = client.get("/api/v1/statistics/summary").json()
        assert data["total_municipalities"] == 645

    def test_has_by_category_key(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _summary_row()
        data = client.get("/api/v1/statistics/summary").json()
        assert "by_category" in data

    def test_by_category_has_three_sectors(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _summary_row()
        data = client.get("/api/v1/statistics/summary").json()
        cat = data["by_category"]
        for sector in ("urban", "agricultural", "livestock"):
            assert sector in cat, f"Missing sector: {sector}"

    def test_sector_percentages_sum_to_100(self, client, mock_db_connection):
        """urban + agricultural + livestock percentages should equal 100."""
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _summary_row(
            total_biogas=1_000_000.0,
            total_urban=200_000.0,
            total_agricultural=500_000.0,
            total_livestock=300_000.0,
        )
        data = client.get("/api/v1/statistics/summary").json()
        cat = data["by_category"]
        total_pct = (
            cat["urban"]["percentage"]
            + cat["agricultural"]["percentage"]
            + cat["livestock"]["percentage"]
        )
        assert total_pct == pytest.approx(100.0, abs=0.1)

    def test_urban_percentage_correct(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _summary_row(
            total_biogas=1_000_000.0,
            total_urban=250_000.0,
            total_agricultural=500_000.0,
            total_livestock=250_000.0,
        )
        data = client.get("/api/v1/statistics/summary").json()
        assert data["by_category"]["urban"]["percentage"] == pytest.approx(25.0, abs=0.1)

    def test_average_biogas_is_total_divided_by_count(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _summary_row(
            total=100,
            total_biogas=5_000_000.0,
        )
        data = client.get("/api/v1/statistics/summary").json()
        assert data["average_biogas_m3_year"] == pytest.approx(50_000.0, rel=1e-3)

    def test_zero_municipalities_average_is_zero(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _summary_row(total=0, total_biogas=0.0)
        data = client.get("/api/v1/statistics/summary").json()
        assert data["average_biogas_m3_year"] == 0

    def test_has_metadata_key(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _summary_row()
        data = client.get("/api/v1/statistics/summary").json()
        assert "metadata" in data

    def test_each_sector_has_total_and_percentage(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _summary_row()
        data = client.get("/api/v1/statistics/summary").json()
        for sector in ("urban", "agricultural", "livestock"):
            s = data["by_category"][sector]
            assert "total_m3_year" in s
            assert "percentage" in s

    def test_percentages_zero_when_no_biogas(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _summary_row(total_biogas=0.0)
        data = client.get("/api/v1/statistics/summary").json()
        for sector in ("urban", "agricultural", "livestock"):
            assert data["by_category"][sector]["percentage"] == 0


# ─── Category endpoint ────────────────────────────────────────────────────────

@pytest.mark.unit
class TestCategoryStatistics:

    def test_invalid_category_returns_400(self, client):
        response = client.get("/api/v1/statistics/category/industrial")
        # industrial is not in the allowed set → 400 or 401 (auth check first)
        assert response.status_code in (400, 401, 403)

    def test_urban_category_unauthenticated_returns_401_or_403(self, client):
        # The endpoint requires authentication
        response = client.get("/api/v1/statistics/category/urban")
        assert response.status_code in (401, 403)

    def test_agricultural_category_unauthenticated_returns_401_or_403(self, client):
        response = client.get("/api/v1/statistics/category/agricultural")
        assert response.status_code in (401, 403)

    def test_livestock_category_unauthenticated_returns_401_or_403(self, client):
        response = client.get("/api/v1/statistics/category/livestock")
        assert response.status_code in (401, 403)


# ─── Analysis module: duplicate mapping removed ───────────────────────────────

@pytest.mark.unit
class TestAnalysisDuplicateMapping:

    def test_frontend_code_to_stream_is_defined_once(self):
        """Importing analysis should not raise NameError; dict defined once."""
        from app.api.v1.endpoints.analysis import FRONTEND_CODE_TO_STREAM
        assert isinstance(FRONTEND_CODE_TO_STREAM, dict)
        assert len(FRONTEND_CODE_TO_STREAM) > 0

    def test_sugarcane_codes_map_to_sugarcane(self):
        from app.api.v1.endpoints.analysis import FRONTEND_CODE_TO_STREAM
        for code in ("AG_CANA_BAGACO", "AG_CANA_PALHA", "AG_CANA_TORTA_FILTRO", "AG_CANA_VINHACA"):
            assert FRONTEND_CODE_TO_STREAM[code] == "sugarcane"

    def test_livestock_codes_present(self):
        from app.api.v1.endpoints.analysis import FRONTEND_CODE_TO_STREAM
        assert FRONTEND_CODE_TO_STREAM["PEC_ESTERCO_BOVINO"] == "cattle"
        assert FRONTEND_CODE_TO_STREAM["PEC_DEJETOS_LIQUIDOS_SUINO"] == "swine"
        assert FRONTEND_CODE_TO_STREAM["PEC_CAMA_AVIARIO"] == "poultry"

    def test_unmapped_industrial_codes_are_none(self):
        from app.api.v1.endpoints.analysis import FRONTEND_CODE_TO_STREAM
        for code in ("IND_BAGACO_MALTE", "IND_TRUB_CERVEJA", "IND_SORO_LATICINIOS"):
            assert FRONTEND_CODE_TO_STREAM[code] is None


# ─── Authenticated category endpoint ─────────────────────────────────────────

def _make_authenticated_client(test_app):
    """Return a TestClient whose require_authenticated dep is bypassed."""
    from app.middleware.auth import require_authenticated
    from app.models.auth import UserProfile

    fake_user = UserProfile(
        id="test-uid",
        email="test@example.com",
        full_name="Test User",
        role="autenticado",
        created_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
        updated_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
    )
    test_app.dependency_overrides[require_authenticated] = lambda: fake_user
    client = TestClient(test_app, base_url="http://testserver")
    return client


@pytest.mark.unit
class TestCategoryStatisticsAuthenticated:

    def test_urban_category_returns_200(self, test_app, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _category_row()
        c = _make_authenticated_client(test_app)
        response = c.get("/api/v1/statistics/category/urban")
        assert response.status_code == 200

    def test_agricultural_category_returns_200(self, test_app, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _category_row()
        c = _make_authenticated_client(test_app)
        response = c.get("/api/v1/statistics/category/agricultural")
        assert response.status_code == 200

    def test_livestock_category_returns_200(self, test_app, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _category_row()
        c = _make_authenticated_client(test_app)
        response = c.get("/api/v1/statistics/category/livestock")
        assert response.status_code == 200

    def test_response_has_category_field(self, test_app, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _category_row()
        c = _make_authenticated_client(test_app)
        data = c.get("/api/v1/statistics/category/urban").json()
        assert data["category"] == "urban"

    def test_response_has_total_m3_year(self, test_app, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _category_row(total=500_000_000.0)
        c = _make_authenticated_client(test_app)
        data = c.get("/api/v1/statistics/category/agricultural").json()
        assert data["total_m3_year"] == pytest.approx(500_000_000.0)

    def test_response_has_average_and_bounds(self, test_app, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _category_row(avg=1_250_000.0, maximum=80_000_000.0, minimum=1_000.0)
        c = _make_authenticated_client(test_app)
        data = c.get("/api/v1/statistics/category/livestock").json()
        assert "average_m3_year" in data
        assert "max_m3_year" in data
        assert "min_m3_year" in data

    def test_municipalities_with_data_field(self, test_app, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _category_row(count=400)
        c = _make_authenticated_client(test_app)
        data = c.get("/api/v1/statistics/category/urban").json()
        assert data["municipalities_with_data"] == 400

    def test_invalid_category_authenticated_returns_400(self, test_app, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        c = _make_authenticated_client(test_app)
        response = c.get("/api/v1/statistics/category/industrial")
        assert response.status_code == 400
