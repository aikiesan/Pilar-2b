"""
Domain Invariants — Municipality Biogas Summation Tests

Verifies that the aggregated biogas fields in municipality records obey the
additive relationships that the underlying data model requires.

Every assertion references the sector hierarchy:
  total_biogas = urban + agricultural + livestock
  agricultural = sugarcane + soybean + corn + coffee + citrus
  livestock    = cattle + swine + poultry + aquaculture
  urban        = rsu + rpo

These invariants hold in the production database and must hold in any test
fixture used to verify endpoint behaviour.  If a fixture violates them,
the test suite would be passing queries against internally incoherent data
and providing false confidence.

Scientific basis: residue_streams_sp2023 table (authoritative long-format
data) is the provenance for all per-residue biogas values.  The municipality
record stores pre-aggregated sums computed at data ingestion time.
"""

import pytest

# ── Scientifically consistent municipality fixture ────────────────────────────
# Every field is derived from primary values; sums verified manually.
# Represents a mid-size São Paulo município with mixed agricultural and urban
# biogas potential (loosely calibrated against Campinas-region order of magnitude).

_CROP_BIOGAS = {
    "sugarcane_biogas_m3_year": 60_000_000,
    "soybean_biogas_m3_year":   10_000_000,
    "corn_biogas_m3_year":       8_000_000,
    "coffee_biogas_m3_year":     5_000_000,
    "citrus_biogas_m3_year":     2_000_000,
}
_LIVESTOCK_BIOGAS = {
    "cattle_biogas_m3_year":    30_000_000,
    "swine_biogas_m3_year":     20_000_000,
    "poultry_biogas_m3_year":   10_000_000,
    "aquaculture_biogas_m3_year": 2_000_000,
}
_URBAN_BIOGAS = {
    "rsu_biogas_m3_year":       15_000_000,
    "rpo_biogas_m3_year":        5_000_000,
}

_AGRICULTURAL_TOTAL = sum(_CROP_BIOGAS.values())    # 85_000_000
_LIVESTOCK_TOTAL    = sum(_LIVESTOCK_BIOGAS.values()) # 62_000_000
_URBAN_TOTAL        = sum(_URBAN_BIOGAS.values())     # 20_000_000
_GRAND_TOTAL        = _AGRICULTURAL_TOTAL + _LIVESTOCK_TOTAL + _URBAN_TOTAL  # 167_000_000

SP_MUNICIPALITY_FIXTURE: dict = {
    # ── Identity ────────────────────────────────────────────────────────────
    "id": 1,
    "municipality_name": "Campinas",
    "ibge_code": "3509502",
    "state": "SP",

    # ── Demography / geography ──────────────────────────────────────────────
    "population": 1_200_000,
    "urban_population": 1_150_000,
    "rural_population": 50_000,
    "area_km2": 796.0,
    "population_density": 1507.5,   # population / area_km2
    "gdp_total": 60_000_000_000.0,
    "gdp_per_capita": 50_000.0,

    # ── Spatial ─────────────────────────────────────────────────────────────
    "centroid_lat": -22.9056,
    "centroid_lng": -47.0608,
    "administrative_region": "Metropolitana de Campinas",
    "immediate_region": "Campinas",
    "intermediate_region": "Campinas",

    # ── Sector subtotals (must equal sum of residue streams below) ──────────
    "agricultural_biogas_m3_year": _AGRICULTURAL_TOTAL,
    "livestock_biogas_m3_year":    _LIVESTOCK_TOTAL,
    "urban_biogas_m3_year":        _URBAN_TOTAL,
    "total_biogas_m3_year":        _GRAND_TOTAL,

    # ── Agricultural residue streams ─────────────────────────────────────────
    **_CROP_BIOGAS,

    # ── Livestock residue streams ────────────────────────────────────────────
    **_LIVESTOCK_BIOGAS,

    # ── Urban residue streams ────────────────────────────────────────────────
    **_URBAN_BIOGAS,

    # ── Derived energy / emissions ───────────────────────────────────────────
    # Rough conversion: 1 m³ biogas ≈ 0.005 MWh (50% CH4, LHV 35.8 MJ/m³, η=35%)
    # These are stored pre-computed in the DB; just needs to be in plausible range
    "energy_potential_mwh_year": round(_GRAND_TOTAL * 0.005),   # ~835 000 MWh
    "energy_potential_kwh_day":  round(_GRAND_TOTAL * 0.005 * 1000 / 365),
    "co2_reduction_tons_year":   round(_GRAND_TOTAL * 0.005 * 0.4),  # 0.4 tCO2/MWh
    "ranking": 5,

    # ── Biomass fields (reverse-BMP derived; may be None in legacy rows) ─────
    "total_biomass_tons_year":          None,
    "agricultural_biomass_tons_year":   None,
    "livestock_biomass_tons_year":      None,
    "urban_biomass_tons_year":          None,

    # ── GeoJSON geometry placeholder ─────────────────────────────────────────
    "geojson": '{"type":"Polygon","coordinates":[[[-47.3,-23.0],[-46.8,-23.0],[-46.8,-22.8],[-47.3,-22.8],[-47.3,-23.0]]]}',
    "centroid": {"type": "Point", "coordinates": [-47.0608, -22.9056]},

    # ── Cluster data ─────────────────────────────────────────────────────────
    "cluster_id": None,
    "dominant_stream": "sugarcane",
    "potential_class": "ALTO",
    "n_streams": 9,
}

