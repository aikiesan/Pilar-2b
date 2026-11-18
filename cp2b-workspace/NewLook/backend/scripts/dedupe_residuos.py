#!/usr/bin/env python3
"""Merge the duplicated residue rows, keeping whichever side carries the evidence.

``residuos`` holds nearly every substrate twice — an UPPERCASE canonical code
(``VINHACA``) and a lowercase slug (``vinhaca_cana``) — with parameters that
disagree by up to 2.5x. The pairs below are matched by ``nome``, BY HAND: a regex
over the codes conflated ``CASCA_MILHO`` with ``cascas_citros`` and produced 46
"pairs" where there are 28.

SURVIVOR RULE — most references wins, ties go to the UPPERCASE row.

Not the ``data_status`` label. Four rows tagged "🟢 Scientifically Validated"
have zero references of any kind, and ``vinhaca_cana`` (BMP 300, 🟢) has two
references, both ``parameter_type='general'``: a CETESB soil-application norm and
an environmental-impact review, neither of which measures BMP. ``VINHACA``
(BMP 160) has 37 BMP-typed references from 2019-2025. The label is an assertion;
the reference table is evidence.

The tie-break favours UPPERCASE because only that scheme carries references for
TS, VS, CH4 content and C:N — 45, 26, 27 and 19 of them against zero on the
lowercase side. But the rule is applied per pair, not globally: lowercase wins
six substrates outright, ``mucilagem_cafe`` by 115 references to nil.

References are RE-POINTED to the survivor before the loser is deleted, so the
corpus is never reduced — a merge, not a purge.

Default is a dry run. Pass --apply to write.
"""

from __future__ import annotations

import argparse
import os

import psycopg2
from psycopg2.extras import RealDictCursor

# (código UPPERCASE, código lowercase) — pareados pelo campo `nome`, conferidos
# um a um contra a listagem completa das 69 linhas.
PARES = [
    ("BAGACO", "bagaco_cana"),
    ("BAGACO_CITROS", "bagaco_citros"),
    ("CAMA_AVIARIO", "cama_aviario"),
    ("CASCA_CAFE", "casca_cafe"),
    ("CASCA_EUCALIPTO", "casca_eucalipto"),
    ("CASCA_MILHO", "casca_milho"),
    ("CASCA_SOJA", "casca_soja"),
    ("CASCAS_CITROS", "cascas_citros"),
    ("DEJETOS_AVES", "dejetos_aves_frescos"),
    ("DEJETOS_BOVINO", "dejetos_bovinos_liquidos"),
    ("DEJETOS_SUINO", "dejetos_suinos_liquidos"),
    ("ESTERCO_BOVINO", "esterco_bovino_fresco"),
    ("FORSU", "forsu_ur_rsu"),
    ("GORDURA", "gordura_sebo"),
    ("LEVEDO_CERVEJA", "levedura_residual"),
    ("LODO_PRIMARIO", "lodo_primario_ete"),
    ("LODO_SECUNDARIO", "lodo_secundario_ete"),
    ("MUCILAGEM_CAFE", "mucilagem_cafe"),
    ("PALHA", "palha_cana"),
    ("PALHA_MILHO", "palha_milho"),
    ("PALHA_SOJA", "palha_soja"),
    ("POLPA_CAFE", "polpa_cafe"),
    ("SABUGO", "sabugo_milho"),
    ("SANGUE", "sangue_animal"),
    ("TORTA_FILTRO", "torta_filtro"),
    ("VAGEM_SOJA", "vagem_soja"),
    ("VINHACA", "vinhaca_cana"),
    ("VISCERAS", "visceras_abatedouro"),
]

# Sem par e sem uso: 0 referências e os quatro fatores FDE nulos, então não
# entra em nenhum cálculo e não sustenta nenhuma afirmação. Os outros órfãos
# (ORGANICO_RSU, cascas_citros_ind, soro_queijo) NÃO são tocados — sobrepõem-se
# a outros substratos mas a fusão é uma decisão científica, não mecânica.
ORFAOS_REMOVIVEIS = ["dejetos_suinos"]


