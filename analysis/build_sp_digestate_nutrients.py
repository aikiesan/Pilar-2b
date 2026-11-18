#!/usr/bin/env python3
"""
Digestato como fertilizante, protótipo: quanto N-P-K o biogás de SP devolveria?

Strategy 2027 §3.5 proposes replacing the calculator's `digestato = 0.75 × massa`
with a nutrient balance. This prototype computes, per municipality and for the
Cenário Real (Atlas-FDE) flows that come from municipal data:

  supply   N, P2O5 and K2O carried by each feedstock into the digester. Anaerobic
           digestion conserves P and K and conserves N in mass (it mineralises
           part of it to NH4+, which is then exposed to volatilisation in
           storage: N_STORAGE_RETENTION). Feedstock masses are the ones the
           scenario script itself uses (same constants, imported, not retyped).
  fate     what happens to those nutrients TODAY without a digester. This is
           the point the prototype exists to make: most of SP's digestate
           nutrients are already being returned to the soil (vinasse
           fertigation, filter cake, manure), so the digester does not create
           them. It only creates new nutrients where the feedstock goes to
           landfill today (urban organic waste). Cane straw is the opposite
           case: removing it from the field to digest it EXPORTS nutrients the
           mill must replace, and the digestate is how it can.
  demand   crop area (IBGE PAM 2023, in the master file) × an indicative
           fertiliser recommendation per crop. Pasture and forestry are left
           out, so demand is a floor.
  value    nutrient tonnes × an indicative import price per tonne of nutrient.

Every coefficient is a screening value with its source class and a "conferir"
note where it was not checked against the primary source in this session.

Run from the repo root:
  python3 analysis/build_sp_digestate_nutrients.py

Outputs (analysis/outputs/sp_digestate_nutrients/):
  municipios.csv  nutrient supply by fate and crop demand per municipality
  RELATORIO.md    summary
"""

from __future__ import annotations

import csv
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NEWLOOK = ROOT / "cp2b-workspace" / "NewLook"
SCEN = NEWLOOK / "backend" / "scripts" / "sp_scenarios_real_ideal.py"
MASTER = NEWLOOK / "data" / "canonical_parameters" / "SP_master_residue_streams_2023_FINAL.csv"
NAMES = ROOT / "analysis" / "data" / "01_master_residue_streams_SP_2023.csv"
OUT = ROOT / "analysis" / "outputs" / "sp_digestate_nutrients"
TIER = "real"

NUTRIENTS = ("N", "P2O5", "K2O")

# Feedstock composition, kg of nutrient per tonne of feedstock as the scenario
# script counts its mass (m3 for vinasse). Screening values; conferir.
COMPOSITION = {
    # CETESB P4.231 asks each mill for its measured K2O; 1.5–3.5 kg/m3 is the
    # usual range for mixed-must vinasse. N and P are an order lower.
    "vinhaça": {"N": 0.35, "P2O5": 0.10, "K2O": 2.0},
    # Filter cake, ~30 % dry matter; per dry tonne ≈ 1.4 % N, 1.9 % P2O5, 0.4 % K2O.
    "torta de filtro": {"N": 4.2, "P2O5": 5.7, "K2O": 1.2},
    # Straw per tonne of DRY matter (field studies on cane trash, Trivelin and
    # Franco lines); converted to the script's wet basis with STRAW_VS_PER_TS.
    "palha de cana": {"N": 5.0, "P2O5": 1.0, "K2O": 8.0},
    # Fresh cattle dung, ~17 % DM.
    "bovinos": {"N": 4.5, "P2O5": 2.5, "K2O": 4.5},
    # Swine slurry at the ~3 % solids the script's VS (2.4 %) implies; Embrapa Suínos.
    "suínos": {"N": 2.8, "P2O5": 2.2, "K2O": 1.6},
    # Fresh poultry excreta.
    "aves": {"N": 14.0, "P2O5": 11.0, "K2O": 7.0},
    # Source-separated food/garden fraction of MSW, wet.
    "RSU (FORSU)": {"N": 6.0, "P2O5": 2.0, "K2O": 3.0},
}
STRAW_VS_PER_TS = 0.90  # straw dry matter = VS / 0.90
VINHACA_M3_POR_M3_ETANOL = 12.0  # 10–13 is the usual range

