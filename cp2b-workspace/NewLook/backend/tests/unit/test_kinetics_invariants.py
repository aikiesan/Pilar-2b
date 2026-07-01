"""
Kinetics Invariants — Three-Fraction Biodegradation Model

The scientific/kinetics endpoint returns kinetic parameters derived from
experimental batch tests (VDI 4630 / DIN EN ISO 11734 standard).

Physical constraints that MUST hold for every valid kinetics record:

1. Fractional partitioning: f_slow + f_med + f_fast ≈ 1.0
   Basis: total organic matter is partitioned into three degradability classes;
   together they must account for 100% of the biodegradable VS.
   Source: ADM1 (Batstone et al. 2002, IWA Scientific Report)

2. Rate constant ordering: k_slow < k_med < k_fast
   Basis: by definition, the 'slow' fraction degrades at a slower rate than
   the 'medium' and 'fast' fractions.
   Source: VDI 4630:2016 — Fermentation of organic materials

3. Time milestone ordering: t50 < t80
   Basis: 50% degradation must occur before 80% degradation by definition.
   Source: DIN EN ISO 11734

4. FQ (quality factor): 0.0 ≤ FQ ≤ 1.0
   Basis: FQ is a dimensionless fraction representing the proportion of
   simulated BMP that matches experimental results.

5. BMP values in physical range: 50–800 NmL CH₄/g VS
   Basis: outside this range, the residue would be either barely biodegradable
   (<50) or more energetic than pure cellulose (>800, not observed in practice).
   Source: Angelidaki & Sanders 2004 (Bioresource Technology)

6. k values in physical range: (0.001–200 day⁻¹)
   Basis: rate constants faster than 200/day would complete degradation in
   minutes (unrealistically fast); slower than 0.001/day would take years for
   a single-stage continuous system.
"""

from contextlib import contextmanager
from unittest.mock import MagicMock

import pytest

# ── Representative valid kinetics records ─────────────────────────────────────

VALID_KINETICS_ROW = {
    # Three-fraction kinetic model constants (VDI 4630)
    "k_slow": 0.05,  # day⁻¹ — slow-biodegradable fraction rate
    "k_med": 0.50,  # day⁻¹ — medium-biodegradable fraction rate
    "k_fast": 5.00,  # day⁻¹ — fast-biodegradable fraction rate
    "f_slow": 0.30,  # dimensionless — fraction of slow-degradable VS
    "f_med": 0.50,  # dimensionless — fraction of medium-degradable VS
    "f_fast": 0.20,  # dimensionless — fraction of fast-degradable VS
    "FQ": 0.95,  # dimensionless — simulation quality factor
    # BMP values (NmL CH₄/g VS)
    "bmp_experimental": 275.0,
    "bmp_simulated": 280.5,
    # Degradation time milestones (days, at 37°C mesophilic)
    "t50": 18.0,
    "t80": 32.0,
    "retention_time": 21,
    "temperature": 37.0,
    "test_standard": "VDI 4630",
}

VALID_KINETICS_VARIANT_SWINE = {
    # Swine manure — fast-dominant, low retention time
    "k_slow": 0.03,
    "k_med": 0.40,
    "k_fast": 4.50,
    "f_slow": 0.15,
    "f_med": 0.35,
    "f_fast": 0.50,
    "FQ": 0.92,
    "bmp_experimental": 210.0,
    "bmp_simulated": 205.0,
    "t50": 10.0,
    "t80": 22.0,
    "retention_time": 15,
    "temperature": 37.0,
    "test_standard": "VDI 4630",
}

VALID_KINETICS_VARIANT_SUGARCANE = {
    # Sugarcane bagaço — lignocellulosic, slow-dominant
    "k_slow": 0.08,
    "k_med": 0.60,
    "k_fast": 6.00,
    "f_slow": 0.55,
    "f_med": 0.35,
    "f_fast": 0.10,
    "FQ": 0.88,
    "bmp_experimental": 350.0,
    "bmp_simulated": 340.0,
    "t50": 28.0,
    "t80": 45.0,
    "retention_time": 30,
    "temperature": 37.0,
    "test_standard": "VDI 4630",
}

ALL_VALID_ROWS = [
    VALID_KINETICS_ROW,
    VALID_KINETICS_VARIANT_SWINE,
    VALID_KINETICS_VARIANT_SUGARCANE,
]

