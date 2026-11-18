#!/usr/bin/env python3
"""Cascata FDE de São Paulo: teórico → FC → FCo → FS → FL, ponderada.

    python scripts/sp_fde_cascade.py
    python scripts/sp_fde_cascade.py --json cascata.json

O QUE ISTO RESPONDE
-------------------
Quanto do potencial teórico do Estado sobra depois de cada um dos quatro fatores
do FDE, na ordem em que a metodologia os aplica. A média simples dos 40
substratos não serve para isso — daria o mesmo peso à palha de soja (FDE 0,0082)
e à vinhaça, e São Paulo não é feito assim. Aqui cada fluxo entra com o seu
potencial teórico como peso.

O QUE ISTO **NÃO** É
--------------------
Não é a cadeia que produziu os 7,83 bi publicados. O FDE do banco foi
deliberadamente rejeitado no recálculo (RESULTADOS_SP_PARA_PAPER §4.9): para
milho ele dá 4,7% e para soja 0,8%, sofrendo a mesma sobre-penalização já
corrigida na cana, onde um uso concorrente foi lançado como perda total. Os
cenários Real e Ideal usam a lógica agronômica do Atlas no lugar.

Rodar os dois lado a lado é justamente o ponto: a diferença entre os métodos é
resultado, não ruído, e o artigo precisa declará-la.

A INCERTEZA QUE NÃO DÁ PARA ESCONDER
------------------------------------
Cada fluxo agrega vários substratos com FDE muito diferentes — cana traz bagaço
(0,1399), vinhaça (0,0931), torta (0,2565) e palha (0,0292) — e o banco guarda o
teórico por FLUXO, não por substrato. Sem a composição, atribuir um único FDE ao
fluxo é escolha, não medição.

Este script não esconde isso: usa a média dos substratos do fluxo como valor
central e reporta a banda entre o menor e o maior. Onde a banda é larga, o
número do meio merece desconfiança — e é exatamente onde a composição por
substrato faria diferença. Escolher um substrato "representativo" em silêncio é
o defeito que este projeto já cometeu uma vez, ao deixar o bagaço representar a
cana inteira.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

import psycopg2
from psycopg2.extras import RealDictCursor

# Fluxo -> substratos que o compõem. Cada substrato é uma LISTA DE APELIDOS.
#
# Por que apelidos, e não um código só: o dedupe elege o sobrevivente por número
# de referências, e as duas bases têm corpora diferentes (Docker 668 vínculos,
# VM 223). O mesmo substrato sobreviveu como `casca_cafe` num banco e
# `CASCA_CAFE` no outro; FORSU virou `forsu_ur_rsu` só na VM. Fixar um código
# faria este script rodar numa base e falhar na outra — e falhar é o bom caso,
# porque a alternativa silenciosa seria excluir o substrato da média.
#
# A resolução é por igualdade exata primeiro, depois sem diferenciar maiúsculas.
# O script erra alto se um substrato não existir em base alguma.
#
# Bagaço ENTRA aqui, ao contrário dos cenários Real/Ideal: a pergunta é o que a
# metodologia FDE faz com o potencial teórico inteiro, e o teórico inclui bagaço.
FLUXO_SUBSTRATOS: dict[str, list[list[str]]] = {
    "sugarcane": [["BAGACO"], ["PALHA"], ["TORTA_FILTRO"], ["VINHACA"]],
    "soybean": [["PALHA_SOJA"], ["CASCA_SOJA"], ["VAGEM_SOJA"]],
    "corn": [["PALHA_MILHO"], ["SABUGO"], ["CASCA_MILHO"]],
    "coffee": [["CASCA_CAFE"], ["POLPA_CAFE"], ["MUCILAGEM_CAFE"]],
    "citrus": [["BAGACO_CITROS"], ["CASCAS_CITROS"], ["CASCAS_CITROS_IND"], ["POLPA_CITROS"]],
    "cattle": [["ESTERCO_BOVINO"], ["DEJETOS_BOVINO"]],
    "swine": [["ESTERCO_SUINO"], ["DEJETOS_SUINO"]],
    "poultry": [["CAMA_AVIARIO"], ["DEJETOS_AVES"], ["CARCACAS_AVES"]],
    "rsu": [["ORGANICO_RSU"], ["FORSU", "FORSU_UR_RSU"]],
    "rpo": [["GALHOS_EUCALIPTO"], ["FOLHAS_EUCALIPTO"]],
    "forestry": [["GALHOS_EUCALIPTO"], ["CASCA_EUCALIPTO"], ["FOLHAS_EUCALIPTO"]],
}


def resolver(apelidos: list[str], catalogo: dict[str, dict]) -> str | None:
    """Primeiro código destes apelidos que existe no catálogo, ignorando caixa."""
    porcaixa = {c.upper(): c for c in catalogo}
    for a in apelidos:
        if a in catalogo:
            return a
        achado = porcaixa.get(a.upper())
        if achado:
            return achado
    return None


ROTULO = {
    "sugarcane": "Cana-de-açúcar",
    "soybean": "Soja",
    "corn": "Milho",
    "coffee": "Café",
    "citrus": "Citros",
    "cattle": "Bovinos",
    "swine": "Suínos",
    "poultry": "Aves",
    "rsu": "RSU",
    "rpo": "Poda urbana",
    "forestry": "Silvicultura",
}

ESTAGIOS = [
    ("teorico", "Teórico (sem correção)"),
    ("fc", "× FC — coleta"),
    ("fcp", "× FCo — uso concorrente"),
    ("fs", "× FS — sazonalidade"),
    ("fl", "× FL — logística"),
]


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


def carregar_pesos(cur) -> dict[str, float]:
    """Potencial TEÓRICO por fluxo, em Nm³ CH₄/ano, direto do banco.

    São as colunas legadas `{fluxo}_biogas_m3_year`: volume sem correção de
    disponibilidade alguma, que é precisamente a base 1,0 desta cascata. Somam
    19,90 bi — o headline que a plataforma aposentou justamente por ser teórico.
    """
    cols = ", ".join(f"COALESCE(SUM({f}_biogas_m3_year), 0) AS {f}" for f in FLUXO_SUBSTRATOS)
    cur.execute(f"SELECT {cols} FROM municipalities WHERE ibge_code::text LIKE '35%'")
    row = cur.fetchone()
    return {f: float(row[f] or 0) for f in FLUXO_SUBSTRATOS}


def carregar_fatores(cur) -> dict[str, dict[str, float]]:
    cur.execute("""
        SELECT codigo, fc_medio, fcp_medio, fs_medio, fl_medio
        FROM residuos
        WHERE fc_medio IS NOT NULL
        """)
    return {
        r["codigo"]: {
            "fc": float(r["fc_medio"]),
            "fcp": float(r["fcp_medio"]),
            "fs": float(r["fs_medio"]),
            "fl": float(r["fl_medio"]),
        }
        for r in cur.fetchall()
    }


def acumulado(f: dict[str, float]) -> dict[str, float]:
    """Fator acumulado ao fim de cada estágio, na ordem da metodologia."""
    fc = f["fc"]
    return {
        "teorico": 1.0,
        "fc": fc,
        "fcp": fc * f["fcp"],
        "fs": fc * f["fcp"] * f["fs"],
        "fl": fc * f["fcp"] * f["fs"] * f["fl"],
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dsn", default=None)
    ap.add_argument("--json", help="grava o resultado bruto neste arquivo")
    args = ap.parse_args()

    conn = psycopg2.connect(args.dsn or dsn())
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            pesos = carregar_pesos(cur)
            fatores = carregar_fatores(cur)
            cur.execute("""
                SELECT COALESCE(SUM(ch4_real_m3_year), 0) AS real,
                       COALESCE(SUM(ch4_ideal_m3_year), 0) AS ideal
                FROM municipalities WHERE ibge_code::text LIKE '35%'
                """)
            cen = cur.fetchone()
    finally:
        conn.close()

    resolvidos: dict[str, list[str]] = {}
    faltando: list[str] = []
    for fluxo, specs in FLUXO_SUBSTRATOS.items():
        codigos = []
        for apelidos in specs:
            achado = resolver(apelidos, fatores)
            if achado:
                codigos.append(achado)
            else:
                faltando.append("|".join(apelidos))
        resolvidos[fluxo] = codigos

    if faltando:
        print(f"ERRO: substratos sem FDE no catálogo: {sorted(set(faltando))}", file=sys.stderr)
        print(
            "Aplique a migração 027 (e a 004, se o catálogo estiver incompleto).", file=sys.stderr
        )
        return 1

    total = sum(pesos.values())
    if total <= 0:
        print("ERRO: potencial teórico zero — o banco tem os fluxos legados?", file=sys.stderr)
        return 1

    # Por fluxo: central = média dos substratos; banda = melhor e pior substrato.
    por_fluxo = {}
    for fluxo, subs in resolvidos.items():
        acs = [acumulado(fatores[c]) for c in subs]
        por_fluxo[fluxo] = {
            "peso": pesos[fluxo],
            "share": pesos[fluxo] / total,
            "central": {k: sum(a[k] for a in acs) / len(acs) for k, _ in ESTAGIOS},
            "min": {k: min(a[k] for a in acs) for k, _ in ESTAGIOS},
            "max": {k: max(a[k] for a in acs) for k, _ in ESTAGIOS},
            "substratos": subs,
        }

    estado = {
        alvo: {
            k: sum(por_fluxo[f]["peso"] * por_fluxo[f][alvo][k] for f in por_fluxo) / total
            for k, _ in ESTAGIOS
        }
        for alvo in ("central", "min", "max")
    }

    print(f"\nPOTENCIAL TEÓRICO DE SÃO PAULO: {total/1e9:.3f} bi Nm³ CH₄/ano\n")
    print("CASCATA FDE PONDERADA PELO TEÓRICO")
    print(f"{'estágio':<28} {'fator':>8} {'bi Nm³/ano':>12}   banda por substrato")
    print("-" * 78)
    for k, rotulo in ESTAGIOS:
        c = estado["central"][k]
        print(
            f"{rotulo:<28} {c:>8.4f} {c*total/1e9:>12.3f}   "
            f"{estado['min'][k]:.4f} – {estado['max'][k]:.4f}"
        )

    print("\nPOR FLUXO (fator acumulado final, e quanto ele pesa no teórico)")
    print(f"{'fluxo':<18} {'% do teórico':>13} {'FDE central':>12} {'banda':>18}")
    print("-" * 68)
    for fluxo, d in sorted(por_fluxo.items(), key=lambda kv: -kv[1]["peso"]):
        print(
            f"{ROTULO[fluxo]:<18} {d['share']*100:>12.1f}% {d['central']['fl']:>12.4f} "
            f"{d['min']['fl']:>8.4f} – {d['max']['fl']:.4f}"
        )

    fde_estado = estado["central"]["fl"]
    real = float(cen["real"])
    ideal = float(cen["ideal"])
    print("\nCONTRA O MÉTODO QUE A PLATAFORMA PUBLICA")
    print(f"  FDE do banco, ponderado : {fde_estado:.4f}  ->  {fde_estado*total/1e9:.3f} bi")
    print(f"  Cenário Real (Atlas)    : {real/total:.4f}  ->  {real/1e9:.3f} bi")
    print(f"  Cenário Ideal (Atlas)   : {ideal/total:.4f}  ->  {ideal/1e9:.3f} bi")
    razao = (real / total) / fde_estado if fde_estado else float("nan")
    print(f"\n  O método do Atlas é {razao:.2f}x mais permissivo que o FDE armazenado.")
    print("  A diferença é resultado, não ruído: declare-a no artigo.")

    if args.json:
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump(
                {
                    "teorico_total_m3_ano": total,
                    "estado": estado,
                    "por_fluxo": por_fluxo,
                    "cenarios": {"real": real, "ideal": ideal},
                },
                fh,
                ensure_ascii=False,
                indent=2,
            )
        print(f"\nbruto gravado em {args.json}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