# Relative tolerance for summation tests (1% — accounts for rounding in real data)
_SUM_TOL = 0.01

# ── Summation invariant tests ─────────────────────────────────────────────────

@pytest.mark.unit
class TestBiogasSummationInvariants:
    """
    Verify that the disaggregated biogas fields in the fixture sum correctly to
    their respective sector totals and to the grand total.
    """

    def _relative_error(self, computed: float, stored: float) -> float:
        if stored == 0:
            return abs(computed)
        return abs(computed - stored) / stored

    def test_total_biogas_equals_sum_of_three_sectors(self):
        row = SP_MUNICIPALITY_FIXTURE
        sector_sum = (
            row["urban_biogas_m3_year"] +
            row["agricultural_biogas_m3_year"] +
            row["livestock_biogas_m3_year"]
        )
        err = self._relative_error(sector_sum, row["total_biogas_m3_year"])
        assert err < _SUM_TOL, (
            f"Sector sum ({sector_sum:,}) differs from total_biogas "
            f"({row['total_biogas_m3_year']:,}) by {err:.2%}"
        )

    def test_agricultural_equals_sum_of_crop_residue_streams(self):
        row = SP_MUNICIPALITY_FIXTURE
        crop_sum = (
            row["sugarcane_biogas_m3_year"] +
            row["soybean_biogas_m3_year"] +
            row["corn_biogas_m3_year"] +
            row["coffee_biogas_m3_year"] +
            row["citrus_biogas_m3_year"]
        )
        err = self._relative_error(crop_sum, row["agricultural_biogas_m3_year"])
        assert err < _SUM_TOL, (
            f"Crop stream sum ({crop_sum:,}) differs from agricultural_biogas "
            f"({row['agricultural_biogas_m3_year']:,}) by {err:.2%}"
        )

    def test_livestock_equals_sum_of_livestock_residue_streams(self):
        row = SP_MUNICIPALITY_FIXTURE
        livestock_sum = (
            row["cattle_biogas_m3_year"] +
            row["swine_biogas_m3_year"] +
            row["poultry_biogas_m3_year"] +
            row["aquaculture_biogas_m3_year"]
        )
        err = self._relative_error(livestock_sum, row["livestock_biogas_m3_year"])
        assert err < _SUM_TOL, (
            f"Livestock stream sum ({livestock_sum:,}) differs from livestock_biogas "
            f"({row['livestock_biogas_m3_year']:,}) by {err:.2%}"
        )

    def test_urban_equals_sum_of_urban_residue_streams(self):
        row = SP_MUNICIPALITY_FIXTURE
        urban_sum = (
            row["rsu_biogas_m3_year"] +
            row["rpo_biogas_m3_year"]
        )
        err = self._relative_error(urban_sum, row["urban_biogas_m3_year"])
        assert err < _SUM_TOL


# ── Non-negativity constraints ────────────────────────────────────────────────

@pytest.mark.unit
class TestBiogasNonNegativity:
    """All biogas fields must be non-negative (a negative biogas volume has no physical meaning)."""

    BIOGAS_FIELDS = [
        "total_biogas_m3_year",
        "agricultural_biogas_m3_year",
        "livestock_biogas_m3_year",
        "urban_biogas_m3_year",
        "sugarcane_biogas_m3_year",
        "soybean_biogas_m3_year",
        "corn_biogas_m3_year",
        "coffee_biogas_m3_year",
        "citrus_biogas_m3_year",
        "cattle_biogas_m3_year",
        "swine_biogas_m3_year",
        "poultry_biogas_m3_year",
        "aquaculture_biogas_m3_year",
        "rsu_biogas_m3_year",
        "rpo_biogas_m3_year",
    ]

    @pytest.mark.parametrize("field", BIOGAS_FIELDS)
    def test_biogas_field_is_non_negative(self, field):
        val = SP_MUNICIPALITY_FIXTURE[field]
        assert val is None or val >= 0, f"{field} must be >= 0, got {val}"

    def test_sector_totals_do_not_exceed_grand_total(self):
        row = SP_MUNICIPALITY_FIXTURE
        for sector in ["agricultural_biogas_m3_year", "livestock_biogas_m3_year", "urban_biogas_m3_year"]:
            assert row[sector] <= row["total_biogas_m3_year"], (
                f"{sector} ({row[sector]:,}) exceeds total_biogas ({row['total_biogas_m3_year']:,})"
            )


# ── Demographic consistency ───────────────────────────────────────────────────

