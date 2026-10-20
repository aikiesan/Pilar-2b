#!/usr/bin/env python3
"""
Bio-GNL em Santos, protótipo (Estratégia 2027, rodada 2, C25, especulativa).

FuelEU Maritime (Reg. UE 2023/1805, desde jan/2025) obriga os navios que tocam
portos europeus a baixar a intensidade de GEE da energia a bordo. Um navio a GNL
que abastece em Santos para ir à Europa poderia usar bio-GNL. Antes de qualquer
investimento de produto, três perguntas de uma página:

  1. oferta    quanto metano há a menos de X km do porto (Atlas Real, CP2b N3
               quando o snapshot existe, plantas ANP de biometano);
  2. escala    quantas toneladas por dia de bio-GNL isso dá, contra o tamanho
               de uma planta pequena de liquefação;
  3. valor     quanto um m³ valeria no FuelEU (excedente vendido em pool ou
               penalidade evitada) contra o que já vale no Brasil (molécula +
               atributo do Mercado Cativo Verde, do painel do mandato).

The supply side reuses build_biogram_reconciliation.py (municipal centroids,
Atlas Real and CP2b by municipality, the haversine); the Brazilian prices and
the methane LHV come from mandato_biometano.yaml through mandate_service, so
nothing here retypes a platform constant. The FuelEU numbers are new and live
below, each with its source; all are screening values to check against the
regulation text before quoting.

Run from the repo root:
  python3 analysis/build_sp_biolng_santos.py

Outputs (analysis/outputs/sp_biolng_santos/):
  oferta_por_raio.csv   ring × source (Atlas Real by category, CP2b N3, ANP plants)
  plantas_anp.csv       SP biomethane plants by distance to the port
  valor_fueleu.csv      R$/m³ under FuelEU by bio-LNG intensity, scope and price
  RELATORIO.md
"""

from __future__ import annotations

import csv
import importlib.util
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NEWLOOK = ROOT / "cp2b-workspace" / "NewLook"
SERVICE = NEWLOOK / "backend" / "app" / "services" / "mandate_service.py"
PARAMS_DIR = NEWLOOK / "data" / "canonical_parameters"
RECONCILIATION = ROOT / "analysis" / "build_biogram_reconciliation.py"
PLANTS = ROOT / "analysis" / "data" / "05_biogas_plants_brazil.csv"
OUT = ROOT / "analysis" / "outputs" / "sp_biolng_santos"

# Porto de Santos: the middle of the estuary (Alemoa–Macuco), approximate. Distances
# are straight lines from municipal centroids; by road (Anchieta/Imigrantes down the
# Serra do Mar) they are longer.
PORT = (-23.955, -46.31)
RINGS_KM = (50, 100, 150, 200)
STOPPED = ("inactive", "deactivated")  # e.g. Gasgrid: authorized in 2021, never produced

# Methane density at the ANP reference (20 °C, 101,325 kPa): 16,043 g/mol × 41,57 mol/m³.
CH4_KG_M3 = 0.667
# Small-scale liquefaction sizes to compare against (t of LNG per day). The only
# Brazilian figure found: Golar Power's two units, 45 t/d together (2020, one in SP
# for landfill biomethane); built or not is unconfirmed.
LIQUEFACTION_T_DAY = (10, 25, 50)
GOLAR_T_DAY = 45
GOLAR_URL = "https://www.energyintel.com/0000017b-a7db-de4c-a17b-e7db087d0000"

# FuelEU Maritime (Reg. 2023/1805). Reference intensity and the reduction by year
# (gard.no, sustainable-ships.org); energy on voyages into or out of the EU counts at
# 50 % (manifoldtimes, coachsolutions); penalty EUR 2,400 per t of VLSFO-equivalent at
# 41,000 MJ/t (DNV); pool surplus EUR 1,300–2,300 per t VLSFOe (OceanScore, 2024
# model, floor = cost of biofuel, ceiling = penalty).
FUELEU_REFERENCE_G_MJ = 91.16
FUELEU_REDUCTION = {2025: 0.02, 2030: 0.06, 2035: 0.145, 2040: 0.31, 2045: 0.62, 2050: 0.80}
FUELEU_YEAR = 2030
VLSFO_MJ_T = 41_000
PENALTY_EUR_T = 2_400
POOL_EUR_T = (1_300, 2_300)
EXTRA_EU_SHARE = 0.5
# Well-to-wake intensity of the bio-LNG, gCO2e/MJ: an assumption, not a source. The
# engine's methane slip (FuelEU defaults 3,1 % for medium-speed Otto dual-fuel, 1,7 %
# for slow-speed) alone is in the order of 10–20 g/MJ; landfill gas upstream adds
# little; manure could make it negative. Three points to see the sensitivity.
BIOLNG_G_MJ = (10.0, 20.0, 35.0)

