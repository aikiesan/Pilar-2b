#!/usr/bin/env python3
"""Compute Cenário Real / Cenário Ideal per municipality and load them.

Writes the ch4_real_* and ch4_ideal_* columns created by migration 026. Run the
migration first.

Two sources are combined per municipality, deliberately:

* **Rebuilt streams** — cane (vinhaça, torta, palha), livestock, RSU and sewage
  are computed here from the canonical master's primary quantities (cane
  tonnage, herd counts, population). These are the streams whose stored values
  were wrong: cane carried bagasse's burn-discount and no vinasse at all, swine
  applied a per-matriz factor to the whole herd, RSU implied more organic matter
  than São Paulo generates waste.

* **Inherited streams** — milho, soja, citros, café, silvicultura, poda and
  aquicultura are read from the existing per-municipality columns, which are
  theoretical volumes, and multiplied by a retention fraction. They are NOT
  recomputed: their mass basis was never in question, only the missing
  availability term.

The retention fractions follow the Atlas' cane-straw reasoning (p.65) rather
than the database's own FDE. Field residues take 40%/50% because a fraction must
stay for soil protection; processing residues take 70%/85% because they arrive
concentrated at the mill and collection is not the binding constraint. The
stored FDE (milho 4.7%, soja 0.8%) is rejected: it suffers the same
over-discounting corrected for cane, where a competing use was booked as a total
loss.

Volumes written are METHANE. Biogas and biomethane are derived in the API.
"""

from __future__ import annotations

import argparse
import csv
import os
from pathlib import Path

import psycopg2
from psycopg2.extras import RealDictCursor, execute_batch

DAYS = 365

# Atlas de Bioenergia SP 2020
BIOGAS_M3_POR_M3_ETANOL = 114.0  # p.67
CH4_VINHACA = {"real": 0.50, "ideal": 0.65}  # p.67
ETANOL_M3_POR_T_CANA = 15_944_231 / 333_294_057  # Tabela IV.2
TORTA_KG_POR_T_CANA = 35.0  # p.66
PALHA_KG_POR_T_CANA = 140.0
PALHA_FRACAO = {"real": 0.40, "ideal": 0.50}  # p.65
RSU_MO_FRACAO = 0.4646  # Eq. V.5
RSU_FMO_NM3_T = 101.5  # Eq. V.6
RSU_CH4 = 0.55
RSU_COLETA = {"real": 0.9962, "ideal": 1.0}  # p.90
ESGOTO_M3_HAB_DIA = 0.120
ESGOTO_DQO_KG_M3 = 0.4497  # Eq. VI.1
ESGOTO_PCH4 = 0.1115
ESGOTO_EF_REM = 0.755
ESGOTO_COLETA = {"real": 0.905, "ideal": 1.0}

TORTA_BMP, TORTA_VS = 280.0, 20.0
PALHA_BMP, PALHA_VS = 175.0, 56.0
BOV_BMP, BOV_VS = 200.0, 19.5
SUI_BMP, SUI_VS = 245.0, 2.4
AVE_BMP, AVE_VS = 280.0, 17.5
KG_ESTERCO_DIA = {
    "bov": {"real": 8.0, "ideal": 12.0},
    "sui": {"real": 6.0, "ideal": 9.0},
    "ave": {"real": 0.025, "ideal": 0.035},
}

# coluna existente (teórica) -> (setor, fração real, fração ideal)
HERDADOS = {
    "corn_biogas_m3_year": ("agricultural", 0.40, 0.50),
    "soybean_biogas_m3_year": ("agricultural", 0.40, 0.50),
    "citrus_biogas_m3_year": ("agricultural", 0.70, 0.85),
    "coffee_biogas_m3_year": ("agricultural", 0.70, 0.85),
    "forestry_biogas_m3_year": ("forestry", 0.40, 0.50),
    "rpo_biogas_m3_year": ("urban", 0.80, 0.95),
    "aquaculture_biogas_m3_year": ("livestock", 0.40, 0.50),
}

# Coluna herdada -> chave de resíduo. O nome da coluna e o nome do resíduo no
# filtro divergem em três casos (rpo_/rsu_ contra rpo/rsu, aquaculture_), então o
# mapeamento é explícito em vez de derivado por corte de sufixo.
HERDADO_RESIDUO = {
    "corn_biogas_m3_year": "corn",
    "soybean_biogas_m3_year": "soybean",
    "citrus_biogas_m3_year": "citrus",
    "coffee_biogas_m3_year": "coffee",
    "forestry_biogas_m3_year": "forestry",
    "rpo_biogas_m3_year": "rpo",
    "aquaculture_biogas_m3_year": "aquaculture",
}