# Where the nutrient goes today, without a digester.
FATE = {
    "vinhaça": "ja_reciclado",  # fertigation (CETESB P4.231)
    "torta de filtro": "ja_reciclado",  # applied in the cane furrow
    "bovinos": "ja_reciclado",  # largely deposited on pasture
    "suínos": "ja_reciclado",  # slurry spread on land
    "aves": "ja_reciclado",  # litter sold as fertiliser
    "palha de cana": "exportado_pela_remocao",  # stays on field unless removed
    "RSU (FORSU)": "novo",  # landfilled today
}
FATE_LABEL = {
    "ja_reciclado": "Já volta ao solo hoje",
    "exportado_pela_remocao": "Sai do campo se a palha for removida",
    "novo": "Hoje vai para aterro (nutriente novo)",
}
# Sewage sludge is left out: biosolids follow CONAMA 498/2020, a separate route.

N_STORAGE_RETENTION = 0.85  # NH3 loss in digestate storage, covered tank ~5 %, open lagoon 20 %+

# Indicative annual recommendation, kg/ha (N, P2O5, K2O). Order of magnitude for
# SP crops in the IAC Boletim 100 style; conferir na edição vigente antes de usar.
RECOMMENDATION = {
    "Cana_de_açúcar": (90, 25, 110),  # ratoon, without vinasse
    "Soja_em_grão": (0, 60, 60),
    "Milho_em_grão": (90, 60, 50),
    "Laranja": (150, 40, 120),
    "Café_em_grão_Total": (250, 40, 200),
    "Feijão_em_grão": (50, 60, 40),
    "Algodão_herbáceo_em_caroço": (90, 70, 70),
    "Amendoim_em_casca": (10, 60, 50),
    "Arroz_em_casca": (50, 50, 40),
    "Mandioca": (40, 50, 50),
    "Batata_inglesa": (120, 300, 150),
    "Batata_doce": (40, 80, 80),
    "Tomate": (200, 400, 300),
    "Banana_cacho": (200, 60, 400),
    "Trigo_em_grão": (60, 60, 40),
    "Sorgo_em_grão": (60, 50, 40),
    "Uva": (60, 60, 80),
    "Cebola": (120, 200, 120),
}

# Indicative CIF price per tonne of NUTRIENT (US$), from urea (46 % N), MAP
# (52 % P2O5) and KCl (60 % K2O) at 2025 order-of-magnitude prices. Replace by
# ComexStat monthly import values before quoting.
PRICE_USD_PER_T = {"N": 870.0, "P2O5": 1100.0, "K2O": 580.0}
BRL_PER_USD = 5.5


def load_scenario_module():
    spec = importlib.util.spec_from_file_location("sp_scen", SCEN)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def feedstock_tonnes(S, row: dict, tier: str = TIER) -> dict[str, float]:
    """Feedstock mass per stream for one municipality, with the scenario script's own constants."""
    cana = S.somar([row], "prod_t_Cana_de_açúcar")
    pop = float(row.get("populacao_total_hab") or 0)
    rsu_t = pop * S.rsu_per_capita(pop) * S.DAYS / 1000.0
    if tier == "real":
        rsu_t *= S.RSU_COLETA_REAL
    straw_wet = cana * S.PALHA_KG_POR_T_CANA / 1000.0 * S.PALHA_FRACAO[tier]

    def manure(col, key):
        return S.somar([row], col) * S.KG_ESTERCO_DIA[key][tier] * S.DAYS / 1000.0

    return {
        "vinhaça": cana * S.ETANOL_M3_POR_T_CANA * VINHACA_M3_POR_M3_ETANOL,
        "torta de filtro": cana * S.TORTA_KG_POR_T_CANA / 1000.0,
        # composition is per dry tonne for straw
        "palha de cana": straw_wet * (S.PALHA_VS / 100) / STRAW_VS_PER_TS,
        "bovinos": manure("cabecas_Bovino", "bovino"),
        "suínos": manure("cabecas_Suíno___total", "suino"),
        "aves": manure("cabecas_Galináceos___total", "ave"),
        "RSU (FORSU)": rsu_t * S.RSU_MO_FRACAO,
    }


def digestate_nutrients(tonnes: dict[str, float]) -> dict[str, dict[str, float]]:
    """t of nutrient per stream leaving digestate storage."""
    out = {}
    for stream, t in tonnes.items():
        c = COMPOSITION[stream]
        out[stream] = {
            n: t * c[n] / 1000.0 * (N_STORAGE_RETENTION if n == "N" else 1.0) for n in NUTRIENTS
        }
    return out


def crop_demand(row: dict) -> dict[str, float]:
    """t of nutrient per year recommended for the municipality's PAM crop area."""
    d = dict.fromkeys(NUTRIENTS, 0.0)
    for crop, rec in RECOMMENDATION.items():
        ha = float(row.get(f"area_ha_{crop}") or 0)
        for n, kg in zip(NUTRIENTS, rec):
            d[n] += ha * kg / 1000.0
    return d


