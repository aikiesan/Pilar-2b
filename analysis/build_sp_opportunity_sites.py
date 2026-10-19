#!/usr/bin/env python3
"""
Mapa de Oportunidades, protótipo: onde caberiam plantas de biometano em SP?

Strategy 2027 §3.2 proposes turning the potential atlas into a siting tool. This
prototype does the smallest honest version of that with data already in the
repository:

  supply   per municipality, the Cenário Real (Atlas-FDE) flows that come from
           municipal data — computed with backend/scripts/sp_scenarios_real_ideal.py
           itself, one municipality at a time. The seven "outros" flows (corn,
           soy, forestry, citrus, coffee, pruning, aquaculture) exist only as
           state totals in that script and are left out (~20% of the Real).
  distance great-circle between municipal centroids × a road tortuosity factor.
  capture  each flow has a maximum haul radius (CAPTURE_RADIUS_KM). Vinasse,
           filter cake and sewage are processed where they arise (radius 0:
           only a plant in the same municipality captures them).
  siting   greedy maximal covering: repeatedly open the candidate (a municipal
           centroid) that captures the most still-unassigned methane, until the
           best remaining candidate falls below MIN_SITE_NM3_DAY — a typical
           floor for a biomethane upgrading project.

Every number here is a screening estimate. The radii and the tortuosity are
assumptions, flagged as such; the real version uses road-network travel cost
(OSRM) on an H3 grid and a capacitated p-median, as the strategy describes.

Validation hook: the script lists which municipalities with an ANP-authorised
biomethane plant (analysis/data/05c_*) fall on or within 30 km of a selected site.

Run from the repo root:
  python3 analysis/build_sp_opportunity_sites.py

Outputs (analysis/outputs/sp_opportunity_sites/):
  sites.csv      one row per selected site
  RELATORIO.md   summary
"""

from __future__ import annotations

import csv
import importlib.util
import unicodedata
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
NEWLOOK = ROOT / "cp2b-workspace" / "NewLook"
SCEN = NEWLOOK / "backend" / "scripts" / "sp_scenarios_real_ideal.py"
MASTER = NEWLOOK / "data" / "canonical_parameters" / "SP_master_residue_streams_2023_FINAL.csv"
COORDS = ROOT / "analysis" / "data" / "01_master_residue_streams_SP_2023.csv"
ANP_PLANTS = ROOT / "analysis" / "data" / "05c_anp_biometano_plants_latest.csv"
OUT = ROOT / "analysis" / "outputs" / "sp_opportunity_sites"

# Assumptions (to be replaced by road-network cost curves) --------------------
TORTUOSITY = 1.3  # road km per straight-line km
CAPTURE_RADIUS_KM = {
    "vinhaça": 0.0,  # processed at the mill
    "torta de filtro": 0.0,  # idem
    "esgoto (ETE)": 0.0,  # at the treatment plant
    "palha de cana": 30.0,  # baled straw
    "bovinos": 15.0,  # liquid/semi-solid manure
    "suínos": 15.0,  # slurry
    "aves": 30.0,  # litter, solid
    "RSU (FORSU)": 50.0,  # already trucked to transfer stations / landfills
}
MIN_SITE_NM3_DAY = 15_000.0  # CH4; floor for an upgrading project
VALIDATION_RADIUS_KM = 30.0
TOP_N = 30
EARTH_R_KM = 6371.0


def load_scenario_module():
    spec = importlib.util.spec_from_file_location("sp_scen", SCEN)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def norm(name: str) -> str:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().upper()
    return " ".join(s.replace("'", " ").replace("-", " ").split())


def municipal_supply(S) -> tuple[list[str], np.ndarray, list[str]]:
    """Return (ibge codes, supply matrix [n_mun, n_flow] in Nm³ CH4/yr, flow names)."""
    rows = list(csv.DictReader(MASTER.open(encoding="utf-8-sig")))
    flows = list(CAPTURE_RADIUS_KM)
    codes, mat = [], []
    for r in rows:
        out = S.calcular([r], "real")
        codes.append(r["CD_GEOCODI"].strip())
        mat.append([out[f] for f in flows])
    return codes, np.array(mat), flows


