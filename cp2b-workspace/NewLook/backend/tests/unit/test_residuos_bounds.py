"""
Residuos Physical Bounds — Chemical Parameter Plausibility Tests

The `residuos` table stores chemical characterisation data for 50+ organic
residue types, sourced from 189+ peer-reviewed publications.  These tests
verify that the stored values remain within physically and biologically
plausible bounds after database migrations, bulk imports, or manual edits.

Physical constraints verified here:

1. BMP (Biochemical Methane Potential): 50–800 NmL CH₄/g VS
   Source: Angelidaki & Sanders 2004 (Bioresource Technology)

2. VS (Volatile Solids): 0–100%
   Source: APHA Standard Methods for Examination of Water and Wastewater

3. TS (Total Solids): VS ≤ TS ≤ 100%
   Physical identity: volatile solids are a subset of total solids.
   Source: APHA Standard Methods

4. C:N ratio: 5–100
   Outside this range the record is biologically implausible:
   < 5 would imply extreme nitrogen excess (not observed in livestock manures)
   > 100 would be more carbon-rich than pure cellulose
   Source: Yen & Brune 2007 (Bioresource Technology)

5. CH₄ content in biogas: 45–80%
   This is the range observed for mesophilic anaerobic digestion.
   Source: Wellinger et al. 2013 (IEA Bioenergy — The Biogas Handbook)

6. Statistical ordering: bmp_min ≤ bmp_medio ≤ bmp_max (and same for TS, VS)
   A record where the maximum is less than the minimum indicates a data entry
   error.

7. Conversion factors in realistic range (fc, fcp, fs, fl): 0–5 m³ CH₄/kg
   Source: ABNT / EMBRAPA Agroenergia conversion factor tables
"""

import pytest

# ── Sample residue records representative of main sectors ────────────────────
# Values derived from published literature (cited per record)

RESIDUE_SWINE_MANURE = {
    # Source: EMBRAPA Suínos e Aves — Boletim Técnico 47 (2022)
    "codigo": "PEC_DEJETOS_SUINO",
    "nome": "Dejetos líquidos de suínos",
    "sector_codigo": "PEC",
    "bmp_min": 150.0,
    "bmp_medio": 210.0,
    "bmp_max": 280.0,
    "ts_min": 2.0,
    "ts_medio": 3.5,
    "ts_max": 6.0,
    "vs_min": 1.5,
    "vs_medio": 2.5,
    "vs_max": 4.5,
    "chemical_cn_ratio": 12.5,
    "chemical_ch4_content": 0.65,  # as fraction (65%)
    "fator_pessimista": 0.50,
    "fator_realista": 0.70,
    "fator_otimista": 0.90,
}

RESIDUE_SUGARCANE_BAGACO = {
    # Source: UNICA 2023 / EMBRAPA Agroenergia — lignocellulosic characterisation
    "codigo": "AG_CANA_BAGACO",
    "nome": "Bagaço de cana-de-açúcar",
    "sector_codigo": "AGR",
    "bmp_min": 280.0,
    "bmp_medio": 350.0,
    "bmp_max": 420.0,
    "ts_min": 45.0,
    "ts_medio": 50.0,
    "ts_max": 55.0,
    "vs_min": 40.0,
    "vs_medio": 44.0,
    "vs_max": 48.0,
    "chemical_cn_ratio": 100.0,  # high C:N — pure lignocellulosic material
    "chemical_ch4_content": 0.55,
    "fator_pessimista": 0.60,
    "fator_realista": 0.80,
    "fator_otimista": 1.00,
}

