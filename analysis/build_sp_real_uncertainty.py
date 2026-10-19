#!/usr/bin/env python3
"""
Monte Carlo + Sobol uncertainty prototype for the São Paulo Cenário Real.

The published Cenário Real (7,832,143,834 Nm³ CH4/yr) is a single deterministic
number, and the min/medio/max bands elsewhere in the platform are coupled
extremes, not a probability statement ("monte_carlo": false in
canonical_results.json). This script puts a distribution on every parameter of
the Real chain and answers two questions:

  1. How wide is the Real number once parameter uncertainty is propagated?
     (P5 / P10 / P50 / P90 / P95)
  2. Which parameters drive that width?  (Sobol first-order S1 and total ST,
     Saltelli sampling with the Jansen estimators — numpy only, no SALib)

The model IS backend/scripts/sp_scenarios_real_ideal.py: its constants are the
modes of the distributions below, and the script refuses to run unless the
vectorised model reproduces that file's Real result for every flow.

Distribution sources, per parameter, are in PARAMS ("fonte"):
  * corpus  — min / max of the BMP literature corpus
              (data/canonical_parameters/corpus_bmp_long.csv)
  * atlas   — range printed in the Atlas de Bioenergia SP (2020)
  * assumed — PROTOTYPE width chosen here; to be replaced by a corpus-derived
              range before any number from this script is published.

Run from the repo root:
  python3 analysis/build_sp_real_uncertainty.py

Outputs (analysis/outputs/sp_real_uncertainty/):
  percentis_total_e_fluxos.csv   P5..P95 for the total and each flow
  sobol_indices.csv              S1 and ST per parameter, two sample sizes
  RELATORIO.md                   human-readable summary
"""

from __future__ import annotations

import csv
import importlib.util
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
NEWLOOK = ROOT / "cp2b-workspace" / "NewLook"
SCEN = NEWLOOK / "backend" / "scripts" / "sp_scenarios_real_ideal.py"
MASTER = NEWLOOK / "data" / "canonical_parameters" / "SP_master_residue_streams_2023_FINAL.csv"
OUT = ROOT / "analysis" / "outputs" / "sp_real_uncertainty"

N_MC = 200_000
N_SOBOL = 2**17
SEED = 20261019


def load_scenario_module():
    spec = importlib.util.spec_from_file_location("sp_scen", SCEN)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


S = load_scenario_module()

