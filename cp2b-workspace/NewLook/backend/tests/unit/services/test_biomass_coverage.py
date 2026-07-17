"""
Coverage semantics guard — "no data" must never masquerade as zero.

The failure this pins down is not hypothetical. In the live DB (2026-07-17) the
`municipalities` biomass columns hold ZERO NULLs: 5,059 municipalities carry a
seeded `sugarcane_biomass_tons_year = 0`, of which only 133 (all in São Paulo)
are genuine "no sugarcane grown here". The other 4,926 mean "never loaded". Read
through number_value() both become 0.0, the map paints both at the bottom of the
ramp, and a data gap covering ~77% of the modelled potential renders as a
finding about Brazilian agriculture.

So coverage is decided by provenance (migration 025), never by the value.
"""

import pytest

from app.services.biomass_availability import (  # noqa: E402
    COVERAGE_NO_DATA,
    COVERAGE_PARTIAL,
    derive_biomass_with_coverage,
    raw_value,
)

ALL_STREAMS = (
    "sugarcane",
    "soybean",
    "corn",
    "coffee",
    "citrus",
    "cattle",
    "swine",
    "poultry",
    "aquaculture",
    "rsu",
    "rpo",
)


def _measured(*streams: str) -> dict[str, str]:
    return {s: "measured" for s in streams}


@pytest.mark.unit
class TestRawValue:
    """raw_value is the only reason absent and zero stay distinguishable."""

    def test_preserves_zero(self):
        assert raw_value(0) == 0.0
        assert raw_value("0") == 0.0

    def test_none_stays_none(self):
        assert raw_value(None) is None

    def test_unparseable_is_none_not_zero(self):
        assert raw_value("abacaxi") is None

    def test_nan_is_not_a_measurement(self):
        assert raw_value(float("nan")) is None


@pytest.mark.unit
class TestNoDataIsNotZero:
    """The central invariant of the national map."""

    def test_unloaded_municipality_emits_none_not_zero(self):
        # Mato Grosso: seeded 0 in every biomass column, no provenance row.
        row = {f"{s}_biomass_tons_year": 0 for s in ALL_STREAMS}
        out = derive_biomass_with_coverage(row, provenance={})

        assert out["sugarcane_biomass_tons_year"] is None, "a seeded 0 must not read as 0.0"
        assert out["sugarcane_biomass_coverage"] == COVERAGE_NO_DATA
        assert out["total_biomass_tons_year"] is None
        assert out["total_biomass_coverage"] == COVERAGE_NO_DATA

    def test_genuine_zero_is_measured_zero(self):
        # An SP municipality that really grows no cane: same stored 0, but we
        # loaded it, so provenance exists and 0.0 is the honest answer.
        row = {f"{s}_biomass_tons_year": 0 for s in ALL_STREAMS}
        out = derive_biomass_with_coverage(row, provenance=_measured(*ALL_STREAMS))

        assert out["sugarcane_biomass_tons_year"] == 0.0
        assert out["sugarcane_biomass_coverage"] == "measured"
        assert out["total_biomass_tons_year"] == 0.0
        assert out["total_biomass_coverage"] == "measured"

    def test_identical_rows_differ_only_by_provenance(self):
        """The two cases above are byte-identical in the database."""
        row = {f"{s}_biomass_tons_year": 0 for s in ALL_STREAMS}
        unloaded = derive_biomass_with_coverage(row, provenance={})
        loaded = derive_biomass_with_coverage(row, provenance=_measured(*ALL_STREAMS))

        assert unloaded["sugarcane_biomass_tons_year"] is None
        assert loaded["sugarcane_biomass_tons_year"] == 0.0

    def test_measured_value_passes_through(self):
        row = {f"{s}_biomass_tons_year": 0 for s in ALL_STREAMS}
        row["sugarcane_biomass_tons_year"] = 4_027_884.0
        out = derive_biomass_with_coverage(row, provenance=_measured(*ALL_STREAMS))

        assert out["sugarcane_biomass_tons_year"] == 4_027_884.0
        assert out["agricultural_biomass_coverage"] == "measured"