@pytest.mark.unit
class TestDemographicConsistency:
    """Demographic fields must obey self-evident constraints."""

    def test_urban_plus_rural_equals_total_population(self):
        row = SP_MUNICIPALITY_FIXTURE
        expected = row["urban_population"] + row["rural_population"]
        assert expected == row["population"], (
            f"urban ({row['urban_population']:,}) + rural ({row['rural_population']:,}) "
            f"≠ population ({row['population']:,})"
        )

    def test_urban_population_lte_total(self):
        row = SP_MUNICIPALITY_FIXTURE
        assert row["urban_population"] <= row["population"]

    def test_population_density_consistent_with_area(self):
        row = SP_MUNICIPALITY_FIXTURE
        expected_density = row["population"] / row["area_km2"]
        error = abs(expected_density - row["population_density"]) / expected_density
        assert error < 0.01, (
            f"population_density ({row['population_density']}) inconsistent with "
            f"population/area ({expected_density:.1f})"
        )


# ── Energy and CO₂ plausibility ───────────────────────────────────────────────

@pytest.mark.unit
class TestEnergyPlausibility:
    """
    Energy potential and CO₂ reduction fields must be within physically plausible
    ranges.  The conversion factors used in production:
      energy ≈ biogas_m3 × 0.005 MWh/m³  (50% CH4, η_elec=35%, LHV 35.8 MJ/m³)
      co2    ≈ energy_MWh × 0.4 tCO2/MWh (grid displacement factor, SEEG BR 2023)

    Acceptable range: ×0.1 to ×10 of the point estimate (order-of-magnitude check).
    """

    # Conversion bounds — sources: SEEG Brasil 2023, IPCC AR6 energy sector
    ENERGY_MWH_PER_M3_LOW  = 0.001   # pessimistic (low CH4, low efficiency)
    ENERGY_MWH_PER_M3_HIGH = 0.010   # optimistic (high CH4, high efficiency)
    CO2_TONS_PER_MWH_LOW   = 0.20    # recent grid mix (high renewables)
    CO2_TONS_PER_MWH_HIGH  = 0.70    # older fossil baseline

    def test_energy_potential_within_physical_range(self):
        row = SP_MUNICIPALITY_FIXTURE
        total = row["total_biogas_m3_year"]
        energy = row["energy_potential_mwh_year"]
        lo = total * self.ENERGY_MWH_PER_M3_LOW
        hi = total * self.ENERGY_MWH_PER_M3_HIGH
        assert lo <= energy <= hi, (
            f"energy_potential_mwh_year ({energy:,}) outside plausible range "
            f"[{lo:,.0f}, {hi:,.0f}] for biogas = {total:,} m³/yr"
        )

    def test_co2_reduction_within_physical_range(self):
        row = SP_MUNICIPALITY_FIXTURE
        energy = row["energy_potential_mwh_year"]
        co2 = row["co2_reduction_tons_year"]
        lo = energy * self.CO2_TONS_PER_MWH_LOW
        hi = energy * self.CO2_TONS_PER_MWH_HIGH
        assert lo <= co2 <= hi, (
            f"co2_reduction_tons_year ({co2:,}) outside plausible range "
            f"[{lo:,.0f}, {hi:,.0f}] for energy = {energy:,} MWh/yr"
        )

    def test_energy_kwh_day_consistent_with_mwh_year(self):
        row = SP_MUNICIPALITY_FIXTURE
        if row.get("energy_potential_kwh_day") is None:
            return
        # MWh/yr × 1000 / 365 = kWh/day
        expected = row["energy_potential_mwh_year"] * 1000 / 365
        actual   = row["energy_potential_kwh_day"]
        err = abs(expected - actual) / expected
        assert err < 0.01, (
            f"energy_potential_kwh_day ({actual:.0f}) inconsistent with "
            f"energy_potential_mwh_year/365 ({expected:.0f})"
        )


# ── Geographic plausibility ───────────────────────────────────────────────────

@pytest.mark.unit
class TestGeographicPlausibility:
    """
    São Paulo state bounds (approximate):
      Latitude:  -25.3° S to -19.8° S
      Longitude: -53.1° W to -44.2° W
    Source: IBGE Geographic Atlas of Brazil (2022)
    """

    SP_LAT_MIN, SP_LAT_MAX = -25.3, -19.8
    SP_LON_MIN, SP_LON_MAX = -53.1, -44.2

    def test_centroid_latitude_within_sao_paulo_state(self):
        lat = SP_MUNICIPALITY_FIXTURE["centroid_lat"]
        assert self.SP_LAT_MIN <= lat <= self.SP_LAT_MAX, (
            f"centroid_lat={lat} outside São Paulo state bounds "
            f"[{self.SP_LAT_MIN}, {self.SP_LAT_MAX}]"
        )

    def test_centroid_longitude_within_sao_paulo_state(self):
        lon = SP_MUNICIPALITY_FIXTURE["centroid_lng"]
        assert self.SP_LON_MIN <= lon <= self.SP_LON_MAX, (
            f"centroid_lng={lon} outside São Paulo state bounds "
            f"[{self.SP_LON_MIN}, {self.SP_LON_MAX}]"
        )
