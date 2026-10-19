#!/usr/bin/env python3
"""
C16, reconciliação BioGRAM × PILAR: o lado PILAR e o molde para o lado BioGRAM.

Round-2 idea C16: draw the same areas in the IEA BioGRAM tool (the state, its 11
intermediate geographic regions and the 30 largest sites of the Mapa de
Oportunidades), compare feedstock by feedstock, and publish the table of
differences with the cause of each one (parâmetro, disponibilidade, escopo).

BioGRAM is an interactive web tool with no API this repository can call, so the
work splits in two:

  1. This script computes the PILAR values for every area × feedstock category
     and writes the areas as GeoJSON, ready to draw or upload in BioGRAM.
  2. Someone reads BioGRAM for the same areas and types the values into
     analysis/data/07_biogram_sp_seed.csv (the script creates it, and never
     overwrites a value already typed). Run again: the script converts units,
     compares and pre-classifies each difference.

PILAR sources, always as Nm³ CH4/yr:

  atlas   Atlas-FDE Cenário Real, computed with backend/scripts/sp_scenarios_real_ideal.py
          per municipality. Its seven "outros" flows exist only as state totals
          there; they are spread over municipalities in proportion to the GWh
          columns of analysis/data/02_* (an allocation, flagged as such).
  cp2b    CP2b v5.1 N1–N4, scenario med, read from the checksum-gated snapshot
          the loader uses (backend/data/raw/cp2b_potential/2026/, gitignored).
          If the snapshot is absent the CP2b columns stay empty and the causes
          cannot be told apart beyond "escopo".

Areas and the MAUP rule: a municipality belongs to an area when its centroid
does. Regions come from the IBGE code on each municipality; a site is a circle
of SITE_RADIUS_KM around the site's municipal centroid. The same rule has to be
used when the area is drawn in BioGRAM, or the comparison mixes geographies.

Cause pre-classification (a first pass, to be confirmed by a person):

  escopo           BioGRAM excludes the category, or PILAR has zero where BioGRAM
                   has a value.
  concorda         BioGRAM within ±AGREE_TOL of the reference level (CP2b N3,
                   the mobilisable headline; Atlas Real without the snapshot).
  disponibilidade  BioGRAM is nearest to N1 or N2: it does not take out the
                   collection, availability or competing-use shares that N3 does.
  parâmetro        nearest to N3 or N4 but outside the tolerance: the yields
                   or conversion factors differ.

Run from the repo root:
  python3 analysis/build_biogram_reconciliation.py

Outputs (analysis/outputs/biogram_reconciliation/):
  areas.geojson        1 state + 11 regions + 30 site circles
  pilar_por_area.csv   area × category, Atlas Real and CP2b N1–N4
  reconciliacao.csv    the same rows with BioGRAM, ratio and pre-classified cause
  RELATORIO.md         summary
"""

from __future__ import annotations

import ast
import csv
import hashlib
import importlib.util
import json
import math
import os
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NEWLOOK = ROOT / "cp2b-workspace" / "NewLook"
SCEN = NEWLOOK / "backend" / "scripts" / "sp_scenarios_real_ideal.py"
CP2B_LOADER = NEWLOOK / "backend" / "scripts" / "load_cp2b_potential.py"
CP2B_SNAPSHOT = Path(os.environ.get(
    "CP2B_SNAPSHOT_DIR", NEWLOOK / "backend" / "data" / "raw" / "cp2b_potential" / "2026"))
MASTER = NEWLOOK / "data" / "canonical_parameters" / "SP_master_residue_streams_2023_FINAL.csv"
SUMMARY = ROOT / "analysis" / "data" / "02_municipality_summary_SP_2023.csv"
REGIONS_GEOJSON = NEWLOOK / "frontend" / "public" / "data" / "br_intermediary_regions.geojson"
SITES = ROOT / "analysis" / "outputs" / "sp_opportunity_sites" / "sites.csv"
SEED = ROOT / "analysis" / "data" / "07_biogram_sp_seed.csv"
OUT = ROOT / "analysis" / "outputs" / "biogram_reconciliation"

SITE_RADIUS_KM = 30.0  # straight line; draw the same circle in BioGRAM
TOP_SITES = 30
AGREE_TOL = 0.25  # ±25 % around the reference level counts as agreement
EARTH_R_KM = 6371.0