SOURCES = {
    "fueleu_targets": "https://gard.no/articles/getting-ready-for-fueleu-maritime/",
    "fueleu_targets_2035_2050": "https://sustainable-ships.org/tools/fueleu",
    "fueleu_50pct": "https://www.manifoldtimes.com/news/cti-maritec-fueleu-maritime-regulation-effective-1-january-2025/",
    "fueleu_penalty": "https://www.dnv.com/maritime/insights/topics/fueleu-maritime/compliance/",
    "fueleu_pool": "https://maritime-executive.com/corporate/fueleu-offers-business-opportunity-with-pooling-of-compliance-surpluses",
    "fueleu_slip": "https://ww2.eagle.org/content/dam/eagle/regulatory-news/2025/RN%20-%20European%20Commission%20Guidelines%20-%20Actual%20Methane%20Slip%20Factors%20-%2019Dec.pdf",
    "udb_third_country": "https://www.marinelog.com/news/ecs-union-database-plan-could-limit-biofuel-availability-to-ships/",
    "udb_us_rng": "https://www.argusmedia.com/en/news-and-insights/latest-market-news/2731821-us-bio-lng-bunkers-wait-fueleu-recognition-panel",
    "udb_eurogas": "https://www.eurogas.org/resource/eurogas-45-other-organisations-call-for-urgent-action-allowing-imports-of-biomethane-and-biomethane-based-fuels-under-the-udb/",
    "udb_dentons_2026": "https://www.dentons.com/en/insights/newsletters/2026/april/1/future-of-energy-markets-europe/challenges-affecting-the-development-of-a-pan-eu-biomethane-market",
    "santos_lng_ship": "https://www.dpworld.com/pt-br/news/brazil/dp-world-brasil-recebe-primeiro-navio-movido-a-gnl",
    "santos_ethanol_bunker": "https://shipandbunker.com/news/am/659387-bunker-one-supplies-latin-americas-first-bioethanol-to-cma-cgm-boxship",
}


