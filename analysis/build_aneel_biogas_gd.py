#!/usr/bin/env python3
"""
ANEEL distributed-generation (GD) biogas-to-ELECTRICITY layer for Pilar-2b.

Source (owner-supplied, filtered from ANEEL empreendimento-geracao-distribuida.csv,
ref 06/2026): analysis/data/sources/aneel/aneel_biogas_gd_raw.csv — 546 biogas GD units.

This is the ELECTRICITY layer (kW installed), complementary to and kept SEPARATE from the
ANP biomethane registry (m³/d). kW and m³/d are never conflated.

Outputs:
  analysis/data/05g_aneel_biogas_gd_plants.csv   (cleaned, one row per GD unit, geocoded)
  analysis/data/05h_aneel_biogas_gd_summary.csv  (by state, subtype, consumption class)
"""
import pandas as pd
from pathlib import Path

DATA = Path("analysis/data")
RAW = DATA / "sources" / "aneel" / "aneel_biogas_gd_raw.csv"

# Biogas GD subtype -> feedstock category (RA=resíduos agropecuários/animais,
# RU=resíduos urbanos/aterro, AGR=agrícola, Floresta=florestal)
SUBTYPE_FEEDSTOCK = {
    "Biogás - RA": "animal_manure_agro",
    "Biogás-AGR": "agricultural_residues",
    "Biogás - RU": "msw_landfill",
    "Biogás - Floresta": "forestry_residues",
}

def num(s):
    if pd.isna(s):
        return None
    return float(str(s).replace('.', '').replace(',', '.'))

def coord(s):
    if pd.isna(s) or str(s).strip() == '':
        return ""
    return round(float(str(s).replace(',', '.')), 5)

def main():
    df = pd.read_csv(RAW, sep=';', dtype=str)
    df.columns = [c.strip() for c in df.columns]
    out = pd.DataFrame({
        "uf": df.SigUF.str.strip(),
        "municipality": df.NomMunicipio.str.strip(),
        "ibge_code": df.CodMunicipioIbge.str.strip(),
        "operator": df.NomTitularEmpreendimento.replace("***", "(redacted)").fillna(""),
        "source_subtype": df.DscFonteGeracao.str.strip(),
        "feedstock": df.DscFonteGeracao.str.strip().map(SUBTYPE_FEEDSTOCK).fillna(""),
        "consumption_class": df.DscClasseConsumo.str.strip(),
        "consumer_type": df.SigTipoConsumidor.str.strip(),
        "porte": df.DscPorte.str.strip(),
        "elec_capacity_kw": df.MdaPotenciaInstaladaKW.map(num),
        "connection_date": df.DatConexao.fillna(""),
        "lat": df.NumCoordNEmpreendimento.map(coord),
        "lon": df.NumCoordEEmpreendimento.map(coord),
    })
    out["sector"] = "electricity_gd"
    out["data_confidence"] = "primary"
    out["source_name"] = "ANEEL Geração Distribuída (Dados Abertos)"
    out["source_url"] = "https://dadosabertos.aneel.gov.br/dataset/relacao-de-empreendimentos-de-geracao-distribuida"
    # flag exact-duplicate units (same muni+subtype+kw+coords) — kept, not removed
    dup_key = ["uf", "municipality", "source_subtype", "elec_capacity_kw", "lat", "lon"]
    out["dup_group_size"] = out.groupby(dup_key)["elec_capacity_kw"].transform("size")

    out = out.sort_values(["uf", "municipality", "elec_capacity_kw"], ascending=[True, True, False])
    out.to_csv(DATA / "05g_aneel_biogas_gd_plants.csv", index=False)

    # summaries
    rows = []
    by_state = out.groupby("uf").agg(n_units=("elec_capacity_kw", "size"),
                                     total_kw=("elec_capacity_kw", "sum")).reset_index()
    by_state = by_state.sort_values("total_kw", ascending=False)
    for r in by_state.itertuples():
        rows.append(["by_state", r.uf, int(r.n_units), round(r.total_kw, 2)])
    by_sub = out.groupby("source_subtype").agg(n_units=("elec_capacity_kw", "size"),
                                               total_kw=("elec_capacity_kw", "sum")).reset_index()
    for r in by_sub.itertuples():
        rows.append(["by_subtype", r.source_subtype, int(r.n_units), round(r.total_kw, 2)])
    by_cls = out.groupby("consumption_class").agg(n_units=("elec_capacity_kw", "size"),
                                                  total_kw=("elec_capacity_kw", "sum")).reset_index()
    for r in by_cls.itertuples():
        rows.append(["by_class", r.consumption_class, int(r.n_units), round(r.total_kw, 2)])
    rows.append(["national", "BR", int(len(out)), round(out.elec_capacity_kw.sum(), 2)])
    summ = pd.DataFrame(rows, columns=["scope", "key", "n_units", "total_kw"])
    summ.to_csv(DATA / "05h_aneel_biogas_gd_summary.csv", index=False)

    assert abs(out.elec_capacity_kw.sum() - 152078.09) < 1, "kW total must reconcile to source"
    sp = out[out.uf == "SP"]
    print(f"OK GD units: {len(out)} | total {out.elec_capacity_kw.sum():,.2f} kW "
          f"({out.elec_capacity_kw.sum()/1000:.1f} MW)")
    print(f"   states: {out.uf.nunique()} | top: "
          f"{by_state.head(4)[['uf','total_kw']].to_dict('records')}")
    print(f"   SP GD units: {len(sp)} ({sp.elec_capacity_kw.sum()/1000:.1f} MW) — "
          f"check vs existing Plantas_Biogas_SP layer at map-integration time")
    print(f"   geocoded: {(out.lat!='').sum()}/{len(out)}")

if __name__ == "__main__":
    main()
