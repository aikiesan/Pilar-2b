"""
Biomass residue fraction guard — unit correctness test.

The IBGE PAM municipality CSV stores raw crop production data (green cane tonnes,
whole fruit tonnes). compute_sp_canonical_totals.py applies residue fractions to
convert to actual processing substrate before the forward engine.

These tests verify:
  1. The residue fractions defined in the compute script are within documented
     literature ranges.
  2. The sugarcane complex fractions are physically consistent (partial mass balance).
  3. Citrus residue fraction is consistent with FUNDECITRUS industrial data.
  4. The forward engine produces plausible CH4 per tonne for each sub-stream.
"""

import sys
from pathlib import Path

import pytest

# Add backend to path so we can import the compute script's constants
_BACKEND = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(_BACKEND))

from app.services.biogas_forward import calculate_feedstock  # noqa: E402
from app.services.canonical_loader import get_params  # noqa: E402
from scripts.compute_sp_canonical_totals import (  # noqa: E402
    CITRUS_RESIDUE_FRACTION,
    SUGARCANE_SUBSTREAMS,
)


@pytest.mark.unit
class TestSugarcaneResidueFramework:
    """Verify sugarcane decomposition fractions and expected sub-stream yields."""

    def test_substream_codes_are_valid_canonical_feedstocks(self):
        """Every sub-stream code must exist in the canonical YAML."""
        for _, code, _, _, _ in SUGARCANE_SUBSTREAMS:
            params = get_params(code)
            assert params.bmp.medio > 0, f"{code} has zero BMP"

    def test_substream_fractions_within_literature_bounds(self):
        """Residue fractions must be within documented industry ranges."""
        fraction_bounds = {
            "BAGACO": (0.24, 0.32),  # UNICA/CONSECANA: 25–30%
            "TORTA_FILTRO": (0.020, 0.040),  # CONSECANA-SP: 2.8–3.5%
            "PALHA": (0.040, 0.075),  # 12 t/ha × [25-45]% / 80 t/ha
            "VINHACA": (0.350, 0.550),  # 12 Bn L EtOH × [10-15] L/L / 340 Mt
        }
        for _, code, frac, _, _ in SUGARCANE_SUBSTREAMS:
            lo, hi = fraction_bounds[code]
            assert (
                lo <= frac <= hi
            ), f"{code}: residue_fraction {frac} outside literature range [{lo}, {hi}]"

    def test_mill_delivery_applies_to_industrial_substreams_only(self):
        """Bagaço, torta and vinhaça are made inside the mill; palha is not.

        IBGE PAM reports cane PRODUCED. The three industrial co-products exist only
        for the cane actually crushed, so they carry mill_delivery_fraction. Straw is
        a field residue: it exists on every hectare harvested whether or not the cane
        reached a mill, and multiplying it by the delivery ratio would discard straw
        that was never in the mill to begin with.

        Pinned because the flag is one boolean per row and flipping it silently moves
        the state total by ~9% (Lote 2, 2026-07-26 — divergência D6 da auditoria).
        """
        delivered = {code: flag for _, code, _, flag, _ in SUGARCANE_SUBSTREAMS}
        assert delivered == {
            "BAGACO": True,
            "TORTA_FILTRO": True,
            "VINHACA": True,
            "PALHA": False,
        }

    def test_sugarcane_has_a_mill_delivery_fraction_to_apply(self):
        """The pipeline raises rather than skipping it, so it must resolve."""
        from app.services.canonical_loader import mill_delivery_fraction

        mdf = mill_delivery_fraction("sugarcane")
        assert mdf is not None, "sugarcane lost its mill_delivery_fraction"
        assert 0.0 < mdf.min <= mdf.medio <= mdf.max <= 1.0

    def test_sugarcane_substream_fractions_are_partial_mass_balance(self):
        """Substream fractions should sum < 1.0 (remaining mass = juice + water losses)."""
        total_frac = sum(frac for _, _, frac, _, _ in SUGARCANE_SUBSTREAMS)
        assert total_frac < 1.0, f"Fractions sum to {total_frac:.3f} >= 1.0 — mass balance violated"
        # Remaining fraction (~22%) = sucrose/water extracted as juice
        remaining = 1.0 - total_frac
        assert (
            0.15 <= remaining <= 0.30
        ), f"Remaining juice fraction {remaining:.3f} outside expected 15–30%"

    def test_bagaco_ch4_yield_per_tonne_plausible(self):
        """Wet bagasse CH4 practical yield: expect 8–15 m³/t (FDE included)."""
        params = get_params("BAGACO")
        result = calculate_feedstock(1000.0, params)  # 1000 t wet bagasse
        ch4_per_t = result.ch4_practical_m3["medio"] / 1000.0
        assert (
            8.0 <= ch4_per_t <= 16.0
        ), f"BAGACO CH4 yield {ch4_per_t:.2f} m³/t outside plausible range 8–15"

    def test_torta_filtro_ch4_yield_per_tonne_plausible(self):
        """Wet filter cake CH4 practical yield: expect 8–18 m³/t."""
        params = get_params("TORTA_FILTRO")
        result = calculate_feedstock(1000.0, params)
        ch4_per_t = result.ch4_practical_m3["medio"] / 1000.0
        assert (
            8.0 <= ch4_per_t <= 20.0
        ), f"TORTA_FILTRO CH4 yield {ch4_per_t:.2f} m³/t outside plausible range"

    def test_palha_ch4_yield_per_tonne_plausible(self):
        """Wet straw CH4 practical: expect 1–6 m³/t (low due to FCo=0.10 and wet TS=30%)."""
        params = get_params("PALHA")
        result = calculate_feedstock(1000.0, params)
        ch4_per_t = result.ch4_practical_m3["medio"] / 1000.0
        assert (
            1.0 <= ch4_per_t <= 8.0
        ), f"PALHA CH4 yield {ch4_per_t:.2f} m³/t outside plausible range 1–6"

    def test_vinhaca_ch4_yield_per_tonne_plausible(self):
        """Vinhaça CH4: very low due to TS~3% and FCo=0.15. Expect 0.05–0.3 m³/t wet."""
        params = get_params("VINHACA")
        result = calculate_feedstock(1000.0, params)
        ch4_per_t = result.ch4_practical_m3["medio"] / 1000.0
        assert (
            0.05 <= ch4_per_t <= 0.5
        ), f"VINHACA CH4 yield {ch4_per_t:.4f} m³/t outside plausible range 0.05–0.3"

    def test_sugarcane_complex_total_ch4_below_raw_cane_applied_directly(self):
        """
        Critical regression guard: applying 4 sub-stream fractions to 1 t green cane
        must give LESS CH4 than applying BAGACO params to 1 t directly (the previous bug).
        The old code treated all green cane as bagasse — this confirms the correction.
        """
        one_t_raw_cane = 1.0

        # Old (wrong): 1 t green cane treated as 1 t bagasse
        bagaco_params = get_params("BAGACO")
        ch4_old_wrong = calculate_feedstock(one_t_raw_cane, bagaco_params).ch4_practical_m3["medio"]

        # New (correct): sum over 4 sub-streams
        ch4_corrected = 0.0
        for _, code, frac, _, _ in SUGARCANE_SUBSTREAMS:
            params = get_params(code)
            res = calculate_feedstock(one_t_raw_cane * frac, params)
            ch4_corrected += res.ch4_practical_m3["medio"]

        assert (
            ch4_corrected < ch4_old_wrong
        ), "Corrected sugarcane complex should produce less CH4 than old buggy direct mapping"
        # The ratio should be ~3–4x lower (the critical finding)
        ratio = ch4_old_wrong / ch4_corrected
        assert 2.5 <= ratio <= 5.0, (
            f"Expected 3–4× overestimate from old approach, got {ratio:.2f}×. "
            f"Old: {ch4_old_wrong:.4f}, Corrected: {ch4_corrected:.4f} m³/t"
        )


