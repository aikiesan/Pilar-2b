#!/usr/bin/env python3
"""Cross-check the RSU stream against the Atlas de Bioenergia SP (2020).

The Atlas is the strongest external validator available for urban waste: it is
state-official, covers the same 645 municipalities, publishes its equations in
full (Cap. V, pp. 91-98) and its state totals in Tabela V.6 (p. 101). This
script reimplements those equations and compares them to what PILAR-2b serves.

It exists because the comparison fails a physical bound, not merely a plausible
one: the FORSU mass implied by our rsu_organic stream (16.63 Mt/ano) is LARGER
THAN ALL MUNICIPAL WASTE GENERATED IN SÃO PAULO (15.65 Mt/ano). An organic
fraction cannot exceed the waste it is a fraction of, so the stream is wrong
regardless of which BMP anyone prefers.

The overestimate compounds from two independent factors:

* mass  — 16.63 Mt against the Atlas' 7.24 Mt (2.30x). The Atlas takes 46.46%
  of collected RSU as organic after sorting (EMAE/PROEMA 2011; GBio/IEE/USP
  2013); we appear to take the whole stream and then some.
* factor — 93.6 m3 CH4/t (BMP 360 x VS 26%) against the Atlas' 55.8
  (101.5 Nm3 biogas/t x 55% CH4, Achinas et al. 2017). 1.68x.

Together 3.85x. Correcting the stream to the Atlas moves the state theoretical
total by -5.8% and the mobilisable by -12.3%, because RSU is a larger share of
the mobilisable figure than of the theoretical one (FORSU's FDE is high).

Landfill route figures are also reproduced, and reproduce exactly — captured
biogas is 0.75 of generated and biomethane is captured x 0.50 / 0.97 to the
last digit — which is what establishes that the Atlas equations here are being
applied as published rather than approximated.

Reports only. Writes nothing.
"""

from __future__ import annotations

import argparse
import os

import psycopg2

# --- Atlas de Bioenergia SP 2020, Tabela V.6, coluna "Total SP" (ano-base 2017)
ATLAS_RSU_GERADO_T = 15_649_082
ATLAS_RSU_COLETADO_T = 15_591_115
ATLAS_BIOGAS_ATERRO_GERADO = 2_037_343_469
ATLAS_BIOGAS_ATERRO_CAPTADO = 1_528_007_602
ATLAS_BIOMETANO_ATERRO = 787_632_784
ATLAS_EE_ATERRO_MWH = 3_120_220

# --- Atlas Cap. V parameters
MO_FRACAO = 0.4646  # EMAE/PROEMA 2011; GBio/IEE/USP 2013 (Eq. V.5)
FMO_NM3_POR_T = 101.5  # Achinas et al. 2017 (Eq. V.6)
CH4_BIODIGESTAO = 0.55  # Achinas et al. 2017
CH4_ATERRO = 0.50  # BRASIL 2019
CAPTACAO_ATERRO = 0.75  # Leme 2010
PUREZA_BIOMETANO = 0.97  # ANP 2017
PCI_CH4_KWH = 9.97  # Bueno et al. 2016

# --- PILAR-2b canonical config for the rsu stream
NOSSO_BMP = 360.0
NOSSO_VS_WET = 26.0

DAYS = 365


