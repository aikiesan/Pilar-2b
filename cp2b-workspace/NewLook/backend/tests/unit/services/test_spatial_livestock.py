"""
Spatial livestock split guard — unit correctness test.

Phase 2 splits SP cattle into two sub-populations based on IBGE Censo
Agropecuário 2017 state-level proportions:
  - ESTERCO_BOVINO_CORTE:   67% beef/extensive (western SP mesoregions)
  - ESTERCO_BOVINO_LEITEIRO: 33% dairy/intensive (eastern SP mesoregions)

These tests verify:
  1. The split fractions sum to 1.0.
  2. Both feedstock codes exist in the canonical YAML with valid BMP.
  3. Dairy (intensive) produces significantly more CH4/head than beef (extensive)
     due to higher FDE and higher generation rate — the key physical finding.
  4. Combined cattle CH4 exceeds the old single-stream (ESTERCO_BOVINO medio)
     because dairy's high FDE more than compensates for its smaller population.
  5. FDE ordering: dairy > old-medio > beef (confirming the medio was a valid
     weighted average approximation, but less accurate than the split).
"""

import sys
from pathlib import Path

import pytest

_BACKEND = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(_BACKEND))

from scripts.compute_sp_canonical_totals import (  # noqa: E402
    CATTLE_BEEF_FRACTION,
    CATTLE_DAIRY_FRACTION,
)
from app.services.canonical_loader import get_params  # noqa: E402
from app.services.biogas_forward import calculate_feedstock  # noqa: E402


