#!/usr/bin/env python3
"""Re-aponta `scientific_references.primary_residue` para os códigos sobreviventes.

    python scripts/fix_scientific_reference_links.py            # dry-run
    python scripts/fix_scientific_reference_links.py --apply

O DEFEITO
---------
O `dedupe_residuos.py` funde duplicatas e re-aponta `residuo_references` antes de
apagar a linha perdedora — mas **não toca em `scientific_references`**, que amarra
cada artigo a um resíduo por CÓDIGO, na coluna `primary_residue`, sem chave
estrangeira que obrigasse o banco a reclamar.

Resultado: 309 dos 399 artigos (77%) passaram a apontar para códigos que não
existem mais — `bagaco_cana` (40 artigos), `palha_cana` (34), `vinhaca_cana`
(28), `torta_filtro` (21). O endpoint `/residuos/references/all` faz
`residuo_by_codigo.get(primary_residue)` e recebe vazio, então a página da base
científica lista o artigo sem resíduo, sem setor — e um leitor conclui que a
plataforma não tem referências, quando na verdade tem 399 com 260 DOIs e 376
links.

Nada foi perdido: só a amarração ficou pendurada. Este script a refaz.

POR QUE POR PAR, E NÃO POR CAIXA
---------------------------------
Dá vontade de resolver com `upper()`, e funcionaria para `casca_cafe` →
`CASCA_CAFE`. Mas os pares do dedupe não são todos variações de caixa:
`FORSU` ↔ `forsu_ur_rsu`, `GORDURA` ↔ `gordura_sebo`, `SANGUE` ↔ `sangue_animal`,
`LEVEDO_CERVEJA` ↔ `levedura_residual`. A tabela de pares é a mesma que o dedupe
usou, importada dele — duplicá-la aqui garantiria que as duas divergissem.

E o sobrevivente NÃO é o mesmo nas duas bases: o dedupe elege quem tem mais
referências, o Docker tem 668 vínculos e a VM 223, então `lodo_primario_ete`
venceu na VM e perdeu aqui. Por isso o script não assume direção — para cada par,
descobre qual dos dois existe HOJE e manda o outro para ele.
"""

from __future__ import annotations

import argparse
import os
import sys

import psycopg2
from psycopg2.extras import RealDictCursor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dedupe_residuos import PARES  # noqa: E402  — fonte única dos pares

# Códigos removidos pelo dedupe como "órfãos sem referências" — contagem feita
# só sobre `residuo_references`, o mesmo ponto cego que causou este defeito.
# `dejetos_suinos` tinha 8 artigos na `scientific_references` e foi apagado assim
# mesmo. O destino aqui é explícito e justificado, um por um; qualquer órfão fora
# desta lista fica sem amarração, porque adivinhar o resíduo de um artigo é pior
# que deixá-lo solto.
ORFAOS_MAPEADOS = {
    # mesmo substrato do sobrevivente, sem ambiguidade: dejetos de suíno.
    "dejetos_suinos": "DEJETOS_SUINO",
}


def dsn() -> str:
    url = os.environ.get("DATABASE_URL")
    if url:
        return url
    return "postgresql://{u}:{p}@{h}:{port}/{db}".format(
        u=os.environ.get("POSTGRES_USER", "postgres"),
        p=os.environ.get("POSTGRES_PASSWORD", "password"),
        h=os.environ.get("POSTGRES_HOST", "db"),
        port=os.environ.get("POSTGRES_PORT", "5432"),
        db=os.environ.get("POSTGRES_DB", "cp2b_maps"),
    )


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dsn", default=None)
    ap.add_argument("--apply", action="store_true", help="grava (padrão: dry-run)")
    args = ap.parse_args()

    conn = psycopg2.connect(args.dsn or dsn())
    conn.autocommit = False
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT codigo FROM residuos")
            vivos = {r["codigo"] for r in cur.fetchall()}

            cur.execute("""
                SELECT primary_residue AS codigo, count(*) AS n
                FROM scientific_references
                WHERE primary_residue IS NOT NULL AND primary_residue <> ''
                GROUP BY 1
                """)
            usados = {r["codigo"]: int(r["n"]) for r in cur.fetchall()}

            # Para cada par, quem existe hoje recebe o que não existe.
            plano: list[tuple[str, str, int]] = []
            for morto, vivo in ORFAOS_MAPEADOS.items():
                if morto in usados and morto not in vivos and vivo in vivos:
                    plano.append((morto, vivo, usados[morto]))
            for a, b in PARES:
                for morto, vivo in ((a, b), (b, a)):
                    if morto in usados and morto not in vivos and vivo in vivos:
                        plano.append((morto, vivo, usados[morto]))

            orfas_restantes = {
                c: n
                for c, n in usados.items()
                if c not in vivos and c not in {m for m, _, _ in plano}
            }

            print(f"{'de':<28} {'para':<28} {'artigos':>8}")
            print("-" * 68)
            for morto, vivo, n in sorted(plano, key=lambda t: -t[2]):
                print(f"{morto:<28} {vivo:<28} {n:>8}")
            print("-" * 68)
            print(f"  {len(plano)} códigos a re-apontar, {sum(n for _, _, n in plano)} artigos")

            if orfas_restantes:
                # Não inventar destino: um código órfão fora dos pares do dedupe
                # veio de outro lugar, e adivinhar o resíduo de um artigo é pior
                # que deixá-lo sem amarração.
                print(
                    f"\n  AINDA ÓRFÃOS (sem par no dedupe), {sum(orfas_restantes.values())} artigos:"
                )
                for c, n in sorted(orfas_restantes.items(), key=lambda kv: -kv[1]):
                    print(f"    {c:<30} {n:>5}")

            if not args.apply:
                print("\n(dry-run: nada gravado — passe --apply para executar)")
                return 0

            for morto, vivo, _ in plano:
                cur.execute(
                    "UPDATE scientific_references SET primary_residue = %s WHERE primary_residue = %s",
                    (vivo, morto),
                )
            conn.commit()

            cur.execute("""
                SELECT count(*) AS orfas
                FROM scientific_references s
                WHERE s.primary_residue IS NOT NULL AND s.primary_residue <> ''
                  AND NOT EXISTS (SELECT 1 FROM residuos r WHERE r.codigo = s.primary_residue)
                """)
            print(f"\naplicado. artigos ainda sem resíduo válido: {cur.fetchone()['orfas']}")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
