"""
Spatial livestock split — correctness and anti-double-count guard.

The SP cattle head count is one CSV column standing for two different production
systems (IBGE Censo Agropecuário 2017):
  - ESTERCO_BOVINO_CORTE     67%, beef/extensive, western SP mesoregions
  - ESTERCO_BOVINO_LEITEIRO  33%, dairy/intensive, eastern SP mesoregions

Ported from `b279978` (Fase 2, 2026-06-07) by Lote 2 on 2026-07-26. Two groups:

TestCattleSpatialSplit — the physics the split exists to surface: dairy manure is
fresher, more abundant per head and near-completely collectible, so the eastern
cluster contributes far more than a state-averaged ESTERCO_BOVINO suggests.

TestSubpopulationMappingGuard — the failure mode this split introduces. There are
now TWO representations of 'cattle': the aggregate code in STREAM_TO_CANONICAL,
which the map and the availability service read, and the sub-populations in
STREAM_SUBPOPULATIONS, which the state pipeline reads. If a consumer ever sums
both, or if the aggregate is itself listed as a sub-population, the herd is
counted twice. `canonical_loader:165` records that this same class of mistake —
two places disagreeing about what a stream means — produced the bug that rendered
205M chicken head as 205M tonnes of litter.
"""

import sys
from pathlib import Path

import pytest

_BACKEND = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(_BACKEND))

from app.services.biogas_forward import calculate_feedstock  # noqa: E402
from app.services.canonical_loader import (  # noqa: E402
    STREAM_SUBPOPULATIONS,
    STREAM_TO_CANONICAL,
    get_generation,
    get_params,
    load_raw,
)

CATTLE = STREAM_SUBPOPULATIONS["cattle"]
BEEF_CODE, DAIRY_CODE = CATTLE[0][1], CATTLE[1][1]
BEEF_FRACTION, DAIRY_FRACTION = CATTLE[0][2], CATTLE[1][2]


def _t_per_head(code: str) -> float:
    gen = get_generation(code)
    assert gen is not None, f"{code} has no canonical generation block"
    return gen.per_unit_yr.medio


@pytest.mark.unit
class TestCattleSpatialSplit:
    """Fase 2: spatial split of SP cattle into beef (west) and dairy (east)."""

    def test_fractions_sum_to_one(self):
        total = sum(frac for _, _, frac in CATTLE)
        assert abs(total - 1.0) < 1e-9, f"fractions sum to {total}, expected 1.0"

    def test_beef_fraction_is_larger(self):
        """SP beef exceeds dairy, 67% vs 33% (ibge2017_censo)."""
        assert BEEF_FRACTION > DAIRY_FRACTION

    @pytest.mark.parametrize("code", [BEEF_CODE, DAIRY_CODE])
    def test_code_is_a_valid_canonical_feedstock(self, code):
        assert get_params(code).bmp.medio > 0

    def test_dairy_bmp_higher_than_beef(self):
        """Fresh confinement manure must out-yield weathered pasture manure."""
        beef, dairy = get_params(BEEF_CODE), get_params(DAIRY_CODE)
        assert dairy.bmp.medio > beef.bmp.medio

    def test_dairy_ch4_per_head_far_exceeds_beef(self):
        """Dairy ≥ 5× beef per head: FDE differential ~9×, generation ~1.75×."""
        beef_ch4 = calculate_feedstock(
            _t_per_head(BEEF_CODE), get_params(BEEF_CODE)
        ).ch4_practical_m3["medio"]
        dairy_ch4 = calculate_feedstock(
            _t_per_head(DAIRY_CODE), get_params(DAIRY_CODE)
        ).ch4_practical_m3["medio"]
        ratio = dairy_ch4 / beef_ch4
        assert ratio >= 5.0, (
            f"dairy/beef CH₄ per head {ratio:.1f}× < 5×; "
            f"dairy {dairy_ch4:.4f}, beef {beef_ch4:.4f} m³/head/yr"
        )

    def test_split_total_exceeds_old_single_stream(self):
        """The reason the split is worth doing.

        Per 1000 head, the split must yield more CH₄ than the state-averaged
        ESTERCO_BOVINO. The eastern dairy cluster's high FDE more than offsets its
        smaller share of the herd — averaging it away understated the hotspot.
        """
        heads = 1000.0
        split = sum(
            calculate_feedstock(
                heads * frac * _t_per_head(code), get_params(code)
            ).ch4_practical_m3["medio"]
            for _, code, frac in CATTLE
        )
        old = calculate_feedstock(
            heads * _t_per_head("ESTERCO_BOVINO"), get_params("ESTERCO_BOVINO")
        ).ch4_practical_m3["medio"]
        assert split > old, f"split {split:.4f} should exceed aggregate {old:.4f} m³/1000 head"

    def test_fde_ordering_dairy_above_aggregate_above_beef(self):
        """dairy > ESTERCO_BOVINO > beef confirms the aggregate was a real average."""
        beef = get_params(BEEF_CODE).fde.medio
        dairy = get_params(DAIRY_CODE).fde.medio
        old = get_params("ESTERCO_BOVINO").fde.medio
        assert dairy > old > beef, f"dairy={dairy:.4f} old={old:.4f} beef={beef:.4f}"

    def test_beef_ch4_per_tonne_plausible(self):
        """Beef manure: 0.5–4 m³ CH₄/t wet (low FDE, outdoor collection)."""
        ch4_per_t = (
            calculate_feedstock(1000.0, get_params(BEEF_CODE)).ch4_practical_m3["medio"] / 1000.0
        )
        assert 0.5 <= ch4_per_t <= 4.0, f"beef {ch4_per_t:.3f} m³/t outside 0.5–4"

    def test_dairy_ch4_per_tonne_plausible(self):
        """Dairy confinement manure: 10–40 m³ CH₄/t wet (high FDE, fresh manure)."""
        ch4_per_t = (
            calculate_feedstock(1000.0, get_params(DAIRY_CODE)).ch4_practical_m3["medio"] / 1000.0
        )
        assert 10.0 <= ch4_per_t <= 40.0, f"dairy {ch4_per_t:.3f} m³/t outside 10–40"