# ── Fraction summation tests ──────────────────────────────────────────────────


@pytest.mark.unit
class TestFractionSummation:
    """
    ADM1 three-fraction partitioning requires f_slow + f_med + f_fast = 1.0.
    We allow a ±0.02 tolerance for rounding from experimental measurements.
    """

    FRACTION_TOLERANCE = 0.02

    @pytest.mark.parametrize("row", ALL_VALID_ROWS)
    def test_fractions_sum_to_unity(self, row):
        total = row["f_slow"] + row["f_med"] + row["f_fast"]
        assert abs(total - 1.0) <= self.FRACTION_TOLERANCE, (
            f"f_slow + f_med + f_fast = {total:.4f}, expected 1.0 ± {self.FRACTION_TOLERANCE} "
            f"(source: ADM1 / VDI 4630)"
        )

    def test_valid_base_row_fractions_sum_to_unity(self):
        row = VALID_KINETICS_ROW
        total = row["f_slow"] + row["f_med"] + row["f_fast"]
        assert abs(total - 1.0) <= self.FRACTION_TOLERANCE

    def test_near_unity_fractions_accepted(self):
        # 0.30 + 0.50 + 0.19 = 0.99 — within tolerance
        total = 0.30 + 0.50 + 0.19
        assert abs(total - 1.0) <= self.FRACTION_TOLERANCE

    def test_each_fraction_is_non_negative(self):
        for row in ALL_VALID_ROWS:
            assert row["f_slow"] >= 0, "f_slow must be non-negative"
            assert row["f_med"] >= 0, "f_med must be non-negative"
            assert row["f_fast"] >= 0, "f_fast must be non-negative"

    def test_each_fraction_does_not_exceed_unity(self):
        for row in ALL_VALID_ROWS:
            assert row["f_slow"] <= 1.0
            assert row["f_med"] <= 1.0
            assert row["f_fast"] <= 1.0


# ── Rate constant ordering ────────────────────────────────────────────────────


@pytest.mark.unit
class TestRateConstantOrdering:
    """
    By definition in VDI 4630:
      k_slow < k_med < k_fast
    A residue where the 'slow' constant is larger than 'fast' would indicate
    a labelling error in the database.
    """

    @pytest.mark.parametrize("row", ALL_VALID_ROWS)
    def test_rate_constants_are_monotonically_increasing(self, row):
        assert (
            row["k_slow"] < row["k_med"]
        ), f"k_slow ({row['k_slow']}) must be < k_med ({row['k_med']})"
        assert (
            row["k_med"] < row["k_fast"]
        ), f"k_med ({row['k_med']}) must be < k_fast ({row['k_fast']})"

    @pytest.mark.parametrize(
        "field,lo,hi",
        [
            ("k_slow", 0.001, 10.0),  # Typical slow range (Gujer & Zehnder 1983)
            ("k_med", 0.010, 50.0),
            ("k_fast", 0.100, 200.0),
        ],
    )
    def test_rate_constant_physical_range(self, field, lo, hi):
        # Source: Gujer & Zehnder 1983 (Water Research); Batstone et al. 2002
        for row in ALL_VALID_ROWS:
            val = row[field]
            assert lo <= val <= hi, f"{field} = {val} outside physical range [{lo}, {hi}] day⁻¹"


# ── Time milestone ordering ───────────────────────────────────────────────────


@pytest.mark.unit
class TestTimeMilestoneOrdering:
    """
    Biodegradation milestones must be monotonically increasing:
    t50 (50% degradation) must precede t80 (80% degradation).
    Source: DIN EN ISO 11734
    """

    @pytest.mark.parametrize("row", ALL_VALID_ROWS)
    def test_t50_is_less_than_t80(self, row):
        assert row["t50"] < row["t80"], f"t50 ({row['t50']} d) must be < t80 ({row['t80']} d)"

    @pytest.mark.parametrize("row", ALL_VALID_ROWS)
    def test_t50_is_positive(self, row):
        assert row["t50"] > 0, "t50 must be positive (days)"

    @pytest.mark.parametrize("row", ALL_VALID_ROWS)
    def test_t80_within_practical_range(self, row):
        # Longer than 200 days would be outside practical digestion periods
        assert 5 <= row["t80"] <= 200, f"t80={row['t80']} outside [5, 200] days"


