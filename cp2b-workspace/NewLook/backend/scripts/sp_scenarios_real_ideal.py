#!/usr/bin/env python3
"""São Paulo potential under two published tiers: Cenário Real and Cenário Ideal.

Adopts the Atlas de Bioenergia do Estado de São Paulo (2020) two-scenario
framing, and its vocabulary, so PILAR-2b is read against the state's reference
study on the reference study's own terms:

* **Cenário Real (curto prazo)** — the residue that actually reaches a digester
  today: real collection rates, real competing uses.
* **Cenário Ideal (fronteira)** — Atlas p.92 and pp.115-116 define this as 100%
  of what is GENERATED being collected and treated. It is an INFRASTRUCTURE
  assumption, not relaxed chemistry: every BMP, TS, VS and CH4 fraction is
  identical in both tiers. Only collection and mobilisation change.

Four corrections against what the pipeline currently serves, each traceable:

1. **Bagaço excluded.** Atlas p.65: residues "já aproveitados para geração de
   energia (como o bagaço de cana)" versus those "ainda não (torta de filtro,
   vinhaça e palha de cana)". Bagasse is burned in mill boilers for
   cogeneration; counting it as available double-counts energy the sector
   already recovers. This is why using BAGACO as the sugarcane representative —
   with its FCo of 0.18 — put a burn-discount on the whole cane stream.

2. **Vinhaça added.** Absent from the pipeline entirely: the served cane mass is
   56.3% of cane production, consistent with bagaço+palha+torta+pontas and far
   too small to contain vinasse. Atlas p.67 gives a direct route needing no
   BMP/VS — 114 m3 biogas per m3 of ethanol at 50-65% CH4. Crucially,
   fertirrigation is NOT a competing use: digestion is sequential, the digestate
   keeps its K/N/P and still goes to the field with lower BOD and odour. So the
   competing-use discount that suppressed vinasse does not belong there.

3. **Palha at the Atlas fraction.** p.65: "foi adotado o emprego de apenas 40% da
   palha disponível (em termos conservadores)", because 50-60% must stay for
   soil protection and recovery costs R$65/t. Real tier uses that 40%; Ideal
   uses 50%, the upper bound of what may be removed while leaving the mandated
   soil cover.

4. **Swine fixed.** The 380 m3 CH4/head/year factor is applied to the TOTAL herd
   (1,591,238 head) but is only physically meaningful per MATRIZ — SP has
   163,706 sows, a 9.7x multiplier. Rebuilt here from mass instead: herd x
   collectable manure x BMP x VS, which is checkable against husbandry reality.

Reports only. Writes nothing.
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path

DAYS = 365
CH4_FRACTION_OF_BIOGAS = 0.625  # FIESP 2025
CH4_LHV_KWH_M3 = 9.94
ETA_ELETRICA = 0.38

# --- Atlas de Bioenergia SP 2020 ---------------------------------------------
BIOGAS_M3_POR_M3_ETANOL = 114.0  # p.67
CH4_VINHACA = (0.50, 0.65)  # p.67
ETANOL_M3_POR_T_CANA = 15_944_231 / 333_294_057  # Tabela IV.2
TORTA_KG_POR_T_CANA = 35.0  # p.66 (30-40)
PALHA_KG_POR_T_CANA = 140.0
PALHA_FRACAO = {"real": 0.40, "ideal": 0.50}  # p.65
RSU_PER_CAPITA_KG_DIA = {  # Tabela V.2 (SMA 2017), por faixa populacional
    25_000: 0.7,
    100_000: 0.8,
    500_000: 0.9,
    float("inf"): 1.1,
}
RSU_MO_FRACAO = 0.4646  # Eq. V.5
RSU_FMO_NM3_T = 101.5  # Eq. V.6 (Achinas 2017)
RSU_CH4 = 0.55
RSU_COLETA_REAL = 0.9962  # Atlas p.90
ESGOTO_M3_HAB_DIA = 0.120
ESGOTO_DQO_G_M3 = 449.7  # Eq. VI.1 (SILVA 2015)
ESGOTO_PCH4 = 0.1115  # Nm3 CH4 / kg DQO removida
ESGOTO_EF_REM = 0.755  # SABESP 2018
ESGOTO_COLETA_REAL = 0.905  # SP, esgoto coletado / gerado

# --- substrate parameters (BMP NmL CH4/gVS, VS % wet) ------------------------
TORTA_BMP, TORTA_VS = 280.0, 20.0
PALHA_BMP, PALHA_VS = 175.0, 56.0
BOV_BMP, BOV_VS = 200.0, 19.5
SUI_BMP, SUI_VS = 245.0, 2.4
AVE_BMP, AVE_VS = 280.0, 17.5
KG_ESTERCO_DIA = {  # coletável, base úmida
    "bovino": {"real": 8.0, "ideal": 12.0},
    "suino": {"real": 6.0, "ideal": 9.0},
    "ave": {"real": 0.025, "ideal": 0.035},
}
# Non-cane crop streams kept at what the pipeline already serves (CH4 m3/ano),
# with the Ideal tier lifting them by the collection headroom only.
OUTROS_FLUXOS = {
    "milho": 1_361_216_163,
    "soja": 1_223_083_878,
    "citros": 285_156_605,
    "cafe": 95_279_430,
    "silvicultura": 599_802_082,
    "poda_urbana": 31_204_438,
    "aquicultura": 130_281,
}
OUTROS_FATOR = {"real": 1.00, "ideal": 1.25}


def somar(rows, col):
    t = 0.0
    for r in rows:
        v = (r.get(col) or "").strip().replace(",", ".")
        try:
            t += float(v)
        except ValueError:
            pass
    return t


def rsu_per_capita(pop: float) -> float:
    for limite in sorted(RSU_PER_CAPITA_KG_DIA):
        if pop <= limite:
            return RSU_PER_CAPITA_KG_DIA[limite]
    return 1.1


def calcular(rows, tier: str) -> dict[str, float]:
    cana = somar(rows, "prod_t_Cana_de_açúcar")
    bov = somar(rows, "cabecas_Bovino")
    sui = somar(rows, "cabecas_Suíno___total")
    ave = somar(rows, "cabecas_Galináceos___total")

    etanol = cana * ETANOL_M3_POR_T_CANA
    ch4_frac = CH4_VINHACA[0] if tier == "real" else CH4_VINHACA[1]
    vinhaca = etanol * BIOGAS_M3_POR_M3_ETANOL * ch4_frac

    torta = cana * TORTA_KG_POR_T_CANA / 1000.0 * 1000.0 * (TORTA_VS / 100) * (TORTA_BMP / 1000)
    palha_ger = cana * PALHA_KG_POR_T_CANA / 1000.0
    palha = palha_ger * PALHA_FRACAO[tier] * 1000.0 * (PALHA_VS / 100) * (PALHA_BMP / 1000)

    def estrume(cab, kg, bmp, vs):
        massa = cab * kg * DAYS / 1000.0
        return massa * 1000.0 * (vs / 100) * (bmp / 1000)

    bovino = estrume(bov, KG_ESTERCO_DIA["bovino"][tier], BOV_BMP, BOV_VS)
    suino = estrume(sui, KG_ESTERCO_DIA["suino"][tier], SUI_BMP, SUI_VS)
    aves = estrume(ave, KG_ESTERCO_DIA["ave"][tier], AVE_BMP, AVE_VS)

    rsu_t = sum(
        (
            float(r.get("populacao_total_hab") or 0)
            * rsu_per_capita(float(r.get("populacao_total_hab") or 0))
            * DAYS
            / 1000.0
        )
        for r in rows
    )
    if tier == "real":
        rsu_t *= RSU_COLETA_REAL
    rsu = rsu_t * RSU_MO_FRACAO * RSU_FMO_NM3_T * RSU_CH4

    pop = somar(rows, "populacao_total_hab")
    ec = pop * ESGOTO_M3_HAB_DIA * DAYS * (ESGOTO_COLETA_REAL if tier == "real" else 1.0)
    esgoto = ec * (ESGOTO_DQO_G_M3 / 1000.0) * ESGOTO_EF_REM * ESGOTO_PCH4

    out = {
        "vinhaça": vinhaca,
        "torta de filtro": torta,
        "palha de cana": palha,
        "bovinos": bovino,
        "suínos": suino,
        "aves": aves,
        "RSU (FORSU)": rsu,
        "esgoto (ETE)": esgoto,
    }
    for k, v in OUTROS_FLUXOS.items():
        out[k] = v * OUTROS_FATOR[tier]
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--master", type=Path, required=True)
    args = ap.parse_args()
    rows = list(csv.DictReader(args.master.open(encoding="utf-8-sig")))

    res = {t: calcular(rows, t) for t in ("real", "ideal")}
    fluxos = list(res["real"])

    print("=" * 92)
    print("  SAO PAULO — CENARIO REAL (curto prazo) vs CENARIO IDEAL (fronteira)")
    print("  volumes em CH4 Nm3/ano; enquadramento e vocabulario do Atlas SP 2020")
    print("=" * 92)
    print(f"{'fluxo':<20}{'REAL':>20}{'IDEAL':>20}{'ideal/real':>13}")
    print("-" * 92)
    for f in sorted(fluxos, key=lambda x: -res["real"][x]):
        r, i = res["real"][f], res["ideal"][f]
        print(f"{f:<20}{r:>20,.0f}{i:>20,.0f}{i / r if r else 0:>12.2f}x")
    tr, ti = sum(res["real"].values()), sum(res["ideal"].values())
    print("-" * 92)
    print(f"{'TOTAL CH4':<20}{tr:>20,.0f}{ti:>20,.0f}{ti / tr:>12.2f}x")

    print()
    print("=" * 92)
    print("  RESULTADO PUBLICAVEL")
    print("=" * 92)
    print(f"{'grandeza':<26}{'unidade':<11}{'REAL':>22}{'IDEAL':>22}")
    print("-" * 81)
    for lbl, rv, iv, un in [
        ("Metano / Biometano", tr, ti, "Nm3/ano"),
        ("Biogas bruto", tr / CH4_FRACTION_OF_BIOGAS, ti / CH4_FRACTION_OF_BIOGAS, "Nm3/ano"),
    ]:
        print(f"{lbl:<26}{un:<11}{rv:>22,.0f}{iv:>22,.0f}")
        print(f"{'':<26}{'Nm3/dia':<11}{rv / DAYS:>22,.0f}{iv / DAYS:>22,.0f}")
    er, ei = tr * CH4_LHV_KWH_M3 / 1e6, ti * CH4_LHV_KWH_M3 / 1e6
    print(f"{'Energia termica':<26}{'GWh/ano':<11}{er:>22,.0f}{ei:>22,.0f}")
    print(
        f"{'Energia eletrica':<26}{'GWh/ano':<11}{er * ETA_ELETRICA:>22,.0f}{ei * ETA_ELETRICA:>22,.0f}"
    )

    print()
    print("=" * 92)
    print("  BIOMETANO Nm3/dia CONTRA A LITERATURA PUBLICADA DE SP")
    print("=" * 92)
    bench = [
        ("GEF Biogas Brasil 2023", 42.5e6),
        ("ABiogas 2020", 36.4e6),
        ("Coelho et al. IEE-USP 2020", 23.6e6),
        ("SEMIL/SP 2023", 9.8e6),
        ("Instituto 17 / BEP-UK 2021", 8.2e6),
        ("PILAR-2b IDEAL (fronteira)", ti / DAYS),
        ("PILAR-2b REAL (curto prazo)", tr / DAYS),
        ("Capacidade instalada ANP 2024", 0.4e6),
    ]
    for nome, v in sorted(bench, key=lambda x: -x[1]):
        marca = " <<<" if nome.startswith("PILAR") else ""
        print(f"  {nome:<34}{v / 1e6:>8.1f} mi Nm3/dia{marca}")


if __name__ == "__main__":
    main()
