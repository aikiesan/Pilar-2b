"""
Data integrity tests for geospatial and coordinate validation.

DB-level tests require a real PostgreSQL connection (TEST_DATABASE_URL env var).
Schema/validator tests run without a database and cover the Pydantic + Validators layer.
"""
import pytest
from fastapi import HTTPException

from app.middleware.validation import Validators


# ---------------------------------------------------------------------------
# Validator-layer tests (no DB required)
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestCoordinateBounds:
    """Validators must enforce WGS-84 coordinate bounds at the schema layer."""

    # --- latitude ---

    def test_latitude_valid_negative(self):
        assert Validators.latitude(-23.5) == -23.5

    def test_latitude_valid_zero(self):
        assert Validators.latitude(0.0) == 0.0

    def test_latitude_boundary_max(self):
        assert Validators.latitude(90.0) == 90.0

    def test_latitude_boundary_min(self):
        assert Validators.latitude(-90.0) == -90.0

    def test_latitude_exceeds_max(self):
        with pytest.raises(HTTPException) as exc_info:
            Validators.latitude(91.0)
        assert exc_info.value.status_code == 400

    def test_latitude_exceeds_min(self):
        with pytest.raises(HTTPException) as exc_info:
            Validators.latitude(-91.0)
        assert exc_info.value.status_code == 400

    def test_latitude_non_numeric(self):
        with pytest.raises(HTTPException) as exc_info:
            Validators.latitude("not-a-float")
        assert exc_info.value.status_code == 400

    # --- longitude ---

    def test_longitude_valid(self):
        assert Validators.longitude(-46.6) == -46.6

    def test_longitude_boundary_max(self):
        assert Validators.longitude(180.0) == 180.0

    def test_longitude_boundary_min(self):
        assert Validators.longitude(-180.0) == -180.0

    def test_longitude_exceeds_max(self):
        with pytest.raises(HTTPException) as exc_info:
            Validators.longitude(181.0)
        assert exc_info.value.status_code == 400

    def test_longitude_exceeds_min(self):
        with pytest.raises(HTTPException) as exc_info:
            Validators.longitude(-181.0)
        assert exc_info.value.status_code == 400

    def test_longitude_non_numeric(self):
        with pytest.raises(HTTPException) as exc_info:
            Validators.longitude("abc")
        assert exc_info.value.status_code == 400

    # --- radius ---

    def test_radius_valid(self):
        assert Validators.radius_km(10.0) == 10.0

    def test_radius_below_minimum(self):
        with pytest.raises(HTTPException) as exc_info:
            Validators.radius_km(0.05)
        assert exc_info.value.status_code == 400

    def test_radius_exceeds_maximum(self):
        with pytest.raises(HTTPException) as exc_info:
            Validators.radius_km(1001.0)
        assert exc_info.value.status_code == 400


@pytest.mark.unit
class TestMunicipalityCodeFormat:
    """IBGE codes must be exactly 7 digits."""

    def test_valid_code(self):
        assert Validators.municipality_code("3550308") == "3550308"

    def test_code_too_short(self):
        with pytest.raises(HTTPException) as exc_info:
            Validators.municipality_code("355030")
        assert exc_info.value.status_code == 400

    def test_code_too_long(self):
        with pytest.raises(HTTPException) as exc_info:
            Validators.municipality_code("35503081")
        assert exc_info.value.status_code == 400

    def test_code_with_letters(self):
        with pytest.raises(HTTPException) as exc_info:
            Validators.municipality_code("355030A")
        assert exc_info.value.status_code == 400

    def test_empty_code(self):
        with pytest.raises(HTTPException) as exc_info:
            Validators.municipality_code("")
        assert exc_info.value.status_code == 400


# ---------------------------------------------------------------------------
# DB-level tests (require TEST_DATABASE_URL)
# ---------------------------------------------------------------------------

@pytest.mark.database
@pytest.mark.integration
class TestDatabaseConstraints:
    """
    Structural integrity of the municipalities table.

    These tests require a real PostgreSQL connection via the db_transaction fixture
    (which rolls back after each test, leaving the DB clean).
    """

    def test_ibge_code_not_null_constraint(self, db_transaction):
        """Inserting a municipality row without ibge_code must raise IntegrityError."""
        import psycopg2

        with pytest.raises(psycopg2.IntegrityError):
            db_transaction.execute(
                """
                INSERT INTO municipalities (ibge_code, municipality_name, population, area_km2)
                VALUES (NULL, 'Test City', 100000, 500.0)
                """
            )

    def test_ibge_code_unique_constraint(self, db_transaction):
        """Inserting a duplicate ibge_code must raise IntegrityError."""
        import psycopg2

        # Try to find an existing ibge_code to trigger the duplicate
        db_transaction.execute(
            "SELECT ibge_code FROM municipalities LIMIT 1"
        )
        row = db_transaction.fetchone()
        if row is None:
            pytest.skip("No municipalities in DB — cannot test uniqueness constraint")

        existing_code = row["ibge_code"] if isinstance(row, dict) else row[0]

        with pytest.raises(psycopg2.IntegrityError):
            db_transaction.execute(
                """
                INSERT INTO municipalities (ibge_code, municipality_name, population, area_km2)
                VALUES (%s, 'Duplicate City', 50000, 250.0)
                """,
                (existing_code,)
            )

    def test_population_is_non_negative(self, db_transaction):
        """Verify that existing rows have non-negative population values."""
        db_transaction.execute(
            "SELECT COUNT(*) FROM municipalities WHERE population < 0"
        )
        row = db_transaction.fetchone()
        count = row[0] if not isinstance(row, dict) else row["count"]
        assert count == 0, f"Found {count} municipalities with negative population"

    def test_area_km2_is_positive(self, db_transaction):
        """Verify that existing rows have positive area values."""
        db_transaction.execute(
            "SELECT COUNT(*) FROM municipalities WHERE area_km2 <= 0"
        )
        row = db_transaction.fetchone()
        count = row[0] if not isinstance(row, dict) else row["count"]
        assert count == 0, f"Found {count} municipalities with non-positive area_km2"