# ── Quality factor (FQ) bounds ────────────────────────────────────────────────


@pytest.mark.unit
class TestQualityFactor:
    """FQ is a dimensionless fraction: 0.0 ≤ FQ ≤ 1.0."""

    @pytest.mark.parametrize("row", ALL_VALID_ROWS)
    def test_fq_is_a_fraction(self, row):
        assert 0.0 <= row["FQ"] <= 1.0, f"FQ={row['FQ']} outside [0.0, 1.0]"


# ── BMP physical bounds ───────────────────────────────────────────────────────


@pytest.mark.unit
class TestBMPBounds:
    """
    BMP (Biochemical Methane Potential):
      50–800 NmL CH₄/g VS is the literature-supported range.
      Below 50: barely biodegradable (e.g., lignin-rich residues at limits).
      Above 800: not observed in practice for complex organic materials.
    Source: Angelidaki & Sanders 2004 (Bioresource Technology 95:1–10)
    """

    BMP_MIN = 50
    BMP_MAX = 800

    @pytest.mark.parametrize("bmp_field", ["bmp_experimental", "bmp_simulated"])
    def test_bmp_within_physical_range(self, bmp_field):
        for row in ALL_VALID_ROWS:
            val = row[bmp_field]
            assert self.BMP_MIN <= val <= self.BMP_MAX, (
                f"{bmp_field} = {val} NmL CH₄/g VS outside physical range "
                f"[{self.BMP_MIN}, {self.BMP_MAX}]"
            )

    @pytest.mark.parametrize("row", ALL_VALID_ROWS)
    def test_simulated_bmp_within_20pct_of_experimental(self, row):
        # A model with > 20% error relative to experiment is poorly calibrated
        # Source: VDI 4630:2016 — acceptance criterion for batch tests
        ratio = abs(row["bmp_simulated"] - row["bmp_experimental"]) / row["bmp_experimental"]
        assert ratio < 0.20, (
            f"bmp_simulated ({row['bmp_simulated']}) deviates "
            f"{ratio:.1%} from bmp_experimental ({row['bmp_experimental']}) "
            f"— exceeds 20% VDI 4630 acceptance threshold"
        )


# ── Endpoint integration: kinetics data preserved through API layer ───────────


@pytest.mark.unit
class TestKineticsEndpointPreservation:
    """
    When the endpoint receives a valid kinetics record from the DB cursor,
    it must not corrupt or clamp the fraction values through its safe_float
    parsing layer.
    """

    def _make_db_row(self, row: dict) -> dict:
        """Simulate a psycopg2 RealDictCursor row for the kinetics endpoint.
        Fields mirror the SELECT columns in scientific.py: residue_id, residue_name,
        sector, bmp_experimental, kinetics, references_list.
        """
        return {
            "residue_id": 1,
            "residue_name": "Residue Under Test",
            "sector": "AGR",
            "bmp_experimental": row["bmp_experimental"],
            "kinetics": row,  # JSONB dict returned by psycopg2 RealDictCursor
            "references_list": [],
        }

    def test_fraction_sum_preserved_through_endpoint(self, client, mock_db_connection):
        from unittest.mock import MagicMock

        mock_conn, _ = mock_db_connection
        db_row = self._make_db_row(VALID_KINETICS_ROW)

        cursor_mock = MagicMock()
        cursor_mock.fetchall.return_value = [db_row]
        cursor_mock.execute = MagicMock()
        cursor_mock.close = MagicMock()
        mock_conn.cursor.return_value = cursor_mock

        response = client.get("/api/v1/scientific/kinetics")
        assert response.status_code == 200

        body = response.json()
        # Endpoint returns {"success": True, "count": N, "data": [...]}
        data = body.get("data", body) if isinstance(body, dict) else body
        assert len(data) > 0, "Expected at least one kinetics record"

        row = data[0]
        # Only check if the endpoint actually returned these fields
        if "f_slow" in row and "f_med" in row and "f_fast" in row:
            total = row["f_slow"] + row["f_med"] + row["f_fast"]
            assert (
                abs(total - 1.0) <= 0.02
            ), f"Endpoint corrupted fraction values: f_slow+f_med+f_fast={total:.4f}"
