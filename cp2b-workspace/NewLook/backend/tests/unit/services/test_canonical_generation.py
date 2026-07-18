"""
Generation factors — head count / population → wet tonnes of residue.

WHY THIS FILE EXISTS
    IBGE PPM counts animals; SNIS counts people. Neither reports tonnes. The
    conversion is canonical (feedstocks.yaml `generation`) and used to live only
    inside scripts/compute_sp_canonical_totals.py, which read raw YAML past the
    loader. The map never got it: it read the head counts out of the
    `{stream}_biomass_tons_year` columns and rendered them as tonnes, so São
    Paulo's 205,686,533 chickens became 205M tonnes of litter (real: 9.3M) and
    the state's headline biomass ran ~51% high.

    The columns' own numbers prove the units: they track PPM head counts at
    ratios 1.040 / 1.003 / 1.072, and read as tonnes they imply every species —
    hen, pig and cow alike — excreting an identical 2.74 kg/day, which is more
    than a laying hen's body weight.

    These tests pin the conversion and, more importantly, pin the physical
    bounds that make "animals counted as tonnes" impossible to reintroduce
    quietly.
"""

import pytest

yaml = pytest.importorskip("yaml", reason="PyYAML required for canonical parameter tests")

from app.services.biogas_forward import Range  # noqa: E402
from app.services.canonical_loader import (  # noqa: E402
    biomass_tons_from_units,
    get_generation,
    get_generation_for_stream,
)

# EMBRAPA envelopes (feedstocks.yaml notes): beef cattle 8–12 kg/head/day fresh
# excretion, dairy 10–18. A factor outside this band is not a calibration choice,
# it is a unit error.
CATTLE_KG_DAY_MIN, CATTLE_KG_DAY_MAX = 6.0, 20.0
# A laying hen weighs ~2 kg. Litter above a few hundred g/day is not biology.
POULTRY_KG_DAY_MIN, POULTRY_KG_DAY_MAX = 0.05, 0.5


def _kg_per_day(t_per_yr: float) -> float:
    return t_per_yr * 1000.0 / 365.0


@pytest.mark.unit
class TestGenerationBlocks:
    def test_livestock_streams_are_per_head(self):
        for stream in ("cattle", "swine", "poultry"):
            gen = get_generation_for_stream(stream)
            assert gen is not None, f"{stream} must have a canonical generation block"
            assert gen.type == "per_head"

    def test_urban_streams_are_per_capita(self):
        for stream in ("rsu", "rpo"):
            gen = get_generation_for_stream(stream)
            assert gen is not None, f"{stream} must have a canonical generation block"
            assert gen.type == "per_capita"

    def test_agricultural_streams_have_no_generation(self):
        """Crops are reported in tonnes already — a generation factor would mean
        someone had confused a residue fraction for an excretion rate."""
        assert get_generation_for_stream("sugarcane") is None

    def test_scenarios_are_ordered(self):
        for stream in ("cattle", "swine", "poultry", "rsu", "rpo"):
            f = get_generation_for_stream(stream).per_unit_yr
            assert f.min <= f.medio <= f.max, f"{stream} generation band is out of order"
            assert f.min > 0, f"{stream} generation must be positive"

    def test_unknown_code_raises(self):
        with pytest.raises(KeyError):
            get_generation("NAO_EXISTE")


@pytest.mark.unit
class TestPhysicalPlausibility:
    """The guard that would have caught the head-as-tonnes bug on day one."""

    def test_cattle_within_embrapa_envelope(self):
        f = get_generation_for_stream("cattle").per_unit_yr
        for scenario, value in (("min", f.min), ("medio", f.medio), ("max", f.max)):
            kg_day = _kg_per_day(value)
            assert CATTLE_KG_DAY_MIN <= kg_day <= CATTLE_KG_DAY_MAX, (
                f"cattle {scenario} = {kg_day:.2f} kg/head/day is outside EMBRAPA's "
                f"{CATTLE_KG_DAY_MIN}–{CATTLE_KG_DAY_MAX} band"
            )

    def test_poultry_is_a_bird_not_a_cow(self):
        f = get_generation_for_stream("poultry").per_unit_yr
        for scenario, value in (("min", f.min), ("medio", f.medio), ("max", f.max)):
            kg_day = _kg_per_day(value)
            assert (
                POULTRY_KG_DAY_MIN <= kg_day <= POULTRY_KG_DAY_MAX
            ), f"poultry {scenario} = {kg_day:.2f} kg/bird/day; a hen weighs ~2 kg"

    def test_a_head_count_is_not_a_tonnage(self):
        """If any factor ever drifts to ~1.0 t/head/yr, head counts and tonnes
        become numerically interchangeable and the bug returns invisibly."""
        for stream in ("cattle", "poultry"):
            f = get_generation_for_stream(stream).per_unit_yr
            assert abs(f.medio - 1.0) > 0.1, (
                f"{stream} generation ~= 1.0 t/head/yr would make a head count and a "
                "tonnage indistinguishable — exactly how 205M chickens became 205M tonnes"
            )


@pytest.mark.unit
class TestBiomassFromUnits:
    def test_cattle_head_to_tonnes(self):
        # São Paulo, PPM 2024: 10,756,815 head.
        out = biomass_tons_from_units("cattle", 10_756_815)
        f = get_generation_for_stream("cattle").per_unit_yr
        assert isinstance(out, Range)
        assert out.medio == pytest.approx(10_756_815 * f.medio)
        assert out.min < out.medio < out.max

    def test_poultry_conversion_is_not_the_identity(self):
        """205M birds must not come back as 205M tonnes."""
        birds = 205_686_533
        out = biomass_tons_from_units("poultry", birds)
        assert out.medio < birds / 10, "poultry tonnage must be far below the bird count"
        assert out.medio == pytest.approx(9_255_894, rel=0.01)

    def test_zero_units_is_zero_tonnes(self):
        out = biomass_tons_from_units("cattle", 0)
        assert (out.min, out.medio, out.max) == (0.0, 0.0, 0.0)

    def test_stream_without_generation_raises_rather_than_passing_through(self):
        """The bug in one assertion: sugarcane has no generation block, so a caller
        must not be handed the raw count back as though it were tonnes."""
        with pytest.raises(KeyError, match="generation"):
            biomass_tons_from_units("sugarcane", 1_000_000)