# name: (low, mode, high, fonte, nota). Mode == the value the Real tier uses.
PARAMS: dict[str, tuple[float, float, float, str, str]] = {
    "vinhaca_ch4_frac": (0.50, S.CH4_VINHACA[0], 0.65, "atlas", "Atlas p.67: 50-65% CH4; Real usa o piso"),
    "vinhaca_biogas_m3_por_m3_etanol": (97.0, S.BIOGAS_M3_POR_M3_ETANOL, 131.0, "assumed", "114 ±15%"),
    "torta_kg_por_t_cana": (30.0, S.TORTA_KG_POR_T_CANA, 40.0, "atlas", "Atlas p.66: 30-40 kg/t"),
    "torta_bmp_x_vs": (0.8, 1.0, 1.2, "assumed", "multiplicador ±20% sobre BMP×VS"),
    "palha_kg_por_t_cana": (112.0, S.PALHA_KG_POR_T_CANA, 168.0, "assumed", "140 ±20%"),
    "palha_fracao_removivel": (0.30, S.PALHA_FRACAO["real"], 0.50, "atlas", "Atlas p.65: 40% conservador; 50% teto"),
    "palha_bmp": (130.0, S.PALHA_BMP, 236.0, "corpus", "faixa do bagaço no corpus como proxy lignocelulósico"),
    "bovino_kg_esterco_dia": (5.0, S.KG_ESTERCO_DIA["bovino"]["real"], 12.0, "assumed", "Real 8, Ideal 12"),
    "bovino_bmp": (140.0, S.BOV_BMP, 310.0, "corpus", "DEJETO_BOVINO n=7"),
    "suino_kg_esterco_dia": (4.0, S.KG_ESTERCO_DIA["suino"]["real"], 9.0, "assumed", "Real 6, Ideal 9"),
    "suino_bmp": (210.0, S.SUI_BMP, 450.0, "corpus", "DEJETO_SUINO n=9"),
    "ave_kg_esterco_dia": (0.020, S.KG_ESTERCO_DIA["ave"]["real"], 0.035, "assumed", "Real 0.025, Ideal 0.035"),
    "ave_bmp": (180.0, S.AVE_BMP, 380.0, "corpus", "CAMA_AVIARIO n=7"),
    "rsu_mo_fracao": (0.40, S.RSU_MO_FRACAO, 0.52, "assumed", "Eq. V.5 ±~12%"),
    "rsu_fmo_nm3_t": (81.2, S.RSU_FMO_NM3_T, 121.8, "assumed", "Eq. V.6 ±20%"),
    "rsu_ch4_frac": (0.50, S.RSU_CH4, 0.60, "assumed", "55% ±5 p.p."),
    "esgoto_dqo_g_m3": (360.0, S.ESGOTO_DQO_G_M3, 540.0, "assumed", "449.7 ±20%"),
    "campo_retencao_milho_soja_silv": (0.20, S.OUTROS_RETENCAO["milho"]["real"], 0.50, "assumed",
                                       "analogia com palha de cana; nunca medido"),
    "campo_bmp_milho_soja_silv": (0.75, 1.0, 1.25, "assumed", "multiplicador ±25% sobre o teórico"),
    "agroind_retencao_citros_cafe": (0.50, S.OUTROS_RETENCAO["citros"]["real"], 0.85, "assumed",
                                     "julgamento dos autores"),
    "poda_retencao": (0.60, S.OUTROS_RETENCAO["poda_urbana"]["real"], 0.95, "assumed", "julgamento dos autores"),
}
NAMES = list(PARAMS)
K = len(NAMES)


def activity_totals() -> dict[str, float]:
    rows = list(csv.DictReader(MASTER.open(encoding="utf-8-sig")))
    pop_rows = [float(r.get("populacao_total_hab") or 0) for r in rows]
    return {
        "cana": S.somar(rows, "prod_t_Cana_de_açúcar"),
        "bov": S.somar(rows, "cabecas_Bovino"),
        "sui": S.somar(rows, "cabecas_Suíno___total"),
        "ave": S.somar(rows, "cabecas_Galináceos___total"),
        "pop": S.somar(rows, "populacao_total_hab"),
        "rsu_t": sum(p * S.rsu_per_capita(p) * S.DAYS / 1000.0 for p in pop_rows),
        "_rows": rows,
    }


def model(x: dict[str, np.ndarray], a: dict[str, float]) -> dict[str, np.ndarray]:
    """Vectorised Cenário Real. Each x[name] is an array of samples."""
    etanol = a["cana"] * S.ETANOL_M3_POR_T_CANA
    out = {}
    out["vinhaça"] = etanol * x["vinhaca_biogas_m3_por_m3_etanol"] * x["vinhaca_ch4_frac"]
    out["torta de filtro"] = (
        a["cana"] * x["torta_kg_por_t_cana"] * (S.TORTA_VS / 100) * (S.TORTA_BMP / 1000) * x["torta_bmp_x_vs"]
    )
    out["palha de cana"] = (
        a["cana"] * x["palha_kg_por_t_cana"] / 1000.0 * x["palha_fracao_removivel"]
        * 1000.0 * (S.PALHA_VS / 100) * (x["palha_bmp"] / 1000)
    )

    def estrume(cab, kg, bmp, vs):
        return cab * kg * S.DAYS * (vs / 100) * (bmp / 1000)

    out["bovinos"] = estrume(a["bov"], x["bovino_kg_esterco_dia"], x["bovino_bmp"], S.BOV_VS)
    out["suínos"] = estrume(a["sui"], x["suino_kg_esterco_dia"], x["suino_bmp"], S.SUI_VS)
    out["aves"] = estrume(a["ave"], x["ave_kg_esterco_dia"], x["ave_bmp"], S.AVE_VS)
    out["RSU (FORSU)"] = (
        a["rsu_t"] * S.RSU_COLETA_REAL * x["rsu_mo_fracao"] * x["rsu_fmo_nm3_t"] * x["rsu_ch4_frac"]
    )
    ec = a["pop"] * S.ESGOTO_M3_HAB_DIA * S.DAYS * S.ESGOTO_COLETA_REAL
    out["esgoto (ETE)"] = ec * (x["esgoto_dqo_g_m3"] / 1000.0) * S.ESGOTO_EF_REM * S.ESGOTO_PCH4

    teo = S.OUTROS_FLUXOS_TEORICO
    for f in ("milho", "soja", "silvicultura", "aquicultura"):
        out[f] = teo[f] * x["campo_retencao_milho_soja_silv"] * x["campo_bmp_milho_soja_silv"]
    for f in ("citros", "cafe"):
        out[f] = teo[f] * x["agroind_retencao_citros_cafe"]
    out["poda_urbana"] = teo["poda_urbana"] * x["poda_retencao"]
    return out