@pytest.mark.unit
class TestAggregateCoverage:
    """A total built from partial knowledge is a floor, not a total."""

    def test_livestock_known_agricultural_unknown_is_partial(self):
        # Exactly the national situation once PPM lands and PAM has not:
        # livestock measured everywhere, crops nowhere outside SP.
        row = {f"{s}_biomass_tons_year": 0 for s in ALL_STREAMS}
        row["cattle_biomass_tons_year"] = 500_000.0
        out = derive_biomass_with_coverage(
            row, provenance=_measured("cattle", "swine", "poultry", "aquaculture")
        )

        assert out["livestock_biomass_coverage"] == "measured"
        assert out["livestock_biomass_tons_year"] == 500_000.0
        assert out["agricultural_biomass_coverage"] == COVERAGE_NO_DATA
        assert out["agricultural_biomass_tons_year"] is None
        # The headline number must announce that ~77% of it is missing.
        assert out["total_biomass_coverage"] == COVERAGE_PARTIAL
        assert out["total_biomass_tons_year"] == 500_000.0

    def test_estimated_propagates_to_aggregate(self):
        row = {f"{s}_biomass_tons_year": 10.0 for s in ALL_STREAMS}
        prov = _measured(*ALL_STREAMS)
        prov["rsu"] = "estimated"  # urban waste modelled from population
        out = derive_biomass_with_coverage(row, provenance=prov)

        assert out["rsu_biomass_coverage"] == "estimated"
        assert out["urban_biomass_coverage"] == "estimated"
        assert out["total_biomass_coverage"] == "estimated"

    def test_sector_total_sums_only_known_streams(self):
        row = {f"{s}_biomass_tons_year": 0 for s in ALL_STREAMS}
        row["cattle_biomass_tons_year"] = 100.0
        row["swine_biomass_tons_year"] = 25.0  # stored, but never loaded
        out = derive_biomass_with_coverage(row, provenance=_measured("cattle"))

        assert out["livestock_biomass_tons_year"] == 100.0, "unloaded swine must not be summed"
        assert out["livestock_biomass_coverage"] == COVERAGE_PARTIAL


@pytest.mark.unit
class TestDerivedTons:
    """Livestock/urban tonnage does not live in a column — it is supplied by the
    caller, computed from head counts/population. The stored column (a head count
    mislabelled as tonnes) must be ignored when a derived value is present."""

    def test_derived_overrides_the_stored_column(self):
        # Stored cattle column holds a head count (117402); derived tonnage is the
        # truth. The derived value must win, and the head count must never surface.
        row = {f"{s}_biomass_tons_year": 0 for s in ALL_STREAMS}
        row["cattle_biomass_tons_year"] = 117402  # head count masquerading as tonnes
        out = derive_biomass_with_coverage(
            row,
            provenance={"cattle": "estimated"},
            derived_tons={"cattle": 428_517.3},
        )
        assert out["cattle_biomass_tons_year"] == 428_517.3
        assert out["cattle_biomass_coverage"] == "estimated"

    def test_derived_without_provenance_is_no_data(self):
        # A derived value still needs provenance; coverage never comes from the value.
        row = {f"{s}_biomass_tons_year": 0 for s in ALL_STREAMS}
        out = derive_biomass_with_coverage(
            row, provenance={}, derived_tons={"cattle": 428_517.3}
        )
        assert out["cattle_biomass_tons_year"] is None
        assert out["cattle_biomass_coverage"] == COVERAGE_NO_DATA


@pytest.mark.unit
class TestReverseFallback:
    """Reverse-BMP invents tonnage from legacy biogas. For an availability map an
    invented number is worse than an honest gap, so it is off by default."""

    def test_disabled_by_default(self):
        row = {f"{s}_biomass_tons_year": 0 for s in ALL_STREAMS}
        row["sugarcane_biogas_m3_year"] = 41_429_334.0
        out = derive_biomass_with_coverage(row, provenance={})

        assert out["sugarcane_biomass_tons_year"] is None
        assert out["sugarcane_biomass_coverage"] == COVERAGE_NO_DATA

    def test_when_enabled_it_is_tagged_estimated_never_measured(self):
        row = {f"{s}_biomass_tons_year": 0 for s in ALL_STREAMS}
        row["sugarcane_biogas_m3_year"] = 41_429_334.0
        out = derive_biomass_with_coverage(row, provenance={}, allow_reverse_fallback=True)

        assert out["sugarcane_biomass_tons_year"] > 0
        assert out["sugarcane_biomass_coverage"] == "estimated"

    def test_no_biogas_means_no_data_even_when_enabled(self):
        row = {f"{s}_biomass_tons_year": 0 for s in ALL_STREAMS}
        out = derive_biomass_with_coverage(row, provenance={}, allow_reverse_fallback=True)

        assert out["sugarcane_biomass_tons_year"] is None
        assert out["sugarcane_biomass_coverage"] == COVERAGE_NO_DATA
