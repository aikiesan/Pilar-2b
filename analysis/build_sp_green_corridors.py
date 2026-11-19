#!/usr/bin/env python3
"""
Corredores verdes com dados reais, protótipo (Estratégia 2027, rodada 2, C24).

A §3.6 da v1 propunha "corredores de biometano" como hipótese. Em 2026 eles
existem: o Corredor Verde da TransJordano (100 caminhões, postos em Sumaré,
Cubatão e Ribeirão Preto, BNDES R$ 140 mi) e a Iconic no eixo SP–RJ. Para cada
corredor rodoviário de SP, três perguntas:

  1. demanda   quantos postos de GNV há a menos de 20 km da rodovia (pesquisa
               de preços da ANP, jan/2025–jun/2026);
  2. oferta    quanto biometano as plantas ANP produzem a menos de 50 km, e
               quanto metano há no Atlas Real (e no CP2b N3, com o snapshot);
  3. déficit   quantos desses postos não têm planta em operação a 50 km.

Each corridor is its highways as drawn in the platform's own road layers
(MapBiomas 10.1 INFRAESTRUTURA, exported by analysis/sql/export_corridor_highways.sql):
the segments whose code (sigla) is the corridor's and that lie along a line
through anchor municipalities, which only says where the corridor starts and
ends (so the Régis Bittencourt half of BR-116 stays out of the Dutra). Without
the export, the anchor line itself stands in for the road. No coordinate is
typed here. Stations sit at their municipality's centroid. The supply side reuses
build_biogram_reconciliation.py (centroids, Atlas Real, CP2b, haversine) and the
ANP plant table and constants of build_sp_biolng_santos.py; the CH4 share comes
from mandato_biometano.yaml through mandate_service.

Run from the repo root:
  python3 analysis/build_sp_green_corridors.py

Outputs (analysis/outputs/sp_green_corridors/):
  corredores.csv        corridor × stations, plants, supply and deficit
  postos_por_municipio.csv  CNG stations by municipality, nearest operating plant
  RELATORIO.md
"""

from __future__ import annotations

import csv
import importlib.util
import math
import unicodedata
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
C25 = ROOT / "analysis" / "build_sp_biolng_santos.py"
NAMES = ROOT / "analysis" / "data" / "01_master_residue_streams_SP_2023.csv"
STATIONS = ROOT / "analysis" / "data" / "sources" / "anp" / "anp_postos_gnv_sp.csv"
ROADS = ROOT / "analysis" / "data" / "sources" / "mapbiomas" / "rodovias_corredores_sp.geojson"
OUT = ROOT / "analysis" / "outputs" / "sp_green_corridors"

STATION_KM = 20  # a station counts for a corridor when its municipality is this close
SUPPLY_KM = 50   # plants and Atlas Real municipalities this close supply the corridor
# A plant "supplies" only above this output: OneBio Paulínia (≈ 125 m³/d) and Santa Cruz
# (≈ 10 m³/d) are authorized and listed as operating but deliver almost nothing.
PRODUCING_M3_DAY = 1_000
ANCHOR_KM = 30   # a road segment belongs to the corridor when its middle is this close to the anchor line
CAPITAL = "3550308"  # São Paulo: 38 of the stations, at one centroid on four corridors

# Road codes ("/"-separated, as in the layer's sigla) and anchor municipalities in road
# order. The anchors pick the stretch of each road; the road layer gives its shape.
CORRIDORS = {
    "Anhanguera/Bandeirantes": ("SP-330/SP-348", [
        "São Paulo", "Jundiaí", "Campinas", "Americana", "Limeira", "Pirassununga", "Ribeirão Preto"]),
    "Dutra": ("BR-116", [
        "São Paulo", "Guarulhos", "Jacareí", "São José dos Campos", "Taubaté", "Guaratinguetá", "Cruzeiro"]),
    "Anchieta/Imigrantes": ("SP-150/SP-160", ["São Paulo", "São Bernardo do Campo", "Cubatão", "Santos"]),
    "Washington Luís": ("SP-310", [
        "Cordeirópolis", "Rio Claro", "São Carlos", "Araraquara", "Catanduva", "São José do Rio Preto"]),
    "Raposo Tavares": ("SP-270", [
        "São Paulo", "Sorocaba", "Itapetininga", "Ourinhos", "Assis", "Presidente Prudente"]),
    "Marechal Rondon (Tietê–Araçatuba)": ("SP-300", ["Tietê", "Botucatu", "Bauru", "Lins", "Araçatuba"]),
}