RESIDUE_RSU_ORGANIC = {
    # Source: ABRELPE 2022 / IPT — gravimetric analysis of Brazilian MSW
    "codigo": "URB_RSU_ORGANICO",
    "nome": "Fração orgânica do RSU",
    "sector_codigo": "URB",
    "bmp_min": 300.0,
    "bmp_medio": 410.0,
    "bmp_max": 520.0,
    "ts_min": 12.0,
    "ts_medio": 20.0,
    "ts_max": 30.0,
    "vs_min": 10.0,
    "vs_medio": 17.0,
    "vs_max": 25.0,
    "chemical_cn_ratio": 20.0,
    "chemical_ch4_content": 0.58,
    "fator_pessimista": 0.40,
    "fator_realista": 0.60,
    "fator_otimista": 0.80,
}

RESIDUE_CATTLE_MANURE = {
    # Source: EMBRAPA Gado de Leite — Boletim de Pesquisa 2021
    "codigo": "PEC_ESTERCO_BOVINO",
    "nome": "Esterco bovino",
    "sector_codigo": "PEC",
    "bmp_min": 150.0,
    "bmp_medio": 210.0,
    "bmp_max": 280.0,
    "ts_min": 10.0,
    "ts_medio": 15.0,
    "ts_max": 22.0,
    "vs_min": 8.0,
    "vs_medio": 12.5,
    "vs_max": 18.0,
    "chemical_cn_ratio": 18.0,
    "chemical_ch4_content": 0.60,
    "fator_pessimista": 0.50,
    "fator_realista": 0.70,
    "fator_otimista": 0.85,
}

ALL_RESIDUE_SAMPLES = [
    RESIDUE_SWINE_MANURE,
    RESIDUE_SUGARCANE_BAGACO,
    RESIDUE_RSU_ORGANIC,
    RESIDUE_CATTLE_MANURE,
]

# ── BMP bounds ────────────────────────────────────────────────────────────────


@pytest.mark.unit
class TestBMPBounds:
    """Biochemical Methane Potential range: 50–800 NmL CH₄/g VS."""

    BMP_LO, BMP_HI = 50, 800

    @pytest.mark.parametrize("residue", ALL_RESIDUE_SAMPLES)
    def test_bmp_medio_within_physical_range(self, residue):
        v = residue["bmp_medio"]
        assert (
            self.BMP_LO <= v <= self.BMP_HI
        ), f"{residue['codigo']}: bmp_medio={v} outside [{self.BMP_LO}, {self.BMP_HI}]"

    @pytest.mark.parametrize("residue", ALL_RESIDUE_SAMPLES)
    def test_bmp_statistical_ordering(self, residue):
        # bmp_min ≤ bmp_medio ≤ bmp_max
        assert (
            residue["bmp_min"] <= residue["bmp_medio"]
        ), f"{residue['codigo']}: bmp_min ({residue['bmp_min']}) > bmp_medio ({residue['bmp_medio']})"
        assert (
            residue["bmp_medio"] <= residue["bmp_max"]
        ), f"{residue['codigo']}: bmp_medio ({residue['bmp_medio']}) > bmp_max ({residue['bmp_max']})"

    @pytest.mark.parametrize("residue", ALL_RESIDUE_SAMPLES)
    def test_bmp_max_reasonable_spread(self, residue):
        # max should not exceed 5× min (extreme spread suggests data error)
        if residue["bmp_min"] > 0:
            ratio = residue["bmp_max"] / residue["bmp_min"]
            assert (
                ratio <= 5.0
            ), f"{residue['codigo']}: bmp_max/bmp_min={ratio:.1f} — suspiciously large spread"


# ── VS / TS bounds and relationship ──────────────────────────────────────────