def value_brl(t: dict[str, float]) -> float:
    return sum(t[n] * PRICE_USD_PER_T[n] for n in NUTRIENTS) * BRL_PER_USD


def names() -> dict[str, str]:
    out = {}
    with NAMES.open(encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            out.setdefault(r["ibge_code"], r["municipality_name"])
    return out


def fmt(x: float) -> str:
    return f"{x:,.0f}".replace(",", ".")


def main() -> None:
    S = load_scenario_module()
    with MASTER.open(encoding="utf-8-sig") as fh:
        rows = list(csv.DictReader(fh))
    nm = names()

    state_stream = {s: dict.fromkeys(NUTRIENTS, 0.0) for s in COMPOSITION}
    state_demand = dict.fromkeys(NUTRIENTS, 0.0)
    cane_demand = dict.fromkeys(NUTRIENTS, 0.0)
    muni = []
    for r in rows:
        nut = digestate_nutrients(feedstock_tonnes(S, r))
        dem = crop_demand(r)
        for s, v in nut.items():
            for n in NUTRIENTS:
                state_stream[s][n] += v[n]
        for n, kg in zip(NUTRIENTS, RECOMMENDATION["Cana_de_açúcar"]):
            cane_demand[n] += float(r.get("area_ha_Cana_de_açúcar") or 0) * kg / 1000.0
        by_fate = {f: dict.fromkeys(NUTRIENTS, 0.0) for f in FATE_LABEL}
        for s, v in nut.items():
            for n in NUTRIENTS:
                by_fate[FATE[s]][n] += v[n]
        rec = {"cd_mun": r["CD_GEOCODI"], "municipio": nm.get(r["CD_GEOCODI"], "")}
        for n in NUTRIENTS:
            state_demand[n] += dem[n]
            total = sum(by_fate[f][n] for f in by_fate)
            rec[f"{n}_digestato_t"] = round(total, 1)
            rec[f"{n}_novo_t"] = round(by_fate["novo"][n], 1)
            rec[f"{n}_demanda_t"] = round(dem[n], 1)
            rec[f"{n}_cobertura_pct"] = round(100 * total / dem[n], 1) if dem[n] > 0 else ""
        rec["valor_total_mi_brl"] = round(
            value_brl({n: rec[f"{n}_digestato_t"] for n in NUTRIENTS}) / 1e6, 3
        )
        rec["valor_novo_mi_brl"] = round(
            value_brl({n: rec[f"{n}_novo_t"] for n in NUTRIENTS}) / 1e6, 3
        )
        muni.append(rec)

    OUT.mkdir(parents=True, exist_ok=True)
    with (OUT / "municipios.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(muni[0]))
        w.writeheader()
        w.writerows(sorted(muni, key=lambda m: -m["valor_total_mi_brl"]))

    fate_tot = {f: dict.fromkeys(NUTRIENTS, 0.0) for f in FATE_LABEL}
    for s, v in state_stream.items():
        for n in NUTRIENTS:
            fate_tot[FATE[s]][n] += v[n]
    total = {n: sum(fate_tot[f][n] for f in fate_tot) for n in NUTRIENTS}
    val = {f: value_brl(fate_tot[f]) / 1e6 for f in fate_tot}
    vin_k_vs_cane = state_stream["vinhaça"]["K2O"] / cane_demand["K2O"]

    L = [
        "# Digestato como fertilizante em SP: protótipo",
        "",
        "Gerado por `analysis/build_sp_digestate_nutrients.py`. Estratégia 2027, §3.5.",
        "",
        f"Cenário {TIER.capitalize()} (Atlas-FDE), fluxos com dado municipal (sem esgoto, "
        "cujo lodo segue a CONAMA 498/2020, e sem os sete fluxos que só existem como total estadual). "
        f"N já descontado de {100 * (1 - N_STORAGE_RETENTION):.0f} % de perda no armazenamento.",
        "",
        "## Nutrientes no digestato, por fluxo (t/ano)",
        "",
        "| Fluxo | Destino hoje, sem biodigestor | N | P₂O₅ | K₂O |",
        "|---|---|---:|---:|---:|",
    ]
    for s, v in sorted(state_stream.items(), key=lambda kv: -sum(kv[1].values())):
        L.append(f"| {s} | {FATE_LABEL[FATE[s]]} | {fmt(v['N'])} | {fmt(v['P2O5'])} | {fmt(v['K2O'])} |")
    L += [
        f"| **Total** | | **{fmt(total['N'])}** | **{fmt(total['P2O5'])}** | **{fmt(total['K2O'])}** |",
        "",
        "## Por destino atual",
        "",
        "| Destino hoje | N | P₂O₅ | K₂O | Valor a preço de importação (R$ mi/ano) |",
        "|---|---:|---:|---:|---:|",
    ]
    for f, v in fate_tot.items():
        L.append(f"| {FATE_LABEL[f]} | {fmt(v['N'])} | {fmt(v['P2O5'])} | {fmt(v['K2O'])} | {fmt(val[f])} |")
    L += [
        "",
        "## Demanda das lavouras (PAM 2023 × recomendação indicativa, sem pastagem)",
        "",
        "| | N | P₂O₅ | K₂O |",
        "|---|---:|---:|---:|",
        f"| Demanda (t/ano) | {fmt(state_demand['N'])} | {fmt(state_demand['P2O5'])} | {fmt(state_demand['K2O'])} |",
        "| Digestato total / demanda | "
        + " | ".join(f"{100 * total[n] / state_demand[n]:.0f} %" for n in NUTRIENTS)
        + " |",
        "| Só o nutriente novo / demanda | "
        + " | ".join(f"{100 * fate_tot['novo'][n] / state_demand[n]:.1f} %".replace(".", ",") for n in NUTRIENTS)
        + " |",
        "",
        "## Leitura",
        "",
        f"1. **O digestato não é uma receita nova para a maior parte de SP.** "
        f"{100 * val['ja_reciclado'] / sum(val.values()):.0f} % do valor dos nutrientes vem de fluxos "
        "que já voltam ao solo hoje: a vinhaça na fertirrigação, a torta no sulco, o dejeto na pastagem ou na lavoura. "
        "O biodigestor preserva esses nutrientes; não os cria. Somar esse valor à receita do projeto, "
        "como faria um `digestato × preço`, conta duas vezes um insumo que a usina ou o produtor já usa.",
        f"2. **A vinhaça sozinha cobre cerca de {100 * vin_k_vs_cane:.0f} % do K₂O recomendado para a cana de SP.** "
        "É por isso que a CETESB regula a dose por potássio. Um biodigestor de vinhaça precisa provar que o "
        "digestato continua aplicável sob a P4.231; a vantagem dele é agronômica (menos DQO, menos odor, "
        "menos emissão de metano na lagoa), não um fertilizante a vender.",
        f"3. **A palha é o caso contrário.** Remover {100 * S.PALHA_FRACAO[TIER]:.0f} % da palha para "
        f"o biodigestor tira do campo {fmt(fate_tot['exportado_pela_remocao']['K2O'])} t de K₂O e "
        f"{fmt(fate_tot['exportado_pela_remocao']['N'])} t de N por ano "
        f"(R$ {fmt(val['exportado_pela_remocao'])} mi a preço de importação). "
        "Se o digestato não voltar ao canavial, essa conta é um custo do projeto que hoje nenhum cenário do PILAR-2b registra.",
        f"4. **O nutriente genuinamente novo vem do resíduo urbano:** R$ {fmt(val['novo'])} mi/ano, "
        "hoje enterrados em aterro. Isso é o argumento de economia circular para prefeituras e consórcios, "
        "e depende de coleta seletiva da fração orgânica, que é a premissa mais frágil do fluxo.",
        "",
        "## Consequência para o produto",
        "",
        "- A calculadora e o dossiê devem separar o digestato em três linhas: **valor preservado** "
        "(fluxos já reciclados, não é receita), **reposição obrigatória** (palha removida, custo evitado "
        "só se o digestato voltar ao campo) e **nutriente novo** (FORSU, receita potencial).",
        "- O mapa pode mostrar, por município, \"% da demanda de N/P/K das lavouras atendível por digestato\" "
        "(coluna `*_cobertura_pct` de `municipios.csv`).",
        "",
        "## Limites",
        "",
        "- Coeficientes de composição, recomendações por cultura e preços são valores de triagem, "
        "marcados `conferir` no script. Antes de citar, conferir composição contra o corpus, "
        "recomendações contra o Boletim 100 vigente e preços contra o ComexStat.",
        "- Demanda sem pastagem nem silvicultura: é um piso.",
        "- Disponibilidade agronômica de N do digestato (fração mineral) não é tratada; "
        "P e K são considerados integralmente disponíveis.",
        "",
    ]
    (OUT / "RELATORIO.md").write_text("\n".join(L), encoding="utf-8")
    print("\n".join(L))


if __name__ == "__main__":
    main()