# TransJordano's three biomethane stations (BNDES, abr/2026; open to other fleets).
# They are new, so the ANP price survey does not list them.
TRANSJORDANO = ["Sumaré", "Cubatão", "Ribeirão Preto"]
TRANSJORDANO_TRUCKS = 100
TRANSJORDANO_ROUTE_KM = 450

# Truck consumption, an order of magnitude only: 29 kg of CNG per 100 km, one owner's
# log of a Scania G410 CNG (Spritmonitor, 2021). No Brazilian measured figure found;
# replace with TransJordano's or Scania Brasil's when published.
TRUCK_KG_100KM = 29.0
TRUCK_KM_DAY = TRANSJORDANO_ROUTE_KM  # one leg of the corridor per day, an assumption

SOURCES = {
    "anp_precos": "https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/serie-historica-de-precos-de-combustiveis",
    "bndes_transjordano": "https://agenciainfra.com/blog/bndes-libera-r-140-mi-para-corredor-verde-em-sp/",
    "transjordano_rota": "https://mundologistica.com.br/noticias/transjordano-corredor-verde-sp",
    "spritmonitor_g410": "https://www.spritmonitor.de/en/detail/1249571.html",
}


def load(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def norm(name: str) -> str:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().upper()
    return " ".join(s.replace("-", " ").replace("'", " ").split())


def name_index() -> dict[str, str]:
    """Normalized municipality name -> IBGE code."""
    out = {}
    with NAMES.open(encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            out[norm(r["municipality_name"])] = r["ibge_code"].strip()
    return out


def point_segment_km(p, a, b) -> float:
    """Distance from p to the segment a–b, on a local equirectangular plane (fine at < 500 km)."""
    lat0 = math.radians((a[0] + b[0] + p[0]) / 3)
    k = 111.195  # km per degree of latitude on a 6,371 km sphere

    def xy(q):
        return q[1] * k * math.cos(lat0), q[0] * k

    (px, py), (ax, ay), (bx, by) = xy(p), xy(a), xy(b)
    dx, dy = bx - ax, by - ay
    t = 0.0 if dx == dy == 0 else max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)


def polyline_km(p, line) -> float:
    return min(point_segment_km(p, a, b) for a, b in zip(line, line[1:]))


def along(p, line) -> tuple[float, bool]:
    """Distance from p to the polyline, and whether p falls beside it rather than past an end."""
    best, inside = math.inf, True
    last = len(line) - 2
    for i, (a, b) in enumerate(zip(line, line[1:])):
        d = point_segment_km(p, a, b)
        if d < best:
            lat0 = math.cos(math.radians(a[0]))
            dx, dy = (b[1] - a[1]) * lat0, b[0] - a[0]
            t = ((p[1] - a[1]) * lat0 * dx + (p[0] - a[0]) * dy) / (dx * dx + dy * dy or 1.0)
            best, inside = d, not ((i == 0 and t < 0) or (i == last and t > 1))
    return best, inside


def road_parts(geometry: dict) -> list[list[tuple[float, float]]]:
    """GeoJSON LineString/MultiLineString -> polylines of (lat, lon)."""
    lines = [geometry["coordinates"]] if geometry["type"] == "LineString" else geometry["coordinates"]
    return [[(y, x) for x, y, *_ in ln] for ln in lines if len(ln) >= 2]


def load_roads() -> list[dict] | None:
    if not ROADS.exists():
        return None
    import json

    with ROADS.open(encoding="utf-8") as fh:
        return json.load(fh)["features"]


def corridor_geometry(anchor_line, codes: set[str], roads: list[dict] | None) -> list[list[tuple[float, float]]]:
    """The corridor's road segments, or the anchor line when the road export is absent."""
    if roads is None:
        return [anchor_line]
    parts = []
    for f in roads:
        if not codes & {c.strip() for c in (f["properties"]["sigla"] or "").split("/")}:
            continue
        for part in road_parts(f["geometry"]):
            d, inside = along(part[len(part) // 2], anchor_line)
            if d <= ANCHOR_KM and inside:
                parts.append(part)
    return parts


def near(p, parts, km: float) -> bool:
    """Is p within km of any of the polylines (bounding-box prefilter, then exact)."""
    dlat = km / 111.0
    dlon = km / (111.0 * math.cos(math.radians(p[0])))
    for part in parts:
        lats, lons = [q[0] for q in part], [q[1] for q in part]
        if min(lats) - dlat <= p[0] <= max(lats) + dlat and min(lons) - dlon <= p[1] <= max(lons) + dlon:
            if polyline_km(p, part) <= km:
                return True
    return False


def stations_by_municipality(index: dict[str, str]) -> tuple[Counter, int]:
    counts: Counter = Counter()
    with STATIONS.open(encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    for r in rows:
        code = index.get(norm(r["municipio"]))
        if code is None:
            raise SystemExit(f"Município sem código IBGE: {r['municipio']!r}")
        counts[code] += 1
    return counts, len(rows)


def plants(M, ch4_share: float) -> list[dict]:
    """SP plants with an ANP biomethane authorization that have not stopped."""
    out = []
    with M.PLANTS.open(encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            if r["uf"] != "SP" or r["anp_status"] != "anp_authorized" or r["status"] in M.STOPPED:
                continue
            out.append({
                "planta": r["plant_name"], "municipio": r["municipality"], "status": r["status"],
                "lat": float(r["lat"]), "lon": float(r["lon"]),
                "cap_m3_dia": float(r["biomethane_nm3_day"] or 0),
                # Biomethane now ≈ processed biogas × CH4 share, as in C25.
                "atual_m3_dia": float(r["processed_biogas_nm3_day_latest"] or 0) * ch4_share,
            })
    return out


def truck_m3_day(M) -> float:
    return TRUCK_KG_100KM / 100 / M.CH4_KG_M3 * TRUCK_KM_DAY


def geometries(muns, index, roads) -> dict[str, list]:
    out = {}
    for name, (codes, anchors) in CORRIDORS.items():
        line = [(muns[index[norm(a)]]["lat"], muns[index[norm(a)]]["lon"]) for a in anchors]
        out[name] = corridor_geometry(line, set(codes.split("/")), roads)
    return out


def corridor_rows(B, M, muns, index, counts, plant_list, atlas, cp2b, geoms) -> list[dict]:
    rows = []
    for name, (roads, anchors) in CORRIDORS.items():
        line = [(muns[index[norm(a)]]["lat"], muns[index[norm(a)]]["lon"]) for a in anchors]
        length = sum(B.haversine_km(*a, *b) for a, b in zip(line, line[1:]))
        parts = geoms[name]
        if not parts:
            raise SystemExit(f"{name}: nenhum trecho de {roads} perto das âncoras")
        road_km = sum(B.haversine_km(*a, *b) for part in parts for a, b in zip(part, part[1:]))
        near_station = {c for c in counts if near((muns[c]["lat"], muns[c]["lon"]), parts, STATION_KM)}
        near_supply = {c for c, m in muns.items() if near((m["lat"], m["lon"]), parts, SUPPLY_KM)}
        near_plants = [p for p in plant_list if near((p["lat"], p["lon"]), parts, SUPPLY_KM)]
        # Deficit: stations on the corridor with no producing plant within SUPPLY_KM of their municipality.
        uncovered = sum(counts[c] for c in near_station if not any(
            producing(p) and B.haversine_km(muns[c]["lat"], muns[c]["lon"], p["lat"], p["lon"]) <= SUPPLY_KM
            for p in plant_list))
        stations = sum(counts[c] for c in near_station)
        rows.append({
            "corredor": name, "rodovias": roads, "ancoras": " – ".join(anchors),
            "extensao_km": length, "trechos_via": len(parts), "via_km": road_km, "postos_gnv": stations,
            "postos_gnv_fora_da_capital": stations - (counts[CAPITAL] if CAPITAL in near_station else 0),
            "municipios_com_posto": len(near_station),
            "postos_sem_planta_50km": uncovered,
            "plantas_anp": len(near_plants), "plantas_produzindo": sum(map(producing, near_plants)),
            "plantas_nomes": "; ".join(p["planta"] for p in near_plants),
            "cap_anp_m3_dia": sum(p["cap_m3_dia"] for p in near_plants),
            "producao_anp_m3_dia": sum(p["atual_m3_dia"] for p in near_plants),
            "atlas_real_m3_dia": sum(sum(atlas.get(c, {}).values()) for c in near_supply) / 365,
            "cp2b_n3_m3_dia": None if cp2b is None else sum(
                lv["n3"] for c in near_supply for lv in cp2b.get(c, {}).values()) / 365,
        })
    return rows


def producing(p: dict) -> bool:
    return p["atual_m3_dia"] >= PRODUCING_M3_DAY


def nearest_plant(B, lat, lon, plant_list) -> tuple[dict | None, float]:
    producing_ = [p for p in plant_list if producing(p)]
    if not producing_:
        return None, math.inf
    best = min(producing_, key=lambda p: B.haversine_km(lat, lon, p["lat"], p["lon"]))
    return best, B.haversine_km(lat, lon, best["lat"], best["lon"])


def reading(rows: list[dict], tj: list[tuple], fleet_m3: float) -> list[str]:
    by_stations = sorted(rows, key=lambda r: -r["postos_gnv_fora_da_capital"])
    busy, quiet = by_stations[:2], [r for r in rows if r["postos_gnv_fora_da_capital"] <= 10]
    worst = max(rows, key=lambda r: r["postos_sem_planta_50km"])
    far = [t for t in tj if t[4] == 0]
    out = [
        f"1. **A demanda está na Grande SP e nos eixos {busy[0]['corredor']} e {busy[1]['corredor']}** "
        f"({busy[0]['postos_gnv_fora_da_capital']} e {busy[1]['postos_gnv_fora_da_capital']} postos fora da capital). "
        "Ali a oferta que já produz é gás de aterro e de esgoto da Grande SP.",
        "2. **No interior, a oferta existe e o posto não.** "
        + "; ".join(f"{r['corredor']}: {r['postos_gnv_fora_da_capital']} fora da capital e "
                    f"{fmt(r['atlas_real_m3_dia'] / 1e6, 1)} milhões de m³/dia no Atlas Real"
                    + ("" if r["cp2b_n3_m3_dia"] is None else f" ({fmt(r['cp2b_n3_m3_dia'] / 1e6, 1)} no CP2b N3)")
                    for r in quiet)
        + ". É onde um posto de biometano fora da rede (cana, vinhaça) teria matéria-prima e nenhum concorrente.",
        f"3. **Déficit: no {worst['corredor']}, {worst['postos_sem_planta_50km']} dos {worst['postos_gnv']} postos não "
        f"têm planta produzindo a {SUPPLY_KM} km.** "
        f"A frota da TransJordano pediria cerca de {fmt(fleet_m3 / 1e3)} mil m³/dia (ordem de grandeza)",
    ]
    if far:
        out[-1] += (", e " + " e ".join(t[0] for t in far) + f" não tem planta produzindo a {SUPPLY_KM} km "
                    f"(a mais próxima a {fmt(far[0][3])} km): o gás chega pela rede ou por caminhão.")
    else:
        out[-1] += "."
    return out


def fmt(x: float, d: int = 0) -> str:
    return f"{x:,.{d}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def main() -> None:
    M = load(C25, "sp_biolng_santos")
    B = load(M.RECONCILIATION, "biogram_reconciliation")
    mandate = load(M.SERVICE, "mandate_service")
    route = mandate.read(M.PARAMS_DIR)["troca_de_rota"]
    ch4_share = sum(route["fracao_ch4"]) / 2

    S = B.load_scenario_module()
    muns = B.municipalities()
    index = name_index()
    counts, n_stations = stations_by_municipality(index)
    plant_list = plants(M, ch4_share)
    atlas = B.atlas_real_by_municipality(S, muns)
    cp2b, cp2b_note = B.cp2b_by_municipality()
    roads = load_roads()
    geoms = geometries(muns, index, roads)
    rows = corridor_rows(B, M, muns, index, counts, plant_list, atlas, cp2b, geoms)
    truck = truck_m3_day(M)

    with NAMES.open(encoding="utf-8-sig") as fh:
        pretty = {r["ibge_code"].strip(): r["municipality_name"] for r in csv.DictReader(fh)}
    by_mun = []
    for code, n in counts.most_common():
        m = muns[code]
        best, dist = nearest_plant(B, m["lat"], m["lon"], plant_list)
        by_mun.append({
            "ibge_code": code, "municipio": pretty[code], "postos_gnv": n,
            "planta_mais_proxima": best["planta"] if best else "", "distancia_km": round(dist, 1),
            "producao_anp_50km_m3_dia": round(sum(
                p["atual_m3_dia"] for p in plant_list
                if producing(p) and B.haversine_km(m["lat"], m["lon"], p["lat"], p["lon"]) <= SUPPLY_KM)),
        })

    OUT.mkdir(parents=True, exist_ok=True)
    with (OUT / "corredores.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows({k: ("" if v is None else round(v) if isinstance(v, float) else v) for k, v in r.items()}
                    for r in rows)
    with (OUT / "postos_por_municipio.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(by_mun[0]))
        w.writeheader()
        w.writerows(by_mun)

    tj = []
    for name in TRANSJORDANO:
        m = muns[index[norm(name)]]
        best, dist = nearest_plant(B, m["lat"], m["lon"], plant_list)
        near_m3 = sum(p["atual_m3_dia"] for p in plant_list
                      if producing(p) and B.haversine_km(m["lat"], m["lon"], p["lat"], p["lon"]) <= SUPPLY_KM)
        tj.append((name, counts.get(index[norm(name)], 0), best, dist, near_m3))

    on_any = {c for c in counts if any(near((muns[c]["lat"], muns[c]["lon"]), parts, STATION_KM)
                                       for parts in geoms.values())}
    geometry_note = (
        f"Corredor = trechos das rodovias na camada viária da plataforma (MapBiomas 10.1 INFRAESTRUTURA, "
        f"{len(roads)} trechos exportados), ao longo da linha entre os municípios-âncora (a até {ANCHOR_KM} km dela)"
        if roads is not None else
        "Corredor = linha pelos centroides dos municípios-âncora (trechos retos; sem o export da malha viária)")
    stations_on_any = sum(counts[c] for c in on_any)
    with STATIONS.open(encoding="utf-8") as fh:
        last_collection = max(r["ultima_coleta"] for r in csv.DictReader(fh))
    fleet_m3 = TRANSJORDANO_TRUCKS * truck

    L = [
        "# Corredores verdes: postos de GNV, oferta e déficit",
        "",
        "Gerado por `analysis/build_sp_green_corridors.py`. Estratégia 2027, rodada 2 (C24). "
        f"Postos: pesquisa de preços da ANP, {n_stations} postos de GNV em SP com coleta entre jan/2025 e "
        f"jun/2026 (última coleta mais recente: {last_collection}). A pesquisa é amostral: é um piso, não o cadastro.",
        "",
        f"{geometry_note}. Posto entra no corredor se o "
        f"município está a até {STATION_KM} km da rodovia; planta e Atlas Real, a até {SUPPLY_KM} km. Produção ANP "
        f"atual = biogás processado no último mês × {fmt(100 * ch4_share)} % de CH₄; conta como oferta a planta "
        f"que entrega pelo menos {fmt(PRODUCING_M3_DAY)} m³/dia. CP2b N3: {cp2b_note}.",
        "",
        "## 1. Por corredor",
        "",
        "| Corredor | Extensão (trechos da via) | Postos GNV (fora da capital) | Sem planta produzindo a 50 km | Plantas ANP (produzindo) | "
        "Capacidade ANP | Produção ANP | Atlas Real | CP2b N3 |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for r in rows:
        n3 = "—" if r["cp2b_n3_m3_dia"] is None else fmt(r["cp2b_n3_m3_dia"])
        L.append(f"| {r['corredor']} ({r['rodovias']}) | {fmt(r['extensao_km'])} km ({r['trechos_via']}) | {r['postos_gnv']} ({r['postos_gnv_fora_da_capital']}) | "
                 f"{r['postos_sem_planta_50km']} | {r['plantas_anp']} ({r['plantas_produzindo']}) | {fmt(r['cap_anp_m3_dia'])} | "
                 f"{fmt(r['producao_anp_m3_dia'])} | {fmt(r['atlas_real_m3_dia'])} | {n3} |")
    L += [
        "",
        "Volumes em m³ de CH₄ por dia. Um posto pode estar em mais de um corredor (a capital está em quatro).",
        "",
        "Âncoras: " + "; ".join(f"{k}: {v[1][0]} → {v[1][-1]} ({len(v[1])} municípios)" for k, v in CORRIDORS.items())
        + ". Lista completa em `corredores.csv`.",
        "",
        "## 2. Postos da TransJordano",
        "",
        "| Posto | Postos GNV na pesquisa ANP | Planta em operação mais próxima | Distância | Produção ANP a 50 km |",
        "|---|---:|---|---:|---:|",
    ]
    for name, n, best, dist, near_m3 in tj:
        L.append(f"| {name} | {n} | {best['planta'] if best else '—'} | {fmt(dist)} km | {fmt(near_m3)} |")
    L += [
        "",
        f"Ordem de grandeza da frota: {TRANSJORDANO_TRUCKS} caminhões × {fmt(truck)} m³/dia "
        f"({fmt(TRUCK_KG_100KM)} kg/100 km, {TRUCK_KM_DAY} km/dia, ambos suposição) ≈ {fmt(fleet_m3)} m³/dia.",
        "",
        "## 3. Municípios com mais postos",
        "",
        "| Município | Postos GNV | Planta em operação mais próxima | Distância | Produção ANP a 50 km |",
        "|---|---:|---|---:|---:|",
        *[f"| {r['municipio']} | {r['postos_gnv']} | {r['planta_mais_proxima']} | {fmt(r['distancia_km'])} km | "
          f"{fmt(r['producao_anp_50km_m3_dia'])} |" for r in by_mun[:12]],
        "",
        f"{stations_on_any} dos {n_stations} postos ({fmt(100 * stations_on_any / n_stations)} %) estão em algum dos "
        f"{len(CORRIDORS)} corredores.",
        "",
        "## Leitura",
        "",
        *reading(rows, tj, fleet_m3),
        "",
        "## Limites",
        "",
        "- Pesquisa de preços amostral: municípios fora da amostra da ANP aparecem sem posto. Postos novos de "
        "biometano (TransJordano) não constam. Complementar com a lista de postos GNV da Comgás.",
        "- Posto no centroide do município; distâncias em linha reta até a rodovia. A extensão é a da linha "
        "entre as âncoras, não a da via (pistas duplas contariam duas vezes). "
        "As plantas da capital (Metagás) também estão no centroide, por isso a distância 0 km.",
        "- Proximidade importa para biometano entregue por caminhão (gasoduto virtual). Planta injetada na rede "
        "da Comgás pode atender um posto ligado à rede a qualquer distância, por contrato (TUSD-Verde).",
        "- Consumo do caminhão: um registro europeu, sem medição brasileira publicada.",
        "",
        "Fontes: " + "; ".join(f"[{k}]({u})" for k, u in SOURCES.items()) + ".",
        "",
    ]
    (OUT / "RELATORIO.md").write_text("\n".join(L), encoding="utf-8")
    print("\n".join(L))


if __name__ == "__main__":
    main()