# BioGRAM-facing category -> (CP2b substrates, Atlas Real flows). Sugarcane is
# split because straw and vinasse/filter cake are where the big parameter
# disputes are; if BioGRAM only reports "cana", type it in the "total" row.
CATEGORIES = {
    "palha_cana": (("PALHA", "BAGACO"), ("palha de cana",)),
    "vinhaca_torta": (("VINHACA", "TORTA_FILTRO"), ("vinhaça", "torta de filtro")),
    "outras_culturas": (("PALHA_MILHO", "PALHA_SOJA", "BAGACO_CITROS", "CASCA_CAFE"),
                        ("milho", "soja", "citros", "cafe")),
    "dejetos_animais": (("AVES_CORTE", "AVES_POSTURA", "BOV_LEITE", "BOV_CONFINADO",
                         "BOV_PASTO_MISTO", "SUINOS"),
                        ("bovinos", "suínos", "aves", "aquicultura")),
    "rsu_organico": (("RSU_ORGANICO",), ("RSU (FORSU)",)),
    "esgoto": (("LODO_ETE",), ("esgoto (ETE)",)),
    "lenhosos": (("PODA_URBANA",), ("silvicultura", "poda_urbana")),
}
TOTAL = "total"
ALL_CATEGORIES = (*CATEGORIES, TOTAL)

# Atlas "outros" flow -> analysis/data/02_* column used to spread its state total
OUTROS_WEIGHT = {
    "milho": "GWh_corn",
    "soja": "GWh_soybean",
    "citros": "GWh_citrus",
    "cafe": "GWh_coffee",
    "silvicultura": "GWh_forestry",
    "poda_urbana": "GWh_rpo_pruning",
    "aquicultura": "GWh_aquaculture",
}

LEVELS = ("n1", "n2", "n3", "n4")
REFERENCE_LEVEL = "n3"

SEED_COLUMNS = [
    "area_id", "area_tipo", "area_nome", "categoria", "prioridade",
    "biogram_valor", "biogram_unidade", "biogram_categorias_origem",
    "escopo_biogram", "data_consulta", "versao_biogram", "notas",
]


def load_scenario_module():
    spec = importlib.util.spec_from_file_location("sp_scen", SCEN)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def loader_constant(name: str):
    """Read a literal from load_cp2b_potential.py without importing it (it needs a DB driver)."""
    tree = ast.parse(CP2B_LOADER.read_text(encoding="utf-8"))
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == name for t in node.targets):
            return ast.literal_eval(node.value)
    raise RuntimeError(f"{name} not found in load_cp2b_potential.py")


# ── Units ────────────────────────────────────────────────────────────────────

def nm3_per_unit(unit: str, lhv_kwh_m3: float) -> float:
    """Nm³ CH4/yr per one unit of what BioGRAM reports. Energy units use the PILAR LHV."""
    j_per_nm3 = lhv_kwh_m3 * 3.6e6
    energy_j = {
        "PJ_ano": 1e15,
        "TJ_ano": 1e12,
        "GWh_ano": 3.6e12,
        "ktoe_ano": 41.868e12,
        "Mtoe_ano": 41.868e15,
        "bcme_ano": 36e15,  # IEA: 1 bcm of natural gas equivalent = 36 PJ
    }
    volume = {"Nm3_ch4_ano": 1.0, "mi_Nm3_ch4_ano": 1e6, "bi_Nm3_ch4_ano": 1e9}
    if unit in volume:
        return volume[unit]
    if unit in energy_j:
        return energy_j[unit] / j_per_nm3
    raise ValueError(f"unidade desconhecida {unit!r}; use uma de {sorted(volume) + sorted(energy_j)}")


# ── PILAR supply per municipality ────────────────────────────────────────────