def coordinates() -> dict[str, tuple[str, float, float, str]]:
    """ibge -> (name, lat, lon, rgint) from the SP analysis master (long format)."""
    out = {}
    with COORDS.open(encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            out.setdefault(r["ibge_code"].strip(),
                           (r["municipality_name"], float(r["lat"]), float(r["lon"]), r["cd_rgint"]))
    return out


def road_km(lat: np.ndarray, lon: np.ndarray) -> np.ndarray:
    la, lo = np.radians(lat), np.radians(lon)
    dlat = la[:, None] - la[None, :]
    dlon = lo[:, None] - lo[None, :]
    h = np.sin(dlat / 2) ** 2 + np.cos(la[:, None]) * np.cos(la[None, :]) * np.sin(dlon / 2) ** 2
    return 2 * EARTH_R_KM * np.arcsin(np.sqrt(np.clip(h, 0, 1))) * TORTUOSITY


def greedy_sites(supply: np.ndarray, dist: np.ndarray, radii: np.ndarray):
    """Greedy maximal covering. Returns list of (site_idx, captured[n_flow], members mask)."""
    n, k = supply.shape
    remaining = supply.copy()
    # reach[f][c, m] — candidate c captures flow f of municipality m
    reach = [(dist <= r) if r > 0 else np.eye(n, dtype=bool) for r in radii]
    sites = []
    while True:
        gain = sum(reach[f].astype(float) @ remaining[:, f] for f in range(k))  # per candidate, Nm³/yr
        c = int(np.argmax(gain))
        if gain[c] / 365 < MIN_SITE_NM3_DAY:
            break
        captured = np.zeros(k)
        members = np.zeros(n, dtype=bool)
        for f in range(k):
            m = reach[f][c] & (remaining[:, f] > 0)
            captured[f] = remaining[m, f].sum()
            members |= m
            remaining[m, f] = 0.0
        sites.append((c, captured, members))
    return sites, remaining


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    S = load_scenario_module()
    codes, supply, flows = municipal_supply(S)
    coords = coordinates()
    missing = [c for c in codes if c not in coords]
    assert not missing, f"no coordinates for {missing[:5]}"
    lat = np.array([coords[c][1] for c in codes])
    lon = np.array([coords[c][2] for c in codes])
    dist = road_km(lat, lon)
    radii = np.array([CAPTURE_RADIUS_KM[f] for f in flows])

    sites, remaining = greedy_sites(supply, dist, radii)

    # Existing ANP-authorised plants (latest month), matched by municipality name
    anp = list(csv.DictReader(ANP_PLANTS.open(encoding="utf-8")))
    latest = max(anp, key=lambda r: (r["mesano"][3:], r["mesano"][:2]))["mesano"]
    by_name = {norm(coords[c][0]): i for i, c in enumerate(codes)}
    plants = [(r["razao_social"], r["municipio"]) for r in anp if r["uf"] == "SP" and r["mesano"] == latest]
    site_idx = np.array([s[0] for s in sites])

    with (OUT / "sites.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["rank", "ibge", "municipio", "cd_rgint", "lat", "lon", "ch4_nm3_dia",
                    "n_municipios_contribuintes", "fluxo_dominante", "pct_fluxo_dominante"]
                   + [f"ch4_nm3_dia_{f}" for f in flows])
        for rank, (c, cap, members) in enumerate(sites, 1):
            name, la, lo, rg = coords[codes[c]]
            tot = cap.sum()
            dom = int(np.argmax(cap))
            w.writerow([rank, codes[c], name, rg, f"{la:.5f}", f"{lo:.5f}", round(tot / 365),
                        int(members.sum()), flows[dom], f"{100 * cap[dom] / tot:.0f}"]
                       + [round(v / 365) for v in cap])

    total_supply = supply.sum()
    captured_total = sum(s[1].sum() for s in sites)
    sizes = np.array([s[1].sum() / 365 for s in sites])
    dom_counts: dict[str, int] = {}
    for _, cap, _ in sites:
        dom_counts[flows[int(np.argmax(cap))]] = dom_counts.get(flows[int(np.argmax(cap))], 0) + 1

    # A hit only means something against a null: the share of ALL municipalities
    # that are that close to a site anyway. Checked for every site and for the
    # TOP_N largest, where the null is much lower.
    top_idx = site_idx[:TOP_N]
    null_all = float((dist[:, site_idx].min(axis=1) <= VALIDATION_RADIUS_KM).mean())
    null_top = float((dist[:, top_idx].min(axis=1) <= VALIDATION_RADIUS_KM).mean())
    val_lines = []
    hits = hits_top = matched = 0
    for operator, mun in plants:
        i = by_name.get(norm(mun))
        if i is None:
            val_lines.append(f"| {operator} | {mun} | município não encontrado | — | — |")
            continue
        matched += 1
        d = dist[i, site_idx].min()
        d_top = dist[i, top_idx].min()
        hits += d <= VALIDATION_RADIUS_KM
        hits_top += d_top <= VALIDATION_RADIUS_KM
        val_lines.append(f"| {operator} | {coords[codes[i]][0]} | {d:.0f} km | {d_top:.0f} km |")

    lines = [
        "# Mapa de Oportunidades de SP: protótipo de localização de plantas",
        "",
        "> Gerado por `analysis/build_sp_opportunity_sites.py`. Triagem, não estudo de viabilidade:",
        "> raios de captação e tortuosidade são **suposições** declaradas no topo do script.",
        "",
        f"- Oferta considerada: {total_supply / 1e9:.2f} bi Nm³ CH₄/ano, os 8 fluxos do Cenário Real",
        "  (Atlas-FDE) com dado municipal. Ficam de fora os fluxos que o script de cenários só tem como total estadual.",
        f"- Corte por planta: {MIN_SITE_NM3_DAY:,.0f} Nm³ CH₄/dia.",
        f"- **{len(sites)} locais** passam o corte e capturam **{100 * captured_total / total_supply:.0f} %** da oferta"
        f" ({captured_total / 365 / 1e6:.2f} M Nm³ CH₄/dia).",
        f"- Tamanho dos locais: mediana {np.median(sizes) / 1e3:,.0f} mil, maior {sizes.max() / 1e3:,.0f} mil Nm³/dia.",
        "- Fluxo dominante por local: "
        + ", ".join(f"{k} {v}" for k, v in sorted(dom_counts.items(), key=lambda x: -x[1])) + ".",
        "",
        "## Os 15 maiores locais",
        "",
        "| # | Município | CH₄ (mil Nm³/dia) | Municípios no raio | Fluxo dominante |",
        "|---:|---|---:|---:|---|",
    ]
    for rank, (c, cap, members) in enumerate(sites[:15], 1):
        dom = int(np.argmax(cap))
        lines.append(f"| {rank} | {coords[codes[c]][0]} | {cap.sum() / 365 / 1e3:,.0f} | {int(members.sum())} | "
                     f"{flows[dom]} ({100 * cap[dom] / cap.sum():.0f} %) |")
    lines += [
        "",
        f"## Validação contra as plantas ANP autorizadas em SP ({latest})",
        "",
        "O algoritmo não sabe onde estão as plantas existentes. A pergunta é se elas caem perto dos",
        "locais que ele escolhe **mais do que um município qualquer cairia**.",
        "",
        f"| Operador | Município | Distância ao local mais próximo (todos) | Idem, só os {TOP_N} maiores |",
        "|---|---|---:|---:|",
        *val_lines,
        "",
        f"| Conjunto de locais | Plantas a ≤ {VALIDATION_RADIUS_KM:.0f} km | Linha de base: município qualquer a ≤ {VALIDATION_RADIUS_KM:.0f} km |",
        "|---|---:|---:|",
        f"| Todos os {len(sites)} | {hits}/{matched} ({100 * hits / matched:.0f} %) | {100 * null_all:.0f} % |",
        f"| Os {TOP_N} maiores | {hits_top}/{matched} ({100 * hits_top / matched:.0f} %) | {100 * null_top:.0f} % |",
        "",
        "Com todos os locais, o estado fica quase todo coberto e o acerto não discrimina nada.",
        f"O teste que importa é o dos {TOP_N} maiores: com {matched} plantas a amostra é pequena,",
        "então isso é indício, não validação.",
        "",
        "## Limites",
        "",
        "- O candidato é o centróide do município, não um terreno. A versão completa usa a grade H3",
        "  e exclui áreas restritas (estratégia §3.2).",
        "- A distância é em linha reta × 1,3, não por malha viária.",
        "- Vinhaça e torta são atribuídas ao município, não à usina. O cadastro de usinas",
        "  (UNICA/ANP) deve substituir isso.",
        "- Não há custo nem receita: o corte é de volume. O motor tecno-econômico (§3.3) entra depois.",
        "- Aterros que já captam gás não são descontados; o RSU aparece como oferta nova.",
    ]
    (OUT / "RELATORIO.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