RSU_FAIXAS = [(25_000, 0.7), (100_000, 0.8), (500_000, 0.9)]


def rsu_kg_hab_dia(pop: float) -> float:
    for limite, taxa in RSU_FAIXAS:
        if pop <= limite:
            return taxa
    return 1.1


def num(v) -> float:
    try:
        return float(str(v).strip().replace(",", "."))
    except (TypeError, ValueError):
        return 0.0


SETOR_DE = {
    "sugarcane": "agricultural",
    "corn": "agricultural",
    "soybean": "agricultural",
    "citrus": "agricultural",
    "coffee": "agricultural",
    "cattle": "livestock",
    "swine": "livestock",
    "poultry": "livestock",
    "aquaculture": "livestock",
    "rsu": "urban",
    "rpo": "urban",
    "sewage": "urban",
    "forestry": "forestry",
}
RESIDUOS = list(SETOR_DE)


def por_municipio(row: dict, tier: str) -> dict[str, float]:
    """Residuo -> Nm3 CH4/ano para os fluxos reconstruidos."""
    cana = num(row.get("prod_t_Cana_de_açúcar"))
    bov = num(row.get("cabecas_Bovino"))
    sui = num(row.get("cabecas_Suíno___total"))
    ave = num(row.get("cabecas_Galináceos___total"))
    pop = num(row.get("populacao_total_hab"))

    vinhaca = cana * ETANOL_M3_POR_T_CANA * BIOGAS_M3_POR_M3_ETANOL * CH4_VINHACA[tier]
    torta = cana * (TORTA_KG_POR_T_CANA / 1000.0) * 1000.0 * (TORTA_VS / 100) * (TORTA_BMP / 1000)
    palha = (
        cana
        * (PALHA_KG_POR_T_CANA / 1000.0)
        * PALHA_FRACAO[tier]
        * 1000.0
        * (PALHA_VS / 100)
        * (PALHA_BMP / 1000)
    )

    def estrume(cab, kg, bmp, vs):
        return cab * kg * DAYS * (vs / 100) * (bmp / 1000)

    rsu_t = pop * rsu_kg_hab_dia(pop) * DAYS / 1000.0 * RSU_COLETA[tier]
    rsu = rsu_t * RSU_MO_FRACAO * RSU_FMO_NM3_T * RSU_CH4
    ec = pop * ESGOTO_M3_HAB_DIA * DAYS * ESGOTO_COLETA[tier]
    esgoto = ec * ESGOTO_DQO_KG_M3 * ESGOTO_EF_REM * ESGOTO_PCH4

    # Vinhaça, torta e palha somam em `sugarcane` porque é a unidade que o filtro
    # do mapa oferece — separá-las exigiria três entradas novas na interface para
    # uma distinção que o leitor não faz. Bagaço não entra: o Atlas (p.65) o
    # classifica como já aproveitado em caldeiras.
    return {
        "sugarcane": vinhaca + torta + palha,
        "cattle": estrume(bov, KG_ESTERCO_DIA["bov"][tier], BOV_BMP, BOV_VS),
        "swine": estrume(sui, KG_ESTERCO_DIA["sui"][tier], SUI_BMP, SUI_VS),
        "poultry": estrume(ave, KG_ESTERCO_DIA["ave"][tier], AVE_BMP, AVE_VS),
        "rsu": rsu,
        "sewage": esgoto,
    }