def fmt(x, nd=0):
    return f"{x:,.{nd}f}"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dsn", default=os.environ.get("DATABASE_URL"))
    args = ap.parse_args()
    if not args.dsn:
        raise SystemExit("set --dsn or DATABASE_URL")

    with psycopg2.connect(args.dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COALESCE(SUM(biogas_m3_yr),0) FROM residue_streams_sp2023 "
                "WHERE residue_stream = 'rsu_organic'"
            )
            nosso_ch4 = float(cur.fetchone()[0])
            cur.execute("SELECT COALESCE(SUM(biogas_m3_yr),0) FROM residue_streams_sp2023")
            total_ch4 = float(cur.fetchone()[0])

    mo_t = ATLAS_RSU_COLETADO_T * MO_FRACAO
    bg_bio = mo_t * FMO_NM3_POR_T
    ch4_bio = bg_bio * CH4_BIODIGESTAO
    bm_bio = bg_bio * CH4_BIODIGESTAO / PUREZA_BIOMETANO

    print("=" * 84)
    print("  ATLAS — rota BIODIGESTAO ANAEROBIA (Eq. V.5 a V.8)")
    print("=" * 84)
    print(f"  RSU coletado                {fmt(ATLAS_RSU_COLETADO_T):>18} t/ano")
    print(f"  MO_RSU  ({MO_FRACAO:.4f})            {fmt(mo_t):>18} t/ano")
    print(f"  Biogas  ({FMO_NM3_POR_T} Nm3/t)      {fmt(bg_bio):>18} Nm3/ano")
    print(f"  CH4     ({CH4_BIODIGESTAO:.0%})               {fmt(ch4_bio):>18} Nm3/ano")
    print(f"  Biometano ({PUREZA_BIOMETANO:.0%})            {fmt(bm_bio):>18} Nm3/ano")

    print()
    print("=" * 84)
    print("  ATLAS — rota ATERRO SANITARIO (Tabela V.6 publicada vs reproduzida)")
    print("=" * 84)
    capt = ATLAS_BIOGAS_ATERRO_GERADO * CAPTACAO_ATERRO
    bm_at = capt * CH4_ATERRO / PUREZA_BIOMETANO
    print(f"  Biogas gerado               {fmt(ATLAS_BIOGAS_ATERRO_GERADO):>18} Nm3/ano")
    print(
        f"  Biogas captado (75%)        {fmt(ATLAS_BIOGAS_ATERRO_CAPTADO):>18}"
        f"  reproduzido {fmt(capt):>18}"
    )
    print(
        f"  Biometano                   {fmt(ATLAS_BIOMETANO_ATERRO):>18}"
        f"  reproduzido {fmt(bm_at):>18}"
    )
    print(f"  Energia eletrica            {fmt(ATLAS_EE_ATERRO_MWH):>18} MWh/ano")

    print()
    print("=" * 84)
    print("  PILAR-2b — fluxo rsu_organic")
    print("=" * 84)
    fator_nosso = NOSSO_BMP * NOSSO_VS_WET / 100.0
    massa_nossa = nosso_ch4 / fator_nosso
    print(f"  CH4 servido                 {fmt(nosso_ch4):>18} Nm3/ano")
    print(f"  fator implicito             {fator_nosso:>18.1f} m3 CH4/t")
    print(f"  massa FORSU implicita       {fmt(massa_nossa):>18} t/ano")
    print()
    print(f"  RSU TOTAL GERADO EM SP      {fmt(ATLAS_RSU_GERADO_T):>18} t/ano")
    if massa_nossa > ATLAS_RSU_GERADO_T:
        print(
            f"  *** IMPOSSIVEL: a fracao organica excede o RSU total em "
            f"{fmt(massa_nossa - ATLAS_RSU_GERADO_T)} t ({massa_nossa / ATLAS_RSU_GERADO_T:.2f}x) ***"
        )
    print()
    print(f"  massa   nossa/Atlas         {massa_nossa / mo_t:>18.2f}x")
    print(
        f"  fator   nosso/Atlas         {fator_nosso / (FMO_NM3_POR_T * CH4_BIODIGESTAO):>18.2f}x"
    )
    print(f"  CH4     nosso/Atlas         {nosso_ch4 / ch4_bio:>18.2f}x")

    print()
    print("=" * 84)
    print("  IMPACTO DE ADOTAR O ATLAS PARA O FLUXO RSU")
    print("=" * 84)
    novo = total_ch4 - nosso_ch4 + ch4_bio
    print(f"  CH4 teorico atual           {fmt(total_ch4):>18}  ({fmt(total_ch4 / DAYS):>14}/dia)")
    print(
        f"  CH4 teorico corrigido       {fmt(novo):>18}  ({fmt(novo / DAYS):>14}/dia)"
        f"   {(novo / total_ch4 - 1) * 100:+.2f}%"
    )


if __name__ == "__main__":
    main()