@pytest.mark.unit
class TestCitrusResidueFramework:
    """Verify citrus peel residue fraction and yield plausibility."""

    def test_citrus_residue_fraction_within_fundecitrus_range(self):
        """Industrial citrus peel fraction: 45–55% of whole fruit (FUNDECITRUS 2022)."""
        assert (
            0.44 <= CITRUS_RESIDUE_FRACTION <= 0.56
        ), f"Citrus residue fraction {CITRUS_RESIDUE_FRACTION} outside FUNDECITRUS range"

    def test_citrus_ch4_per_tonne_peel_plausible(self):
        """Wet citrus peel CH4: expect 4–15 m³/t (limonene inhibition severely suppresses FDE ~0.13)."""
        params = get_params("BAGACO_CITROS")
        result = calculate_feedstock(1000.0, params)
        ch4_per_t = result.ch4_practical_m3["medio"] / 1000.0
        assert (
            4.0 <= ch4_per_t <= 20.0
        ), f"BAGACO_CITROS CH4 yield {ch4_per_t:.2f} m³/t peel outside plausible range"

    def test_citrus_correction_reduces_vs_raw_fruit(self):
        """
        Critical regression guard: 1 t whole fruit × 0.50 → peel, then calculate,
        must give LESS CH4 than treating 1 t as peel directly (old bug).
        """
        params = get_params("BAGACO_CITROS")
        ch4_old_wrong = calculate_feedstock(1.0, params).ch4_practical_m3["medio"]
        ch4_corrected = calculate_feedstock(1.0 * CITRUS_RESIDUE_FRACTION, params).ch4_practical_m3[
            "medio"
        ]
        assert ch4_corrected < ch4_old_wrong
        ratio = ch4_old_wrong / ch4_corrected
        assert (
            abs(ratio - (1.0 / CITRUS_RESIDUE_FRACTION)) < 0.01
        ), f"Expected ratio ~{1/CITRUS_RESIDUE_FRACTION:.2f}, got {ratio:.2f}"