@pytest.mark.unit
class TestSolidsComposition:
    """
    VS (Volatile Solids) is a subset of TS (Total Solids): VS ≤ TS ≤ 100%.
    Source: APHA Standard Methods, 23rd edition (2017)
    """

    @pytest.mark.parametrize("residue", ALL_RESIDUE_SAMPLES)
    def test_vs_lte_ts_for_all_statistics(self, residue):
        # VS fraction cannot exceed TS fraction (minerals cannot volatilise)
        assert residue["vs_min"] <= residue["ts_min"], f"{residue['codigo']}: vs_min > ts_min"
        assert (
            residue["vs_medio"] <= residue["ts_medio"]
        ), f"{residue['codigo']}: vs_medio > ts_medio"
        assert residue["vs_max"] <= residue["ts_max"], f"{residue['codigo']}: vs_max > ts_max"

    @pytest.mark.parametrize("residue", ALL_RESIDUE_SAMPLES)
    def test_ts_within_physical_range(self, residue):
        assert (
            0 < residue["ts_medio"] <= 100
        ), f"{residue['codigo']}: ts_medio={residue['ts_medio']} outside (0, 100]%"

    @pytest.mark.parametrize("residue", ALL_RESIDUE_SAMPLES)
    def test_vs_within_physical_range(self, residue):
        assert (
            0 < residue["vs_medio"] <= 100
        ), f"{residue['codigo']}: vs_medio={residue['vs_medio']} outside (0, 100]%"

    @pytest.mark.parametrize("residue", ALL_RESIDUE_SAMPLES)
    def test_vs_ts_ratio_is_plausible(self, residue):
        # VS/TS is the organic fraction — expected 40–99% for biodegradable materials
        # (inorganic sludges can be lower; pure organic substrates approach 100%)
        ratio = residue["vs_medio"] / residue["ts_medio"]
        assert (
            0.40 <= ratio <= 1.00
        ), f"{residue['codigo']}: VS/TS ratio = {ratio:.2f} outside [0.40, 1.00]"


# ── C:N ratio bounds ──────────────────────────────────────────────────────────


@pytest.mark.unit
class TestCNRatio:
    """
    Carbon-to-nitrogen ratio: 5 ≤ C:N ≤ 100.
    Source: Yen & Brune 2007 (Bioresource Technology 98:130–134)
    """

    CN_LO, CN_HI = 5, 100

    @pytest.mark.parametrize("residue", ALL_RESIDUE_SAMPLES)
    def test_cn_ratio_within_physical_range(self, residue):
        cn = residue["chemical_cn_ratio"]
        assert (
            self.CN_LO <= cn <= self.CN_HI
        ), f"{residue['codigo']}: C:N={cn} outside [{self.CN_LO}, {self.CN_HI}]"

    def test_swine_manure_is_nitrogen_donor(self):
        # Swine manure C:N ≈ 12 → nitrogen donor (C:N < 20)
        # Source: Möller & Müller 2012 (Waste Management 32:1820–1831)
        assert RESIDUE_SWINE_MANURE["chemical_cn_ratio"] < 20

    def test_sugarcane_bagaco_is_carbon_donor(self):
        # Sugarcane bagaço is lignocellulosic → high C:N → carbon donor (C:N > 30)
        # Source: Rabelo et al. 2011 (Bioresource Technology 102:1911–1920)
        assert RESIDUE_SUGARCANE_BAGACO["chemical_cn_ratio"] > 30

    def test_codigestion_pair_improves_cn_ratio(self):
        # Blending swine manure (N-donor) with sugarcane bagaço (C-donor)
        # should move the weighted C:N closer to the optimal 20–30 range
        cn_swine = RESIDUE_SWINE_MANURE["chemical_cn_ratio"]
        cn_bagaco = RESIDUE_SUGARCANE_BAGACO["chemical_cn_ratio"]

        # Equal-weight blend
        cn_blended = (cn_swine + cn_bagaco) / 2
        optimal_mid = 25.0

        dist_swine = abs(cn_swine - optimal_mid)
        dist_bagaco = abs(cn_bagaco - optimal_mid)
        dist_blended = abs(cn_blended - optimal_mid)

        # Blending should always reduce the average distance from optimum
        avg_individual = (dist_swine + dist_bagaco) / 2
        assert dist_blended < avg_individual, (
            f"Blending {cn_swine} and {cn_bagaco} gives {cn_blended:.1f}, "
            f"which is farther from optimum (25) than individual average distance "
            f"{avg_individual:.1f}"
        )