def tri_ppf(u: np.ndarray, lo: float, mode: float, hi: float) -> np.ndarray:
    """Inverse CDF of the triangular distribution."""
    c = (mode - lo) / (hi - lo)
    left = lo + np.sqrt(u * (hi - lo) * (mode - lo))
    right = hi - np.sqrt((1 - u) * (hi - lo) * (hi - mode))
    return np.where(u < c, left, right)


def to_params(u: np.ndarray) -> dict[str, np.ndarray]:
    return {n: tri_ppf(u[:, i], *PARAMS[n][:3]) for i, n in enumerate(NAMES)}


def total(flows: dict[str, np.ndarray]) -> np.ndarray:
    return sum(flows.values())


def check_reproduces_published(a) -> float:
    nominal = {n: np.array([PARAMS[n][1]]) for n in NAMES}
    mine = model(nominal, a)
    ref = S.calcular(a["_rows"], "real")
    assert set(mine) == set(ref), (set(mine) ^ set(ref))
    for f, v in ref.items():
        got = float(mine[f][0])
        assert abs(got - v) <= 1e-6 * max(1.0, v), f"{f}: {got} != {v}"
    return float(total(mine)[0])


def sobol(a, n: int, rng) -> tuple[np.ndarray, np.ndarray]:
    """Saltelli (2010) sampling; Saltelli S1 and Jansen ST estimators."""
    A = rng.random((n, K))
    B = rng.random((n, K))
    fA = total(model(to_params(A), a))
    fB = total(model(to_params(B), a))
    var = np.var(np.concatenate([fA, fB]))
    s1, st = np.empty(K), np.empty(K)
    for i in range(K):
        ABi = A.copy()
        ABi[:, i] = B[:, i]
        fABi = total(model(to_params(ABi), a))
        s1[i] = np.mean(fB * (fABi - fA)) / var
        st[i] = 0.5 * np.mean((fA - fABi) ** 2) / var
    return s1, st


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    a = activity_totals()
    det = check_reproduces_published(a)
    rng = np.random.default_rng(SEED)

    flows = model(to_params(rng.random((N_MC, K))), a)
    tot = total(flows)
    qs = [5, 10, 50, 90, 95]
    with (OUT / "percentis_total_e_fluxos.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["fluxo", "deterministico_real"] + [f"p{q}" for q in qs] + ["media"])
        ref = S.calcular(a["_rows"], "real")
        for f in sorted(flows, key=lambda k: -ref[k]):
            w.writerow([f, round(ref[f])] + [round(np.percentile(flows[f], q)) for q in qs]
                       + [round(flows[f].mean())])
        w.writerow(["TOTAL", round(det)] + [round(np.percentile(tot, q)) for q in qs] + [round(tot.mean())])

    s1_a, st_a = sobol(a, N_SOBOL // 2, np.random.default_rng(SEED + 1))
    s1_b, st_b = sobol(a, N_SOBOL, np.random.default_rng(SEED + 2))
    order = np.argsort(-st_b)
    with (OUT / "sobol_indices.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["parametro", "S1", "ST", f"S1_n{N_SOBOL // 2}", f"ST_n{N_SOBOL // 2}",
                    "min", "moda_real", "max", "fonte", "nota"])
        for i in order:
            lo, mo, hi, src, note = PARAMS[NAMES[i]]
            w.writerow([NAMES[i], f"{s1_b[i]:.4f}", f"{st_b[i]:.4f}", f"{s1_a[i]:.4f}", f"{st_a[i]:.4f}",
                        lo, mo, hi, src, note])

    p = {q: np.percentile(tot, q) for q in qs}
    share_below = float((tot < det).mean())
    lines = [
        "# Incerteza do Cenário Real de SP: protótipo Monte Carlo + Sobol",
        "",
        "> Gerado por `analysis/build_sp_real_uncertainty.py`. **Protótipo**: as larguras marcadas",
        "> `assumed` em `sobol_indices.csv` são provisórias e devem ser substituídas por faixas",
        "> derivadas do corpus antes de qualquer publicação.",
        "",
        f"- Determinístico publicado (reproduzido por este script, fluxo a fluxo): "
        f"**{det / 1e9:.3f} bi Nm³ CH₄/ano**",
        f"- Monte Carlo (N = {N_MC:,}): P10 **{p[10] / 1e9:.2f}**, P50 **{p[50] / 1e9:.2f}**, "
        f"P90 **{p[90] / 1e9:.2f}** bi Nm³/ano (P5–P95: {p[5] / 1e9:.2f}–{p[95] / 1e9:.2f})",
        f"- O número determinístico fica no percentil **{share_below * 100:.0f}** da distribuição.",
        "",
        "## O que mais move o número (Sobol, índice total ST)",
        "",
        "| Parâmetro | ST | S1 | Fonte da faixa |",
        "|---|---:|---:|---|",
    ]
    for i in order[:10]:
        lines.append(f"| `{NAMES[i]}` | {st_b[i]:.3f} | {s1_b[i]:.3f} | {PARAMS[NAMES[i]][3]} |")
    lines += [
        "",
        f"Convergência: ST com N = {N_SOBOL // 2:,} e N = {N_SOBOL:,} estão lado a lado em `sobol_indices.csv`.",
        f"Soma de S1 = {s1_b.sum():.3f}. Um valor próximo de 1 indica um modelo quase aditivo,",
        "em que as interações entre parâmetros pesam pouco.",
        "",
        "## Como ler",
        "",
        "- Um ST alto com fonte `assumed` é **prioridade de pesquisa**: medir esse parâmetro reduz",
        "  mais a incerteza do número estadual do que qualquer outro esforço.",
        "- O intervalo P10–P90 é o que deveria acompanhar o número publicado (estratégia §2.3).",
        "- S1 usa o estimador de Saltelli (2010), que é mais ruidoso que o de ST; valores de S1 abaixo",
        "  de ~0,01 ou negativos são ruído amostral e devem ser lidos como zero.",
        "",
        "## Limites deste protótipo",
        "",
        "- Os parâmetros são amostrados de forma **independente**. BMP e VS do mesmo substrato, e as",
        "  frações de retenção de culturas de campo, provavelmente são correlacionados; correlação",
        "  positiva alargaria o intervalo.",
        "- Só a incerteza **paramétrica** entra. Escolhas estruturais (vinhaça com FDE = 1,0, exclusão",
        "  do bagaço, FS = FL = 1,0) não são parâmetros aqui e podem pesar mais que tudo acima.",
        "- Os dados de atividade (PAM, PPM, Censo) são tratados como exatos.",
        "- A largura do intervalo depende diretamente das faixas `assumed`. O valor deste",
        "  protótipo está no **ranking** dos parâmetros e no método, não na largura exata.",
    ]
    (OUT / "RELATORIO.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