def resolve_master() -> Path | None:
    """Find the canonical master, preferring copies that exist on a deployed VM.

    ``data/raw/`` is gitignored (.gitignore:34), so the abiove_sp_processed copy —
    the natural one to reach for locally — is never present after a deploy. Two
    byte-identical copies ARE tracked; both are checked here so the runbook does
    not depend on which path someone happens to type.
    """
    backend = Path(__file__).resolve().parent.parent
    newlook = backend.parent
    for p in (
        newlook / "data" / "canonical_parameters" / "SP_master_residue_streams_2023_FINAL.csv",
        newlook / "docs" / "data" / "SP_master_residue_streams_2023_FINAL.csv",
        newlook
        / "data"
        / "raw"
        / "abiove_sp_processed"
        / "SP_master_residue_streams_2023_FINAL.csv",
    ):
        if p.is_file():
            return p
    return None


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--master", type=Path, default=None)
    ap.add_argument("--dsn", default=os.environ.get("DATABASE_URL"))
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    if not args.dsn:
        raise SystemExit("set --dsn or DATABASE_URL")

    master_path = args.master or resolve_master()
    if master_path is None or not master_path.is_file():
        raise SystemExit(
            "master canonico nao encontrado. Passe --master, ou verifique "
            "data/canonical_parameters/SP_master_residue_streams_2023_FINAL.csv"
        )
    print(f"master: {master_path}")

    master = {}
    with master_path.open(encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            code = (r.get("CD_GEOCODI") or "").strip()
            if code:
                master[code] = r

    conn = psycopg2.connect(args.dsn)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cols = ", ".join(HERDADOS)
        cur.execute(
            f"SELECT ibge_code, {cols} FROM municipalities WHERE ibge_code::text LIKE '35%'"
        )
        db_rows = cur.fetchall()

    updates = []
    tot = {"real": 0.0, "ideal": 0.0}
    sem_master = 0
    for db in db_rows:
        code = str(db["ibge_code"])
        m = master.get(code)
        if m is None:
            sem_master += 1
            continue
        linha = {"ibge_code": db["ibge_code"]}
        for tier in ("real", "ideal"):
            # Por resíduo primeiro; setor e total são DERIVADOS das parcelas, e
            # não calculados em paralelo. É o que garante que o desdobramento do
            # filtro sempre some exatamente o número que o mapa pinta ao lado.
            residuos = dict.fromkeys(RESIDUOS, 0.0)
            residuos.update(por_municipio(m, tier))
            for col, (_setor, fr, fi) in HERDADOS.items():
                chave = HERDADO_RESIDUO[col]
                residuos[chave] += float(db[col] or 0) * (fr if tier == "real" else fi)

            setores = dict.fromkeys(("agricultural", "livestock", "urban", "forestry"), 0.0)
            for r, v in residuos.items():
                setores[SETOR_DE[r]] += v
            total = sum(residuos.values())

            tot[tier] += total
            linha[f"ch4_{tier}"] = total
            for s, v in setores.items():
                linha[f"ch4_{tier}_{s}"] = v
            for r, v in residuos.items():
                linha[f"ch4_{tier}_res_{r}"] = v
        updates.append(linha)

    print(f"municipios SP no banco : {len(db_rows)}")
    print(f"  casados com o master : {len(updates)}")
    if sem_master:
        print(f"  SEM correspondencia  : {sem_master}  <-- verificar antes de publicar")
    print(f"\n  CH4 REAL  {tot['real']:>18,.0f} Nm3/ano  ({tot['real'] / DAYS:>14,.0f}/dia)")
    print(f"  CH4 IDEAL {tot['ideal']:>18,.0f} Nm3/ano  ({tot['ideal'] / DAYS:>14,.0f}/dia)")

    if args.dry_run:
        print("\n(dry-run: nada gravado)")
        conn.close()
        return

    # Montado a partir das mesmas listas que produziram os valores, para que
    # acrescentar um resíduo em RESIDUOS nunca deixe uma coluna sem gravar.
    SETORES = ("agricultural", "livestock", "urban", "forestry")
    atribuicoes = ["ch4_real_m3_year = %(ch4_real)s", "ch4_ideal_m3_year = %(ch4_ideal)s"]
    for tier in ("real", "ideal"):
        for setor in SETORES:
            atribuicoes.append(f"ch4_{tier}_{setor}_m3_year = %(ch4_{tier}_{setor})s")
        for r in RESIDUOS:
            # `forestry` é setor E resíduo — silvicultura é o único fluxo do seu
            # setor, então as duas colunas seriam a mesma e o UPDATE atribuiria
            # ch4_{tier}_forestry_m3_year duas vezes (erro de sintaxe do Postgres).
            # A coluna do setor já carrega o valor; os números são idênticos por
            # construção, então não há informação perdida.
            if r in SETORES:
                continue
            atribuicoes.append(f"ch4_{tier}_{r}_m3_year = %(ch4_{tier}_res_{r})s")
    sql = f"UPDATE municipalities SET {', '.join(atribuicoes)} WHERE ibge_code = %(ibge_code)s"
    with conn.cursor() as cur:
        execute_batch(cur, sql, updates, page_size=200)
    conn.commit()
    conn.close()
    print(f"\ngravados {len(updates)} municipios")


if __name__ == "__main__":
    main()