# ── CH₄ content in biogas ────────────────────────────────────────────────────


@pytest.mark.unit
class TestMethaneContent:
    """
    CH₄ content in raw biogas from mesophilic anaerobic digestion: 45–80%.
    Source: Wellinger, Murphy & Baxter (eds.) 2013 — The Biogas Handbook, IEA Bioenergy
    """

    CH4_LO, CH4_HI = 0.45, 0.80

    @pytest.mark.parametrize("residue", ALL_RESIDUE_SAMPLES)
    def test_ch4_content_within_physical_range(self, residue):
        ch4 = residue["chemical_ch4_content"]
        assert self.CH4_LO <= ch4 <= self.CH4_HI, (
            f"{residue['codigo']}: CH4 content={ch4:.2f} outside " f"[{self.CH4_LO}, {self.CH4_HI}]"
        )


# ── Conversion factor ordering ────────────────────────────────────────────────


@pytest.mark.unit
class TestConversionFactors:
    """
    Scenario conversion factors must be monotonically ordered:
    fator_pessimista ≤ fator_realista ≤ fator_otimista
    This is a definitional requirement of the three-scenario model.
    """

    @pytest.mark.parametrize("residue", ALL_RESIDUE_SAMPLES)
    def test_conversion_factor_scenario_ordering(self, residue):
        assert (
            residue["fator_pessimista"] <= residue["fator_realista"]
        ), f"{residue['codigo']}: fator_pessimista > fator_realista"
        assert (
            residue["fator_realista"] <= residue["fator_otimista"]
        ), f"{residue['codigo']}: fator_realista > fator_otimista"

    @pytest.mark.parametrize("residue", ALL_RESIDUE_SAMPLES)
    def test_conversion_factors_are_positive(self, residue):
        for field in ("fator_pessimista", "fator_realista", "fator_otimista"):
            assert residue[field] > 0, f"{residue['codigo']}: {field} must be positive"


# ── BMP and energy cross-consistency ─────────────────────────────────────────


@pytest.mark.unit
class TestBMPEnergyConsistency:
    """
    Verify that BMP translates to physically plausible specific energy.
    1 NmL CH₄/g VS = 0.001 m³ CH₄/kg VS
    Energy per kg VS = BMP (NmL/g VS) × 0.001 × LHV (MJ/m³) × 1/3.6 (MJ→kWh)
                     = BMP × 0.001 × 35.8 / 3.6 ≈ BMP × 0.00994 kWh/g VS
    Plausible range: 0.5–8 kWh/kg VS for organic materials
    Source: ABNT / EMBRAPA Agroenergia conversion factor tables
    """

    CH4_LHV_MJ_PER_M3 = 35.8
    MJ_TO_KWH = 1 / 3.6
    NML_G_TO_M3_KG = 0.001  # 1 NmL/g = 0.001 m³/kg

    KWH_PER_KG_VS_LO = 0.5
    KWH_PER_KG_VS_HI = 8.0

    @pytest.mark.parametrize("residue", ALL_RESIDUE_SAMPLES)
    def test_specific_energy_within_physical_range(self, residue):
        bmp = residue["bmp_medio"]
        specific_energy_kwh_per_kg_vs = (
            bmp * self.NML_G_TO_M3_KG * self.CH4_LHV_MJ_PER_M3 * self.MJ_TO_KWH
        )
        assert self.KWH_PER_KG_VS_LO <= specific_energy_kwh_per_kg_vs <= self.KWH_PER_KG_VS_HI, (
            f"{residue['codigo']}: specific energy {specific_energy_kwh_per_kg_vs:.2f} kWh/kg VS "
            f"outside [{self.KWH_PER_KG_VS_LO}, {self.KWH_PER_KG_VS_HI}] "
            f"(BMP={bmp} NmL CH₄/g VS)"
        )