@pytest.mark.unit
class TestSubpopulationMappingGuard:
    """Guard against the two representations of a split stream drifting apart."""

    def test_split_stream_still_has_an_aggregate_mapping(self):
        """Consumers that read one code per stream must keep getting one."""
        for stream in STREAM_SUBPOPULATIONS:
            assert stream in STREAM_TO_CANONICAL, (
                f"{stream!r} is split into sub-populations but has no aggregate code; "
                "the map and biomass_availability resolve streams through "
                "STREAM_TO_CANONICAL and would resolve nothing"
            )

    def test_aggregate_is_never_also_a_subpopulation(self):
        """The double-count trap: summing aggregate + parts counts the herd twice."""
        for stream, subpops in STREAM_SUBPOPULATIONS.items():
            aggregate = STREAM_TO_CANONICAL[stream]
            codes = [code for _, code, _ in subpops]
            assert aggregate not in codes, (
                f"{stream!r} maps to {aggregate!r}, which is ALSO one of its "
                f"sub-populations {codes}. Any consumer summing both double-counts."
            )

    def test_subpopulation_codes_are_not_reachable_through_the_stream_map(self):
        """No sub-population may acquire a stream key of its own.

        If one did, a stream-driven consumer would pick it up independently and add
        it to the aggregate that already contains it.
        """
        mapped = set(STREAM_TO_CANONICAL.values())
        for stream, subpops in STREAM_SUBPOPULATIONS.items():
            for _, code, _ in subpops:
                assert code not in mapped, (
                    f"{code!r} is a sub-population of {stream!r} but is also a target "
                    "of STREAM_TO_CANONICAL — it would be counted twice"
                )

    def test_fractions_sum_to_one_for_every_split_stream(self):
        for stream, subpops in STREAM_SUBPOPULATIONS.items():
            total = sum(frac for _, _, frac in subpops)
            assert abs(total - 1.0) < 1e-9, f"{stream!r} fractions sum to {total}"

    def test_every_subpopulation_code_exists_and_converts_head_to_tonnes(self):
        fs = load_raw()
        for stream, subpops in STREAM_SUBPOPULATIONS.items():
            for label, code, _ in subpops:
                assert code in fs, f"{stream!r}/{label}: {code!r} not in feedstocks.yaml"
                assert get_generation(code) is not None, (
                    f"{code!r} has no `generation` block, so head counts would pass "
                    "through as though they were tonnes"
                )

    def test_sub_stream_labels_are_distinct_from_the_stream_key(self):
        """Output rows must not collide with the aggregate stream's own label."""
        for stream, subpops in STREAM_SUBPOPULATIONS.items():
            labels = [label for label, _, _ in subpops]
            assert stream not in labels, (
                f"sub-stream label collides with the stream key {stream!r}; "
                "per-stream output rows would overwrite each other"
            )
            assert len(set(labels)) == len(labels), f"duplicate sub-stream labels in {stream!r}"


@pytest.mark.unit
class TestComputeScriptUsesTheDeclaredSplit:
    """The compute script must not re-declare the split it is given."""

    def test_script_reads_the_loader_table(self):
        from scripts.compute_sp_canonical_totals import LIVESTOCK_SIMPLE, SPLIT_LIVESTOCK

        assert set(SPLIT_LIVESTOCK) == set(STREAM_SUBPOPULATIONS), (
            "SPLIT_LIVESTOCK and STREAM_SUBPOPULATIONS disagree about which streams "
            "are split; the state total would silently use one and the map the other"
        )
        overlap = set(LIVESTOCK_SIMPLE) & set(SPLIT_LIVESTOCK)
        assert not overlap, f"{overlap} would be accumulated twice, split and aggregate"