def fetch(cur, codigos: list[str]) -> dict[str, dict]:
    cur.execute(
        """
        SELECT r.id, r.codigo, r.nome, r.bmp_medio, r.data_status,
               count(rr.id) AS refs,
               count(rr.id) FILTER (
                   WHERE rr.parameter_type NOT IN ('bmp', 'general')
               ) AS refs_param,
               (r.fc_medio IS NULL) AS fde_nulo
        FROM residuos r
        LEFT JOIN residuo_references rr ON rr.residuo_id = r.id
        WHERE r.codigo = ANY(%s)
        GROUP BY r.id
        """,
        (codigos,),
    )
    return {r["codigo"]: dict(r) for r in cur.fetchall()}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dsn", default=os.environ.get("DATABASE_URL"))
    ap.add_argument("--apply", action="store_true", help="grava (padrao: dry-run)")
    args = ap.parse_args()
    if not args.dsn:
        raise SystemExit("set --dsn or DATABASE_URL")

    conn = psycopg2.connect(args.dsn)
    todos = [c for par in PARES for c in par] + ORFAOS_REMOVIVEIS
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        info = fetch(cur, todos)
        cur.execute("SELECT count(*) AS n FROM residuos")
        total_atual = cur.fetchone()["n"]

    faltando = [c for c in todos if c not in info]
    if faltando:
        print(f"AVISO: codigos ausentes no banco (ja removidos?): {', '.join(faltando)}\n")

    print("=" * 104)
    print("  FUSAO DE DUPLICATAS — sobrevive quem tem mais referencias")
    print("=" * 104)
    print(
        f"{'substrato':<30}{'MANTEM':<24}{'refs':>6}{'BMP':>7}   {'REMOVE':<26}{'refs':>6}{'BMP':>7}"
    )
    print("-" * 104)

    plano = []
    refs_movidas = 0
    for up, low in PARES:
        a, b = info.get(up), info.get(low)
        if not a or not b:
            continue
        # Mais referencias vence; empate fica com o UPPERCASE, unico esquema com
        # referencias de TS/VS/CH4/C:N.
        keep, drop = (a, b) if a["refs"] >= b["refs"] else (b, a)
        plano.append((keep, drop))
        refs_movidas += drop["refs"]
        print(
            f"{keep['nome'][:29]:<30}{keep['codigo']:<24}{keep['refs']:>6}{keep['bmp_medio']:>7.0f}"
            f"   {drop['codigo']:<26}{drop['refs']:>6}{drop['bmp_medio']:>7.0f}"
        )

    print("-" * 104)
    up_keep = sum(1 for k, _ in plano if k["codigo"] == k["codigo"].upper())
    print(
        f"  {len(plano)} pares  |  sobrevive UPPERCASE em {up_keep}, minuscula em {len(plano) - up_keep}"
    )
    print(f"  {refs_movidas} referencias serao RE-APONTADAS para o sobrevivente (nenhuma perdida)")

    orfaos = [info[c] for c in ORFAOS_REMOVIVEIS if c in info]
    if orfaos:
        print()
        print("  ORFAOS REMOVIVEIS (sem par, 0 referencias, FDE nulo):")
        for o in orfaos:
            print(f"    {o['codigo']:<26} refs={o['refs']}  fde_nulo={o['fde_nulo']}")

    # Lido do banco, nunca constante. A producao tem 31 linhas contra as 69 do
    # Docker, e um total fixo aqui reportaria uma reducao que nao vai acontecer —
    # foi exatamente o que mascarou a divergencia entre as duas bases.
    resta = total_atual - len(plano) - len(orfaos)
    print(f"\n  residuos: {total_atual} -> {resta}")

    if not args.apply:
        print("\n(dry-run: nada gravado — passe --apply para executar)")
        conn.close()
        return

    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS residuos_dedupe_backup (
                id INTEGER, codigo TEXT, nome TEXT, bmp_medio REAL,
                data_status TEXT, merged_into TEXT, removed_at TIMESTAMPTZ DEFAULT now()
            )
            """)
        for keep, drop in plano:
            cur.execute(
                "INSERT INTO residuos_dedupe_backup (id, codigo, nome, bmp_medio, data_status, merged_into)"
                " SELECT id, codigo, nome, bmp_medio, data_status, %s FROM residuos WHERE id = %s",
                (keep["codigo"], drop["id"]),
            )
            # Re-aponta antes de apagar: a FK e ON DELETE CASCADE, entao a ordem
            # inversa levaria o corpus junto.
            cur.execute(
                "UPDATE residuo_references SET residuo_id = %s WHERE residuo_id = %s",
                (keep["id"], drop["id"]),
            )
            # `scientific_references` amarra o artigo ao residuo por CODIGO, nao
            # por id, e sem chave estrangeira — entao apagar a linha perdedora
            # nao dava erro nenhum, so deixava o artigo pendurado. Foi assim que
            # 309 dos 399 artigos (77%) perderam o vinculo com o residuo e a
            # pagina da base cientifica passou a lista-los sem resido nem setor.
            cur.execute(
                "UPDATE scientific_references SET primary_residue = %s WHERE primary_residue = %s",
                (keep["codigo"], drop["codigo"]),
            )
            cur.execute("DELETE FROM residuos WHERE id = %s", (drop["id"],))
        for o in orfaos:
            cur.execute(
                "INSERT INTO residuos_dedupe_backup (id, codigo, nome, bmp_medio, data_status, merged_into)"
                " SELECT id, codigo, nome, bmp_medio, data_status, NULL FROM residuos WHERE id = %s",
                (o["id"],),
            )
            cur.execute("DELETE FROM residuos WHERE id = %s", (o["id"],))
    conn.commit()

    with conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM residuos")
        n = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM residuo_references")
        nr = cur.fetchone()[0]
        cur.execute(
            "SELECT count(*) FROM residuo_references rr"
            " LEFT JOIN residuos r ON r.id = rr.residuo_id WHERE r.id IS NULL"
        )
        orfas = cur.fetchone()[0]
    conn.close()
    print(f"\naplicado. residuos={n}  referencias={nr}  referencias orfas={orfas}")


if __name__ == "__main__":
    main()