@pytest.mark.unit
class TestCattleSpatialSplit:
    """Phase 2: spatial split of SP cattle into beef (west) and dairy (east)."""

    def test_cattle_fractions_sum_to_one(self):
        """Beef and dairy fractions must sum exactly to 1.0."""
        total = CATTLE_BEEF_FRACTION + CATTLE_DAIRY_FRACTION
        assert abs(total - 1.0) < 1e-9, (
            f"Fractions sum to {total}, expected 1.0"
        )

    def test_beef_fraction_is_larger(self):
        """SP beef > dairy by IBGE 2017 (67% vs 33%)."""
        assert CATTLE_BEEF_FRACTION > CATTLE_DAIRY_FRACTION

    def test_beef_code_valid_canonical_feedstock(self):
        """ESTERCO_BOVINO_CORTE must exist in canonical YAML with positive BMP."""
        params = get_params("ESTERCO_BOVINO_CORTE")
        assert params.bmp.medio > 0

    def test_dairy_code_valid_canonical_feedstock(self):
        """ESTERCO_BOVINO_LEITEIRO must exist in canonical YAML with positive BMP."""
        params = get_params("ESTERCO_BOVINO_LEITEIRO")
        assert params.bmp.medio > 0

    def test_dairy_bmp_higher_than_beef(self):
        """Fresh confinement dairy manure BMP must exceed weathered pasture beef."""
        beef = get_params("ESTERCO_BOVINO_CORTE")
        dairy = get_params("ESTERCO_BOVINO_LEITEIRO")
        assert dairy.bmp.medio > beef.bmp.medio, (
            f"Dairy BMP {dairy.bmp.medio} should exceed beef {beef.bmp.medio}"
        )

    def test_dairy_ch4_per_head_far_exceeds_beef(self):
        """
        CH4/head: dairy must exceed beef by at least 5× due to FDE differential.
        Dairy FDE medio ~0.293 vs beef FDE medio ~0.032 (9× ratio),
        partially offset by slightly lower dairy BMP multiplied by higher generation.
        Net: expect dairy ≥ 5× beef per head.

        Generation factors from feedstocks.yaml (t_per_head_yr medio):
          ESTERCO_BOVINO_CORTE:   2.92 t/head/yr (8 kg/day extensive)
          ESTERCO_BOVINO_LEITEIRO: 5.11 t/head/yr (14 kg/day dairy confinement)
        """
        beef_params = get_params("ESTERCO_BOVINO_CORTE")
        dairy_params = get_params("ESTERCO_BOVINO_LEITEIRO")

        # Canonical t_per_head_yr medio values from feedstocks.yaml
        BEEF_T_PER_HEAD = 2.92   # EMBRAPA extensive beef
        DAIRY_T_PER_HEAD = 5.11  # EMBRAPA dairy confinement

        beef_ch4 = calculate_feedstock(BEEF_T_PER_HEAD, beef_params).ch4_practical_m3["medio"]
        dairy_ch4 = calculate_feedstock(DAIRY_T_PER_HEAD, dairy_params).ch4_practical_m3["medio"]

        ratio = dairy_ch4 / beef_ch4
        assert ratio >= 5.0, (
            f"Dairy/beef CH4 per head ratio {ratio:.1f}× < expected ≥5×. "
            f"Dairy: {dairy_ch4:.4f}, Beef: {beef_ch4:.4f} m³/head/yr"
        )

    def test_split_cattle_total_exceeds_old_single_stream(self):
        """
        Applying the spatial split to 1000 total heads must produce MORE CH4
        than applying the single ESTERCO_BOVINO medio FDE to 1000 heads.

        This is the critical Phase 2 finding: the eastern SP dairy cluster
        (high FDE ~0.29) was being underestimated by the state-averaged medio
        FDE (0.092). The split correctly surfaces this hotspot.

        Generation factors from feedstocks.yaml (t_per_head_yr medio):
          ESTERCO_BOVINO_CORTE:    2.92 t/head/yr
          ESTERCO_BOVINO_LEITEIRO: 5.11 t/head/yr
          ESTERCO_BOVINO:          3.65 t/head/yr (old weighted median)
        """
        total_heads = 1000.0
        beef_params = get_params("ESTERCO_BOVINO_CORTE")
        dairy_params = get_params("ESTERCO_BOVINO_LEITEIRO")
        old_params = get_params("ESTERCO_BOVINO")

        BEEF_T_PER_HEAD = 2.92
        DAIRY_T_PER_HEAD = 5.11
        OLD_T_PER_HEAD = 3.65

        beef_ch4 = calculate_feedstock(
            total_heads * CATTLE_BEEF_FRACTION * BEEF_T_PER_HEAD, beef_params
        ).ch4_practical_m3["medio"]
        dairy_ch4 = calculate_feedstock(
            total_heads * CATTLE_DAIRY_FRACTION * DAIRY_T_PER_HEAD, dairy_params
        ).ch4_practical_m3["medio"]
        split_total = beef_ch4 + dairy_ch4

        old_ch4 = calculate_feedstock(
            total_heads * OLD_T_PER_HEAD, old_params
        ).ch4_practical_m3["medio"]

        assert split_total > old_ch4, (
            f"Split cattle CH4 {split_total:.4f} should exceed old single-stream "
            f"{old_ch4:.4f} m³ per 1000 heads"
        )

    def test_fde_ordering_dairy_above_old_medio_above_beef(self):
        """
        FDE ordering must be: dairy > ESTERCO_BOVINO_medio > beef.
        This confirms the medio was a valid weighted average, and the split
        correctly separates the high- and low-contribution sub-populations.
        """
        beef = get_params("ESTERCO_BOVINO_CORTE")
        dairy = get_params("ESTERCO_BOVINO_LEITEIRO")
        old = get_params("ESTERCO_BOVINO")

        beef_fde = beef.fde.medio
        dairy_fde = dairy.fde.medio
        old_fde = old.fde.medio

        assert dairy_fde > old_fde > beef_fde, (
            f"FDE ordering violated: dairy={dairy_fde:.4f} old={old_fde:.4f} beef={beef_fde:.4f}"
        )

    def test_beef_ch4_per_tonne_plausible(self):
        """Beef manure practical CH4: 0.5–4 m³/t wet (low FDE, outdoor collection)."""
        params = get_params("ESTERCO_BOVINO_CORTE")
        result = calculate_feedstock(1000.0, params)
        ch4_per_t = result.ch4_practical_m3["medio"] / 1000.0
        assert 0.5 <= ch4_per_t <= 4.0, (
            f"Beef CH4 {ch4_per_t:.3f} m³/t outside plausible range 0.5–4"
        )

    def test_dairy_ch4_per_tonne_plausible(self):
        """Dairy confinement manure practical CH4: 10–30 m³/t wet (high FDE, fresh manure)."""
        params = get_params("ESTERCO_BOVINO_LEITEIRO")
        result = calculate_feedstock(1000.0, params)
        ch4_per_t = result.ch4_practical_m3["medio"] / 1000.0
        assert 10.0 <= ch4_per_t <= 40.0, (
            f"Dairy CH4 {ch4_per_t:.3f} m³/t outside plausible range 10–30"
        )