def municipalities() -> dict[str, dict]:
    """ibge -> name, centroid, region code/name, 02_* row."""
    out = {}
    with SUMMARY.open(encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            out[r["ibge_code"].strip()] = {
                "lat": float(r["lat"]), "lon": float(r["lon"]),
                "cd_rgint": r["cd_rgint"].strip(), "nm_rgint": r["nm_rgint"].strip(), "row": r,
            }
    return out


def atlas_real_by_municipality(S, muns: dict[str, dict]) -> dict[str, dict[str, float]]:
    """ibge -> category -> Nm³ CH4/yr, Atlas-FDE Cenário Real."""
    rows = list(csv.DictReader(MASTER.open(encoding="utf-8-sig")))
    flow_cat = {f: c for c, (_, flows) in CATEGORIES.items() for f in flows}
    state_outros = S.calcular(rows, "real")
    weights = {f: {code: float(m["row"][col] or 0) for code, m in muns.items()} for f, col in OUTROS_WEIGHT.items()}
    wsum = {f: sum(w.values()) for f, w in weights.items()}

    out: dict[str, dict[str, float]] = {}
    for r in rows:
        code = r["CD_GEOCODI"].strip()
        vals = defaultdict(float)
        for flow, v in S.calcular([r], "real").items():
            if flow in OUTROS_WEIGHT:
                share = weights[flow].get(code, 0.0) / wsum[flow] if wsum[flow] else 0.0
                v = state_outros[flow] * share
            vals[flow_cat[flow]] += v
        out[code] = dict(vals)
    return out


def cp2b_by_municipality() -> tuple[dict[str, dict[str, dict[str, float]]] | None, str]:
    """ibge -> category -> level -> Nm³ CH4/yr (scenario med), or None with the reason."""
    files = loader_constant("FILES")
    expected = loader_constant("EXPECTED_SHA256")
    path = CP2B_SNAPSHOT / files["levels"]
    if not path.exists():
        return None, f"snapshot CP2b ausente ({path.relative_to(ROOT) if path.is_relative_to(ROOT) else path})"
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != expected["levels"]:
        return None, f"snapshot CP2b com checksum diferente do v5.1 ({digest[:12]}…), recusado"
    sub_cat = {s: c for c, (subs, _) in CATEGORIES.items() for s in subs}
    out: dict[str, dict[str, dict[str, float]]] = defaultdict(lambda: defaultdict(lambda: dict.fromkeys(LEVELS, 0.0)))
    with path.open(encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            if r["scenario"] != "med":
                continue
            cell = out[str(int(float(r["ibge_code"])))][sub_cat[r["substrate"]]]
            for lv in LEVELS:
                cell[lv] += float(r[f"{lv}_ch4_nm3_year"] or 0)
    return out, "CP2b v5.1, cenário med"


# ── Areas ────────────────────────────────────────────────────────────────────

def haversine_km(lat1, lon1, lat2, lon2) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    h = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    return 2 * EARTH_R_KM * math.asin(math.sqrt(min(1.0, h)))


def circle(lat: float, lon: float, radius_km: float, n: int = 64) -> list[list[float]]:
    ring = []
    for i in range(n + 1):
        a = 2 * math.pi * i / n
        dlat = radius_km / EARTH_R_KM * math.cos(a)
        dlon = radius_km / (EARTH_R_KM * math.cos(math.radians(lat))) * math.sin(a)
        ring.append([round(lon + math.degrees(dlon), 5), round(lat + math.degrees(dlat), 5)])
    return ring


def build_areas(muns: dict[str, dict]) -> list[dict]:
    """[{id, tipo, nome, prioridade, members, geometry}] — state, regions, top sites."""
    gj = json.loads(REGIONS_GEOJSON.read_text(encoding="utf-8"))
    sp = sorted((f for f in gj["features"] if f["properties"]["cd_uf"] == "35"),
                key=lambda f: f["properties"]["cd_rgint"])
    polys = []
    for f in sp:
        g = f["geometry"]
        polys += [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]

    areas = [{"id": "SP", "tipo": "estado", "nome": "São Paulo", "prioridade": 1,
              "members": set(muns), "geometry": {"type": "MultiPolygon", "coordinates": polys}}]
    for f in sp:
        cd, nm = f["properties"]["cd_rgint"], f["properties"]["nm_rgint"]
        areas.append({"id": f"RGINT-{cd}", "tipo": "regiao_intermediaria", "nome": nm, "prioridade": 2,
                      "members": {c for c, m in muns.items() if m["cd_rgint"] == cd},
                      "geometry": f["geometry"]})
    with SITES.open(encoding="utf-8") as fh:
        sites = [r for r in csv.DictReader(fh)][:TOP_SITES]
    for r in sites:
        la, lo = float(r["lat"]), float(r["lon"])
        areas.append({
            "id": f"SITIO-{int(r['rank']):02d}", "tipo": "sitio", "prioridade": 3,
            "nome": f"{r['municipio']} (raio {SITE_RADIUS_KM:.0f} km)",
            "members": {c for c, m in muns.items() if haversine_km(la, lo, m["lat"], m["lon"]) <= SITE_RADIUS_KM},
            "geometry": {"type": "Polygon", "coordinates": [circle(la, lo, SITE_RADIUS_KM)]},
        })
    return areas


def aggregate(members, atlas, cp2b) -> dict[str, dict[str, float | None]]:
    """category -> {'atlas': v, 'n1'..'n4': v or None}, with a 'total' row."""
    res = {}
    for cat in CATEGORIES:
        row = {"atlas": sum(atlas.get(m, {}).get(cat, 0.0) for m in members)}
        for lv in LEVELS:
            row[lv] = None if cp2b is None else sum(cp2b[m][cat][lv] for m in members if m in cp2b)
        res[cat] = row
    res[TOTAL] = {k: (None if any(res[c][k] is None for c in CATEGORIES) else sum(res[c][k] for c in CATEGORIES))
                  for k in ("atlas", *LEVELS)}
    return res


# ── BioGRAM side ─────────────────────────────────────────────────────────────

def sync_seed(areas: list[dict]) -> list[dict]:
    """Create or extend the BioGRAM entry sheet; values already typed are kept."""
    existing = {}
    if SEED.exists():
        with SEED.open(encoding="utf-8") as fh:
            existing = {(r["area_id"], r["categoria"]): r for r in csv.DictReader(fh)}
    rows = []
    for a in areas:
        for cat in ALL_CATEGORIES:
            r = existing.get((a["id"], cat)) or dict.fromkeys(SEED_COLUMNS, "")
            r.update(area_id=a["id"], area_tipo=a["tipo"], area_nome=a["nome"], categoria=cat,
                     prioridade=str(a["prioridade"]))
            rows.append({k: r.get(k, "") for k in SEED_COLUMNS})
    SEED.parent.mkdir(parents=True, exist_ok=True)
    with SEED.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=SEED_COLUMNS)
        w.writeheader()
        w.writerows(rows)
    return rows


def classify(biogram: float | None, pilar: dict[str, float | None], escopo: str = "",
             tol: float = AGREE_TOL) -> str:
    if escopo.strip().lower() in ("excluido", "excluído"):
        return "escopo"
    if biogram is None:
        return "sem dado BioGRAM"
    have_cp2b = pilar.get(REFERENCE_LEVEL) is not None
    ref = pilar[REFERENCE_LEVEL] if have_cp2b else pilar["atlas"]
    if not ref:
        return "concorda" if not biogram else "escopo"
    if biogram <= 0:
        return "escopo"
    if abs(math.log(biogram / ref)) <= math.log1p(tol):
        return "concorda"
    if not have_cp2b:
        return "parâmetro ou disponibilidade (sem CP2b)"
    levels = {lv: pilar[lv] for lv in LEVELS if pilar[lv]}
    nearest = min(levels, key=lambda lv: abs(math.log(biogram / levels[lv])))
    return "disponibilidade" if nearest in ("n1", "n2") else "parâmetro"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    S = load_scenario_module()
    muns = municipalities()
    atlas = atlas_real_by_municipality(S, muns)
    cp2b, cp2b_note = cp2b_by_municipality()
    areas = build_areas(muns)
    seed = {(r["area_id"], r["categoria"]): r for r in sync_seed(areas)}

    features = [{"type": "Feature", "geometry": a["geometry"],
                 "properties": {"area_id": a["id"], "tipo": a["tipo"], "nome": a["nome"],
                                "n_municipios": len(a["members"])}} for a in areas]
    (OUT / "areas.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": features},
                                                  ensure_ascii=False), encoding="utf-8")

    fmt = lambda v: "" if v is None else f"{v:.0f}"
    recon, counts, filled = [], defaultdict(int), 0
    with (OUT / "pilar_por_area.csv").open("w", newline="", encoding="utf-8") as fp, \
         (OUT / "reconciliacao.csv").open("w", newline="", encoding="utf-8") as fr:
        wp, wr = csv.writer(fp), csv.writer(fr)
        head = ["area_id", "area_tipo", "area_nome", "n_municipios", "categoria",
                "atlas_real_nm3_ano", *(f"cp2b_{lv}_nm3_ano" for lv in LEVELS)]
        wp.writerow(head)
        wr.writerow(head + ["biogram_nm3_ano", f"razao_biogram_{REFERENCE_LEVEL if cp2b else 'atlas'}",
                            "causa_preclassificada", "notas"])
        for a in areas:
            agg = aggregate(a["members"], atlas, cp2b)
            for cat in ALL_CATEGORIES:
                p = agg[cat]
                base = [a["id"], a["tipo"], a["nome"], len(a["members"]), cat,
                        fmt(p["atlas"]), *(fmt(p[lv]) for lv in LEVELS)]
                wp.writerow(base)
                s = seed[(a["id"], cat)]
                bg = None
                if s["biogram_valor"].strip():
                    bg = float(s["biogram_valor"].replace(",", ".")) * nm3_per_unit(
                        s["biogram_unidade"].strip(), S.CH4_LHV_KWH_M3)
                    filled += 1
                cause = classify(bg, p, s["escopo_biogram"])
                ref = p[REFERENCE_LEVEL] if cp2b else p["atlas"]
                ratio = f"{bg / ref:.2f}" if bg is not None and ref else ""
                wr.writerow(base + [fmt(bg), ratio, cause, s["notas"]])
                counts[cause] += 1
                recon.append((a, cat, p, bg, cause))

    state = next(r for r in recon if r[0]["id"] == "SP" and r[1] == TOTAL)[2]
    state_rows = [r for r in recon if r[0]["id"] == "SP"]
    lines = [
        "# C16, reconciliação BioGRAM × PILAR",
        "",
        "> Gerado por `analysis/build_biogram_reconciliation.py`. O lado PILAR é calculado;",
        "> o lado BioGRAM é digitado em `analysis/data/07_biogram_sp_seed.csv`.",
        "",
        f"- Áreas: 1 estado, 11 regiões intermediárias, {TOP_SITES} sítios (círculos de {SITE_RADIUS_KM:.0f} km"
        " no centróide do município-sede). Município entra na área pelo centróide.",
        f"- Atlas-FDE Cenário Real, SP: {state['atlas'] / 1e9:.2f} bi Nm³ CH₄/ano.",
        f"- CP2b: {cp2b_note}."
        + (f" N3 {state['n3'] / 1e9:.2f}, N4 {state['n4'] / 1e9:.2f} bi Nm³ CH₄/ano." if cp2b else ""),
        f"- Valores BioGRAM digitados: **{filled}** de {len(recon)} linhas.",
        "",
        "## Estado de São Paulo",
        "",
        "| Categoria | Atlas Real | CP2b N3 | CP2b N4 | BioGRAM | Causa |",
        "|---|---:|---:|---:|---:|---|",
    ]
    mi = lambda v: "—" if v is None else f"{v / 1e6:,.0f}"
    for a, cat, p, bg, cause in state_rows:
        lines.append(f"| {cat} | {mi(p['atlas'])} | {mi(p['n3'])} | {mi(p['n4'])} | {mi(bg)} | {cause} |")
    lines += [
        "",
        "Valores em milhões de Nm³ CH₄/ano.",
        "",
        "## Causas pré-classificadas (todas as linhas)",
        "",
        "| Causa | Linhas |",
        "|---|---:|",
        *(f"| {k} | {v} |" for k, v in sorted(counts.items(), key=lambda x: -x[1])),
        "",
        "## Como preencher o lado BioGRAM",
        "",
        "1. Abrir `areas.geojson` (QGIS ou geojson.io) e desenhar cada área no BioGRAM, começando pela",
        "   prioridade 1 (estado), depois 2 (regiões) e 3 (sítios).",
        "2. Para cada categoria, digitar valor e unidade (`PJ_ano`, `TJ_ano`, `GWh_ano`, `ktoe_ano`,",
        "   `Mtoe_ano`, `bcme_ano`, `Nm3_ch4_ano`, `mi_Nm3_ch4_ano`, `bi_Nm3_ch4_ano`), as categorias",
        "   BioGRAM somadas em `biogram_categorias_origem`, a data e a versão da ferramenta.",
        "3. Se o BioGRAM não cobre a categoria, `escopo_biogram = excluido`. Se só dá o total, use a linha `total`.",
        "4. Rodar o script de novo. A causa é uma primeira leitura: confirmar cada uma antes de publicar.",
        "",
        "## Limites",
        "",
        f"- A referência é o CP2b {REFERENCE_LEVEL.upper()} (mobilizável). Sem o snapshot CP2b, só o Atlas Real,",
        "  e parâmetro e disponibilidade não se distinguem.",
        "- Os sete fluxos \"outros\" do Atlas são totais estaduais espalhados pelos municípios na proporção",
        "  do GWh técnico de `02_*`: rateio, não dado municipal.",
        f"- Tolerância de concordância ±{100 * AGREE_TOL:.0f} %; o vizinho mais próximo entre N1–N4 em escala log",
        "  decide entre disponibilidade e parâmetro.",
        "- Energia ↔ volume pelo PCI do PILAR "
        f"({S.CH4_LHV_KWH_M3} kWh/Nm³); bcme pela convenção IEA de 36 PJ/bcm.",
    ]
    (OUT / "RELATORIO.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