def load(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def lng_t_day(ch4_m3_day: float) -> float:
    return ch4_m3_day * CH4_KG_M3 / 1000.0


def ch4_m3_day(lng_t: float) -> float:
    return lng_t * 1000.0 / CH4_KG_M3


def fueleu_target(year: int = FUELEU_YEAR) -> float:
    return FUELEU_REFERENCE_G_MJ * (1 - FUELEU_REDUCTION[year])


def fueleu_eur_per_m3(lhv_mj_m3: float, biolng_g_mj: float, eur_per_t_vlsfoe: float,
                      share: float, year: int = FUELEU_YEAR) -> float:
    """EUR per m³ of CH4: the compliance surplus it creates, priced per t of VLSFO-equivalent.

    surplus (g) = energy in scope × (target − bio-LNG intensity). FuelEU turns a balance
    into tonnes of VLSFOe by dividing by the ship's intensity × 41,000 MJ/t; the ship is
    taken at the reference intensity, so the price per gram is the price per t ÷
    (91,16 × 41.000).
    """
    surplus_g = lhv_mj_m3 * share * (fueleu_target(year) - biolng_g_mj)
    return surplus_g * eur_per_t_vlsfoe / (FUELEU_REFERENCE_G_MJ * VLSFO_MJ_T)


def supply_by_ring(B, S) -> tuple[list[dict], str]:
    """Ring → Atlas Real by category and CP2b N3 (when present), in m³ CH4/day."""
    muns = B.municipalities()
    atlas = B.atlas_real_by_municipality(S, muns)
    cp2b, cp2b_note = B.cp2b_by_municipality()
    rows = []
    for radius in RINGS_KM:
        inside = [c for c, m in muns.items() if B.haversine_km(*PORT, m["lat"], m["lon"]) <= radius]
        by_cat: dict[str, float] = defaultdict(float)
        for code in inside:
            for cat, v in atlas.get(code, {}).items():
                by_cat[cat] += v / 365
        n3 = None
        if cp2b is not None:
            n3 = sum(lv["n3"] for code in inside for lv in cp2b.get(code, {}).values()) / 365
        rows.append({"raio_km": radius, "municipios": len(inside), "atlas_real_m3_dia": sum(by_cat.values()),
                     "atlas_por_categoria": dict(by_cat), "cp2b_n3_m3_dia": n3})
    return rows, cp2b_note


def anp_plants(B) -> list[dict]:
    """SP plants with an ANP biomethane authorization that have not stopped, nearest first."""
    out = []
    with PLANTS.open(encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            if r["uf"] != "SP" or r["anp_status"] != "anp_authorized" or r["status"] in STOPPED:
                continue
            out.append({
                "planta": r["plant_name"], "municipio": r["municipality"], "setor": r["sector"],
                "status": r["status"], "distancia_km": B.haversine_km(*PORT, float(r["lat"]), float(r["lon"])),
                "cap_biometano_m3_dia": float(r["biomethane_nm3_day"] or 0),
                "biogas_processado_m3_dia": float(r["processed_biogas_nm3_day_latest"] or 0),
            })
    return sorted(out, key=lambda p: p["distancia_km"])


def fmt(x: float, d: int = 0) -> str:
    return f"{x:,.{d}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def main() -> None:
    mandate = load(SERVICE, "mandate_service")
    params = mandate.read(PARAMS_DIR)
    route = params["troca_de_rota"]
    lhv_mj = route["pci_ch4_kwh_m3"] * 3.6
    brl_eur = route["brl_por_eur"]
    domestic = route["molecula_brl_m3"] + route["atributo_referencia_brl_m3"]
    burned = mandate.route_switch(params)["sp_burned_ch4_m3_day"]
    goal_2027 = next(t for t in mandate.targets(params) if t["year"] == 2027)["volume_m3_day"]

    B = load(RECONCILIATION, "biogram_reconciliation")
    S = B.load_scenario_module()
    rings, cp2b_note = supply_by_ring(B, S)
    plants = anp_plants(B)
    ch4_low, ch4_high = route["fracao_ch4"]
    for p in plants:
        # Biomethane now ≈ processed biogas × CH4 share (middle of the YAML range).
        p["biometano_atual_m3_dia"] = p["biogas_processado_m3_dia"] * (ch4_low + ch4_high) / 2
        p["bio_gnl_cap_t_dia"] = lng_t_day(p["cap_biometano_m3_dia"])
    for ring in rings:
        near = [p for p in plants if p["distancia_km"] <= ring["raio_km"]]
        ring["anp_plantas"] = len(near)
        ring["anp_cap_m3_dia"] = sum(p["cap_biometano_m3_dia"] for p in near)
        ring["anp_atual_m3_dia"] = sum(p["biometano_atual_m3_dia"] for p in near)

    value_rows = []
    for g in BIOLNG_G_MJ:
        for share, scope in ((EXTRA_EU_SHARE, "abastece em Santos, viagem para a UE"),
                             (1.0, "exportado, queimado dentro da UE")):
            for label, price in (("pool_min", POOL_EUR_T[0]), ("pool_max", POOL_EUR_T[1]),
                                 ("penalidade", PENALTY_EUR_T)):
                eur = fueleu_eur_per_m3(lhv_mj, g, price, share)
                value_rows.append({"bio_gnl_g_mj": g, "escopo": scope, "parcela": share, "preco": label,
                                   "eur_t_vlsfoe": price, "eur_m3": round(eur, 3),
                                   "brl_m3": round(eur * brl_eur, 2)})

    OUT.mkdir(parents=True, exist_ok=True)
    cats = sorted({c for r in rings for c in r["atlas_por_categoria"]})
    with (OUT / "oferta_por_raio.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["raio_km", "municipios", "atlas_real_m3_dia", *[f"atlas_{c}_m3_dia" for c in cats],
                    "cp2b_n3_m3_dia", "anp_plantas", "anp_cap_m3_dia", "anp_atual_m3_dia",
                    "atlas_real_bio_gnl_t_dia", "anp_cap_bio_gnl_t_dia"])
        for r in rings:
            w.writerow([r["raio_km"], r["municipios"], round(r["atlas_real_m3_dia"]),
                        *[round(r["atlas_por_categoria"].get(c, 0.0)) for c in cats],
                        "" if r["cp2b_n3_m3_dia"] is None else round(r["cp2b_n3_m3_dia"]),
                        r["anp_plantas"], round(r["anp_cap_m3_dia"]), round(r["anp_atual_m3_dia"]),
                        round(lng_t_day(r["atlas_real_m3_dia"]), 1), round(lng_t_day(r["anp_cap_m3_dia"]), 1)])
    with (OUT / "plantas_anp.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(plants[0]))
        w.writeheader()
        w.writerows({k: round(v, 1) if isinstance(v, float) else v for k, v in p.items()} for p in plants)
    with (OUT / "valor_fueleu.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(value_rows[0]))
        w.writeheader()
        w.writerows(value_rows)

    r100 = next(r for r in rings if r["raio_km"] == 100)
    rsu_share = r100["atlas_por_categoria"].get("rsu", 0.0) / r100["atlas_real_m3_dia"]
    n3_100 = "" if r100["cp2b_n3_m3_dia"] is None else f" ({fmt(r100['cp2b_n3_m3_dia'] / 1e3)} mil no CP2b N3)"
    mid = [v for v in value_rows if v["bio_gnl_g_mj"] == BIOLNG_G_MJ[1] and v["parcela"] == EXTRA_EU_SHARE]
    L = [
        "# Bio-GNL em Santos: oferta, escala e valor",
        "",
        "Gerado por `analysis/build_sp_biolng_santos.py`. Estratégia 2027, rodada 2 (C25, especulativa). "
        "Distâncias em linha reta do centroide municipal ao porto; pela Serra do Mar a estrada é mais longa.",
        "",
        "## 1. Oferta a menos de X km do porto (m³ de CH₄ por dia)",
        "",
        f"Atlas Real por município (o cenário Real do Atlas, como na reconciliação BioGRAM); CP2b N3: {cp2b_note}. "
        "Plantas ANP: capacidade autorizada de biometano e produção atual estimada "
        "(biogás processado no último mês × CH₄ médio).",
        "",
        "| Raio | Municípios | Atlas Real | CP2b N3 | Plantas ANP | Capacidade ANP | Produção ANP atual |",
        "|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for r in rings:
        n3 = "—" if r["cp2b_n3_m3_dia"] is None else fmt(r["cp2b_n3_m3_dia"])
        L.append(f"| {r['raio_km']} km | {r['municipios']} | {fmt(r['atlas_real_m3_dia'])} | {n3} | "
                 f"{r['anp_plantas']} | {fmt(r['anp_cap_m3_dia'])} | {fmt(r['anp_atual_m3_dia'])} |")
    L += [
        "",
        f"A 100 km, {100 * rsu_share:.0f} % do Atlas Real é RSU (a Região Metropolitana): na prática, gás de aterro.",
        "",
        "| Planta ANP | Município | Distância | Capacidade (m³/dia) | Bio-GNL na capacidade (t/dia) |",
        "|---|---|---:|---:|---:|",
    ]
    for p in plants:
        if p["distancia_km"] <= RINGS_KM[-1]:
            L.append(f"| {p['planta']} | {p['municipio']} | {fmt(p['distancia_km'])} km | "
                     f"{fmt(p['cap_biometano_m3_dia'])} | {fmt(p['bio_gnl_cap_t_dia'], 1)} |")
    L += [
        "",
        "## 2. Escala",
        "",
        f"1 t de GNL = {fmt(ch4_m3_day(1))} m³ de CH₄ (densidade {fmt(CH4_KG_M3, 3)} kg/m³ a 20 °C, referência da ANP).",
        "",
        "| Liquefação (t/dia) | CH₄ necessário (m³/dia) |",
        "|---:|---:|",
        *[f"| {t} | {fmt(ch4_m3_day(t))} |" for t in LIQUEFACTION_T_DAY],
        "",
        f"Referência brasileira: Golar Power, duas unidades com {GOLAR_T_DAY} t/dia somadas (2020, sem confirmação de "
        f"que foram construídas). Para comparar: SP queima cerca de {fmt(burned / 1e6, 2)} milhões de m³/dia de CH₄ "
        f"e a meta nacional de 2027 é de {fmt(goal_2027 / 1e6, 2)} milhão de m³/dia (painel do mandato).",
        "",
        f"## 3. Valor no FuelEU ({FUELEU_YEAR}: limite de {fmt(fueleu_target(), 2)} gCO₂e/MJ)",
        "",
        f"R$ por m³ de CH₄ (a R$ {fmt(brl_eur, 2)}/€), pelo excedente de conformidade que o bio-GNL cria. "
        f"No Brasil, molécula + atributo do Mercado Cativo Verde = **R$ {fmt(domestic, 2)}/m³**.",
        "",
        "| Bio-GNL (gCO₂e/MJ) | Escopo | Pool mín. | Pool máx. | Penalidade |",
        "|---:|---|---:|---:|---:|",
    ]
    for g in BIOLNG_G_MJ:
        for share in (EXTRA_EU_SHARE, 1.0):
            cells = {v["preco"]: v["brl_m3"] for v in value_rows if v["bio_gnl_g_mj"] == g and v["parcela"] == share}
            scope = next(v["escopo"] for v in value_rows if v["parcela"] == share)
            L.append(f"| {fmt(g)} | {scope} | {fmt(cells['pool_min'], 2)} | {fmt(cells['pool_max'], 2)} | "
                     f"{fmt(cells['penalidade'], 2)} |")
    L += [
        "",
        "O valor do FuelEU é só o do atributo: a molécula vendida como combustível de navio paga à parte "
        "(perto do GNL fóssil), e dela saem a liquefação e o frete até o porto.",
        "",
        "## Leitura",
        "",
        f"1. **Oferta existe, mas é de aterro, e o mercado interno a disputa.** A 100 km há {fmt(r100['atlas_real_m3_dia'] / 1e3)} mil "
        f"m³/dia de CH₄ no Atlas Real{n3_100} e {fmt(r100['anp_cap_m3_dia'] / 1e3)} mil de capacidade ANP; uma planta de "
        f"{LIQUEFACTION_T_DAY[1]} t/dia pede {fmt(ch4_m3_day(LIQUEFACTION_T_DAY[1]) / 1e3)} mil. "
        "O mesmo gás atende o mandato e o Mercado Cativo Verde sem sair do país.",
        f"2. **No meio da faixa, o FuelEU pagaria pelo atributo R$ {fmt(mid[0]['brl_m3'], 2)}–"
        f"{fmt(mid[2]['brl_m3'], 2)}/m³ numa viagem para a Europa** (só metade da energia conta), "
        f"contra R$ {fmt(route['atributo_referencia_brl_m3'], 2)}/m³ do atributo no Brasil. "
        "A diferença precisa cobrir liquefação, caminhão pela serra e certificação.",
        "3. **O bloqueio é a certificação, não a oferta.** A Comissão Europeia sinalizou que não reconhece na "
        "Union Database (UDB) biometano que passa por rede de gás fora da UE (balanço de massa), e o RNG "
        "americano com ISCC ainda não é aceito. Bio-GNL de Santos só entraria com cadeia física (liquefação "
        "na planta, sem passar pela rede da Comgás) e com o reconhecimento do país; até lá o atributo não conta no FuelEU.",
        "",
        "## Limites",
        "",
        "- Intensidade do bio-GNL é suposição (três pontos). O *slip* do motor domina; conferir os padrões do "
        "Anexo II do Reg. 2023/1805 e a regra de alocação de combustível nas viagens de 50 %.",
        "- Preço de pool é de um modelo de 2024 (OceanScore); a penalidade é o teto. Sem preço de mercado do bio-GNL.",
        "- Plantas da cidade de São Paulo ficam no centroide do município; Atlas Real e CP2b por centroide.",
        "- CBIO e CGOB sobre volume exportado: não verificado. Vender o atributo no Brasil e o bio-GNL como "
        "renovável na UE seria dupla contagem (C27).",
        "",
        "Fontes: " + "; ".join(f"[{k}]({u})" for k, u in SOURCES.items()) + f"; [golar]({GOLAR_URL}).",
        "",
    ]
    (OUT / "RELATORIO.md").write_text("\n".join(L), encoding="utf-8")
    print("\n".join(L))


if __name__ == "__main__":
    main()
