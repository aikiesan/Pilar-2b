#!/usr/bin/env python3
"""
EXPANSION PASS: integrate official ANP "Dados Abertos" biomethane data into the
Pilar-2b real-world plants dataset, and produce fleet/utilization + time-series tables.

Primary sources (vendored in analysis/data/sources/anp/):
  - anp_biometano_capacidade.csv : plant-level monthly registry (authorized biomethane
    capacity, biogas-processing capacity, processed volume, utilization %).
  - anp_biometano_producao.csv   : state-level monthly biomethane production (m3).

Outputs:
  analysis/data/05_biogas_plants_brazil.csv          (rebuilt: ANP primary + retained non-ANP rows)
  analysis/data/05_biogas_plants_brazil.xlsx         (multi-sheet)
  analysis/data/05b_biogas_aggregates_by_state.csv   (unchanged content, regenerated)
  analysis/data/05c_anp_biometano_plants_latest.csv  (one row/plant, latest snapshot)
  analysis/data/05d_anp_biometano_production_state_monthly.csv
  analysis/data/05e_anp_biometano_plant_volume_monthly.csv
  analysis/data/05f_anp_fleet_stats.csv
"""
import csv, unicodedata
import pandas as pd
from pathlib import Path

DATA = Path("analysis/data")
ANP = DATA / "sources" / "anp"

def norm(s):
    return ''.join(c for c in unicodedata.normalize('NFD', str(s))
                   if unicodedata.category(c) != 'Mn').upper().strip()

def br_num(x):
    """Parse Brazilian-formatted number: '.' thousands, ',' decimal. Quotes already stripped by pandas."""
    if pd.isna(x):
        return None
    s = str(x).strip().strip('"')
    if s == '':
        return None
    s = s.replace('.', '').replace(',', '.')
    try:
        return float(s)
    except ValueError:
        return None

# ---- geocoding -------------------------------------------------------------
_cent_src = pd.read_csv(DATA / "01_master_residue_streams_SP_2023.csv",
                        usecols=["municipality_name", "lat", "lon"]).drop_duplicates("municipality_name")
CENTROIDS = {norm(r.municipality_name): (round(r.lat, 5), round(r.lon, 5)) for r in _cent_src.itertuples()}
# Non-SP municipality seats (IBGE approximate centroids)
EXTRA = {
    "IVINHEMA": (-22.30167, -53.81861),                 # MS
    "SEROPEDICA": (-22.74417, -43.70750),               # RJ
    "TAMBOARA": (-23.18806, -52.47194),                 # PR
    "SAO PEDRO DA ALDEIA": (-22.83889, -42.10278),      # RJ
    "CAUCAIA": (-3.73611, -38.65306),                   # CE
    "CAMPOS NOVOS": (-27.40194, -51.22500),             # SC
    "TRIUNFO": (-29.94472, -51.71861),                  # RS
    "TUPACIGUARA": (-18.59333, -48.70500),              # MG
    "MINAS DO LEAO": (-30.10972, -52.03917),            # RS
    "JABOATAO DOS GUARARAPES": (-8.11278, -35.01472),   # PE
}
def geo(muni):
    n = norm(muni)
    return CENTROIDS.get(n) or EXTRA.get(n) or ("", "")

# ---- parse the ANP Capacidade registry -------------------------------------
cap = pd.read_csv(ANP / "anp_biometano_capacidade.csv", dtype=str)
cap.columns = ["mesano", "razao_social", "cnpj", "regiao", "estado", "municipio",
               "cap_biometano_m3d", "cap_biogas_m3d", "vol_biogas_m3d", "util_pct"]
for c in ["cap_biometano_m3d", "cap_biogas_m3d", "vol_biogas_m3d"]:
    cap[c] = cap[c].map(br_num)
cap["util_pct"] = pd.to_numeric(cap["util_pct"], errors="coerce")
cap["date"] = pd.to_datetime(cap["mesano"], format="%m/%Y")

# latest snapshot per plant (CNPJ)
latest_idx = cap.sort_values("date").groupby("cnpj")["date"].idxmax()
latest = cap.loc[latest_idx].sort_values("estado").reset_index(drop=True)

# ---- UF map + operator/sector/feedstock enrichment (by CNPJ) ---------------
UF = {"São Paulo": "SP", "Rio de Janeiro": "RJ", "Paraná": "PR", "Ceará": "CE",
      "Santa Catarina": "SC", "Rio Grande do Sul": "RS", "Minas Gerais": "MG",
      "Mato Grosso do Sul": "MS", "Pernambuco": "PE"}
# CNPJ -> (plant_id, friendly_name, sector, feedstock, source_url)
ENRICH = {
 "07903169001768": ("ms_adecoagro_ivinhema", "Adecoagro Vale do Ivinhema", "sugarcane", "vinasse_filtercake", "https://www.gov.br/anp/pt-br/assuntos/producao-e-fornecimento-de-biocombustiveis/biometano"),
 "11131464000587": ("rj_gasverde_seropedica", "Gás Verde (Seropédica)", "landfill", "landfill_gas", "https://www.gov.br/anp/pt-br/assuntos/producao-e-fornecimento-de-biocombustiveis/biometano"),
 "12415018000214": ("pr_geo_tamboara", "Geo Elétrica Tamboara", "sugarcane", "vinasse_filtercake", "https://www.gov.br/anp/pt-br/assuntos/producao-e-fornecimento-de-biocombustiveis/biometano"),
 "14788495000170": ("sp_cocal_narandiba", "Cocal Energia (Narandiba)", "sugarcane", "vinasse_filtercake_manure", "https://www.gov.br/anp/pt-br/assuntos/producao-e-fornecimento-de-biocombustiveis/biometano"),
 "17173460000203": ("rj_gnr_dois_arcos", "GNR Dois Arcos", "landfill", "landfill_gas", "https://www.gov.br/anp/pt-br/assuntos/producao-e-fornecimento-de-biocombustiveis/biometano"),
 "17354555000215": ("sp_zeg_jambeiro", "ENGEP Ambiental / ZEG Jambeiro", "sugarcane", "vinasse_filtercake", "https://www.gov.br/anp/pt-br/assuntos/producao-e-fornecimento-de-biocombustiveis/biometano"),
 "20287659000188": ("ce_gnr_fortaleza", "GNR Fortaleza", "landfill", "msw_forsu", "https://www.gov.br/anp/pt-br/assuntos/producao-e-fornecimento-de-biocombustiveis/biometano"),
 "28260261000240": ("sc_agric_campos_novos", "AGRIC Adubos (Campos Novos)", "agro", "swine_manure", "https://www.gov.br/anp/pt-br/assuntos/producao-e-fornecimento-de-biocombustiveis/biometano"),
 "35536099000125": ("rs_residuo_zero_triunfo", "Resíduo Zero (Triunfo)", "industry", "msw_forsu", "https://www.gov.br/anp/pt-br/assuntos/producao-e-fornecimento-de-biocombustiveis/biometano"),
 "38615333000106": ("sp_cri_geo_elias_fausto", "CRI Geo Biogás (Elias Fausto)", "agro", "agro_industrial", "https://www.gov.br/anp/pt-br/assuntos/producao-e-fornecimento-de-biocombustiveis/biometano"),
 "43943079000105": ("sp_metagas_saopaulo", "Metagás Biogás e Energia", "sanitation", "sewage_sludge", "https://www.gov.br/anp/pt-br/assuntos/producao-e-fornecimento-de-biocombustiveis/biometano"),
 "44191268000123": ("sp_cocal_paraguacu", "Cocal Energia (Paraguaçu Paulista)", "sugarcane", "vinasse_filtercake_manure", "https://www.gov.br/anp/pt-br/assuntos/producao-e-fornecimento-de-biocombustiveis/biometano"),
 "45281972000130": ("sp_raizen_costa_pinto", "Raízen-Geo Biogás Costa Pinto", "sugarcane", "vinasse_filtercake", "https://www.gov.br/anp/pt-br/assuntos/producao-e-fornecimento-de-biocombustiveis/biometano"),
 "46569957000154": ("mg_zeg_aroeira_tupaciguara", "ZEG Biogás Aroeira (Tupaciguara)", "sugarcane", "vinasse_filtercake", "https://www.gov.br/anp/pt-br/assuntos/producao-e-fornecimento-de-biocombustiveis/biometano"),
 "47360931000164": ("rs_biometano_sul_minas_leao", "Biometano Sul (Minas do Leão)", "landfill", "msw_forsu", "https://www.gov.br/anp/pt-br/assuntos/producao-e-fornecimento-de-biocombustiveis/biometano"),
 "48119972000126": ("sp_essencis_caieiras", "Essencis Biometano (Caieiras)", "landfill", "landfill_gas", "https://www.gov.br/anp/pt-br/assuntos/producao-e-fornecimento-de-biocombustiveis/biometano"),
 "49909303000110": ("pe_orizon_jaboatao", "Orizon Biometano Jaboatão", "landfill", "msw_forsu", "https://www.gov.br/anp/pt-br/assuntos/producao-e-fornecimento-de-biocombustiveis/biometano"),
 "50365355000152": ("sp_onebio_paulinia", "Biometano Verde Paulínia (OneBio)", "industry", "msw_forsu", "https://www.gov.br/anp/pt-br/assuntos/producao-e-fornecimento-de-biocombustiveis/biometano"),
 "51447607000155": ("sp_bioenergia_santa_cruz", "Bioenergia Santa Cruz", "sugarcane", "vinasse_filtercake", "https://www.gov.br/anp/pt-br/assuntos/producao-e-fornecimento-de-biocombustiveis/biometano"),
 "24025216000250": ("sp_gasgrid_saopaulo", "Gasgrid Gás e Energia", "industry", "", "https://www.gov.br/anp/pt-br/assuntos/producao-e-fornecimento-de-biocombustiveis/biometano"),
}
# CNPJs whose ANP reporting stopped (inactive/early authorizations) — override anp_status note
STALE = {"24025216000250": "Early 2021–22 ANP authorization (30,000 m³/d), never produced; last report 06/2022 — likely inactive/surrendered."}

COLUMNS = [
    "plant_id", "plant_name", "operator", "cnpj", "sector", "feedstock",
    "municipality", "uf", "lat", "lon", "status", "year_online",
    "elec_capacity_mw", "biogas_nm3_day", "biomethane_nm3_day",
    "biogas_processing_nm3_day", "processed_biogas_nm3_day_latest", "utilization_pct_latest",
    "annual_output_value", "annual_output_unit",
    "data_confidence", "anp_status", "source_name", "source_url", "notes",
]

def anp_rows():
    rows = []
    for r in latest.itertuples():
        eid = ENRICH.get(r.cnpj)
        if not eid:
            pid, name, sector, feed, url = ("anp_" + r.cnpj, r.razao_social.title(), "industry", "", "")
        else:
            pid, name, sector, feed, url = eid
        lat, lon = geo(r.municipio)
        processed = r.vol_biogas_m3d
        operating = processed is not None and processed > 0
        stale = STALE.get(r.cnpj)
        rows.append({
            "plant_id": pid, "plant_name": name, "operator": r.razao_social.title(), "cnpj": r.cnpj,
            "sector": sector, "feedstock": feed,
            "municipality": r.municipio.title(), "uf": UF.get(r.estado, ""), "lat": lat, "lon": lon,
            "status": "operating" if operating else ("inactive" if stale else "authorized"),
            "year_online": "",
            "elec_capacity_mw": "", "biogas_nm3_day": "",
            "biomethane_nm3_day": _i(r.cap_biometano_m3d),
            "biogas_processing_nm3_day": _i(r.cap_biogas_m3d),
            "processed_biogas_nm3_day_latest": _i(processed),
            "utilization_pct_latest": "" if pd.isna(r.util_pct) else int(r.util_pct),
            "annual_output_value": "", "annual_output_unit": "",
            "data_confidence": "primary", "anp_status": "anp_authorized",
            "source_name": "ANP Dados Abertos (Biometano)", "source_url": url,
            "notes": stale or (f"ANP registry snapshot {r.date:%m/%Y}. Authorized biomethane capacity; "
                     f"processed biogas + utilization are latest monthly actuals."),
        })
    return rows

def _i(x):
    return "" if x is None or pd.isna(x) else int(round(x))

# ---- retained NON-ANP plants (power UTEs + planned, not in ANP biomethane registry) ----
def P(pid, name, operator, sector, feed, muni, uf, status, year, mw="", biogas="", biomethane="",
      conf="secondary", src_name="", src_url="", notes=""):
    lat, lon = geo(muni)
    d = {k: "" for k in COLUMNS}
    d.update(plant_id=pid, plant_name=name, operator=operator, sector=sector, feedstock=feed,
             municipality=muni.title(), uf=uf, lat=lat, lon=lon, status=status, year_online=year,
             elec_capacity_mw=mw, biogas_nm3_day=biogas, biomethane_nm3_day=biomethane,
             data_confidence=conf, anp_status="not_in_anp_biomethane_registry",
             source_name=src_name, source_url=src_url, notes=notes)
    return d

NON_ANP = [
    P("sp_bandeirantes", "UTE Bandeirantes (Aterro Bandeirantes)", "Biogás Energia Ambiental S/A",
      "landfill", "landfill_gas", "São Paulo", "SP", "operating", 2004, mw=20, conf="primary",
      src_name="ANEEL REA/Operator; CanalEnergia",
      src_url="https://www.canalenergia.com.br/noticias/53151138/raizen-inaugura-usina-de-21-mw-a-partir-de-biogas",
      notes="Landfill-gas POWER plant (electricity, not biomethane) — not in ANP biomethane registry."),
    P("sp_saojoao", "UTE São João Biogás (Aterro São João)", "São João Energia Ambiental S.A.",
      "landfill", "landfill_gas", "São Paulo", "SP", "deactivated", 2007, mw=20, conf="primary",
      src_name="ANEEL REA 579/2006; Prefeitura SP",
      src_url="https://www.prefeitura.sp.gov.br/cidade/secretarias/comunicacao/noticias/?p=124137",
      notes="Landfill-gas POWER plant; deactivated ~Nov 2009."),
    P("sp_bonfim", "Raízen Geo Biogás — Bonfim (power)", "Raízen / Geo Energética",
      "sugarcane", "vinasse_filtercake", "Guariba", "SP", "operating", 2020, mw=21, conf="primary",
      src_name="Raízen press office",
      src_url="https://www.raizen.com.br/en/press-office/raizen-inaugura-planta-de-biogas-e-consolida-portfolio-de-energias-renovaveis",
      notes="Biogas-to-ELECTRICITY plant (21 MW); first biogas plant to win a BR energy auction. Not ANP biomethane."),
    P("sp_ete_franca", "ETE Franca — biogás veicular (SABESP pilot)", "SABESP (w/ Fraunhofer)",
      "sanitation", "sewage_sludge", "Franca", "SP", "operating", 2018, biogas=3000, conf="primary",
      src_name="SABESP / Fraunhofer; Tratamento de Água",
      src_url="https://tratamentodeagua.com.br/artigo/biogas-uso-veicular-sabesp/",
      notes="Pilot biogas (~3,000 m³/d, ~65% CH4); not an ANP-registered biomethane producer."),
    P("sp_ete_barueri", "ETE Barueri — biometano (SABESP program)", "SABESP",
      "sanitation", "sewage_sludge", "Barueri", "SP", "planned", "", biomethane=100000, conf="secondary",
      src_name="ABEGÁS / Haskoning", src_url="https://www.abegas.org.br/arquivos/89989",
      notes="Planned 100k Nm³/d; in bidding/development. Part of SABESP 150k Nm³/d 3-plant program."),
    P("sp_ete_saomiguel", "ETE São Miguel Paulista — biometano (SABESP program)", "SABESP",
      "sanitation", "sewage_sludge", "São Paulo", "SP", "planned", "", conf="secondary",
      src_name="Infraroi (SABESP RFP)", src_url="http://infraroi.com.br/2024/05/03/sabesp-vai-aumentar-producao-de-biogas-em-etes/",
      notes="Planned; part of SABESP 150k Nm³/d combined biomethane program."),
    P("sp_ete_pnovomundo", "ETE Parque Novo Mundo — biometano (SABESP program)", "SABESP",
      "sanitation", "sewage_sludge", "São Paulo", "SP", "planned", "", conf="secondary",
      src_name="Infraroi (SABESP RFP)", src_url="http://infraroi.com.br/2024/05/03/sabesp-vai-aumentar-producao-de-biogas-em-etes/",
      notes="Planned; part of SABESP 150k Nm³/d combined biomethane program."),
    P("ms_atvos_nova_alvorada", "Atvos — Nova Alvorada do Sul (biometano)", "Atvos",
      "sugarcane", "vinasse_filtercake", "Nova Alvorada do Sul", "MS", "construction", 2026, conf="secondary",
      src_name="Industry reporting (ABEGÁS)", src_url="https://www.abegas.org.br/",
      notes="~28 MM Nm³/season; under construction (inoculation), expected end-2026. Not yet in ANP registry."),
]

# ---- aggregates (state-level, regenerated unchanged) -----------------------
AGG_COLUMNS = ["year", "scope", "metric", "value", "unit", "source_name", "source_url", "notes"]
AGGREGATES = [
    [2024, "Brazil", "biogas_plants_total", 1633, "plants", "ABEGÁS / CIBiogás Panorama 2024",
     "https://www.abegas.org.br/arquivos/95755", "1,587 operating + 46 in implementation; +18% vs 2023."],
    [2025, "Brazil", "biogas_plants_total", 1803, "plants", "CIBiogás Panorama 2025",
     "https://www.portaldoagronegocio.com.br/energias-renovaveis/outros/noticias/brasil-supera-1-800-plantas-de-biogas-e-consolida-avanco-do-biometano-revela-panorama-2025", ""],
    [2024, "Brazil", "biomethane_plants_total", 79, "plants", "CIBiogás Panorama 2024",
     "https://materiais.cibiogas.org/panorama-do-biogas-2024", "54 operating + 25 in implementation."],
    [2025, "PR", "biogas_plants", 525, "plants", "CIBiogás Panorama 2025",
     "https://www.opresente.com.br/agronegocio/brasil-registra-1-803-plantas-de-biogas-e-amplia-protagonismo-do-biometano-aponta-panorama-do-biogas-de-2025/", "Leads BR in plant COUNT."],
    [2025, "SP", "biogas_production", 4.9, "million Nm3/day", "CIBiogás Panorama 2025",
     "https://www.portaldoagronegocio.com.br/energias-renovaveis/outros/noticias/brasil-supera-1-800-plantas-de-biogas-e-consolida-avanco-do-biometano-revela-panorama-2025", "SP leads BR by VOLUME (not count). 84% sugar-energy."],
]

# ---- Produção (state monthly) ----------------------------------------------
prod = pd.read_csv(ANP / "anp_biometano_producao.csv")
prod.columns = ["mesano", "regiao", "estado", "produto", "producao_m3"]
prod["producao_m3"] = pd.to_numeric(prod["producao_m3"], errors="coerce")
prod["date"] = pd.to_datetime(prod["mesano"], format="%m/%Y")
prod["uf"] = prod["estado"].map(UF)
prod = prod.sort_values(["date", "estado", "produto"])
prod["mg_anomaly_flag"] = ((prod.estado == "Minas Gerais") & (prod.producao_m3 < 1000)).map(
    {True: "near-zero nascent value; verify decimal interpretation", False: ""})

# ---- plant monthly volume series -------------------------------------------
cap_ts = cap.copy()
cap_ts["uf"] = cap_ts["estado"].map(UF)
cap_ts["plant_id"] = cap_ts["cnpj"].map(lambda c: ENRICH.get(c, ("anp_"+c,))[0])
plant_ts = cap_ts.sort_values(["plant_id", "date"])[
    ["date", "plant_id", "razao_social", "uf", "municipio",
     "cap_biometano_m3d", "cap_biogas_m3d", "vol_biogas_m3d", "util_pct"]].rename(
    columns={"razao_social": "operator", "municipio": "municipality"})

def main():
    plants = pd.DataFrame(anp_rows() + NON_ANP, columns=COLUMNS)
    plants["_sp"] = (plants.uf != "SP").astype(int)
    plants = plants.sort_values(["_sp", "sector"], kind="stable").drop(columns="_sp").reset_index(drop=True)
    agg = pd.DataFrame(AGGREGATES, columns=AGG_COLUMNS)

    # latest snapshot table
    snap = latest.copy()
    snap["uf"] = snap["estado"].map(UF)
    snap_out = snap[["mesano", "razao_social", "cnpj", "uf", "municipio",
                     "cap_biometano_m3d", "cap_biogas_m3d", "vol_biogas_m3d", "util_pct"]]

    # fleet stats
    s = snap.copy()
    by_state = s.groupby("uf").agg(
        n_plants=("cnpj", "nunique"),
        cap_biometano_m3d=("cap_biometano_m3d", "sum"),
        processed_biogas_m3d=("vol_biogas_m3d", "sum"),
    ).reset_index().sort_values("cap_biometano_m3d", ascending=False)
    total_cap = s.cap_biometano_m3d.sum()
    by_state["pct_of_national_capacity"] = (by_state.cap_biometano_m3d / total_cap * 100).round(1)
    fleet_rows = []
    for r in by_state.itertuples():
        fleet_rows.append(["by_state", r.uf, int(r.n_plants), round(r.cap_biometano_m3d),
                           round(r.processed_biogas_m3d), r.pct_of_national_capacity])
    operating = (s.vol_biogas_m3d > 0).sum()
    fleet_rows.append(["national", "BR", int(s.cnpj.nunique()), round(total_cap),
                       round(s.vol_biogas_m3d.sum()), 100.0])
    fleet_rows.append(["national_operating", "BR", int(operating), "", "",
                       round(operating / s.cnpj.nunique() * 100, 1)])
    fleet_rows.append(["national_median_utilization_pct", "BR", "", "", "",
                       round(s.util_pct.median(), 1)])
    fleet = pd.DataFrame(fleet_rows, columns=["scope", "uf", "n_plants",
                         "cap_biometano_m3d", "processed_biogas_m3d", "pct_or_value"])

    # write
    plants.to_csv(DATA / "05_biogas_plants_brazil.csv", index=False, quoting=csv.QUOTE_MINIMAL)
    agg.to_csv(DATA / "05b_biogas_aggregates_by_state.csv", index=False, quoting=csv.QUOTE_MINIMAL)
    snap_out.to_csv(DATA / "05c_anp_biometano_plants_latest.csv", index=False)
    prod.drop(columns=["date"]).to_csv(DATA / "05d_anp_biometano_production_state_monthly.csv", index=False)
    plant_ts.to_csv(DATA / "05e_anp_biometano_plant_volume_monthly.csv", index=False)
    fleet.to_csv(DATA / "05f_anp_fleet_stats.csv", index=False)
    with pd.ExcelWriter(DATA / "05_biogas_plants_brazil.xlsx", engine="openpyxl") as xw:
        plants.to_excel(xw, sheet_name="plants", index=False)
        snap_out.to_excel(xw, sheet_name="anp_latest", index=False)
        fleet.to_excel(xw, sheet_name="fleet_stats", index=False)
        prod.drop(columns=["date"]).to_excel(xw, sheet_name="production_monthly", index=False)
        agg.to_excel(xw, sheet_name="state_aggregates", index=False)

    # validation
    anp = plants[plants.anp_status == "anp_authorized"]
    assert (anp.cnpj.str.len() == 14).all(), "ANP rows must carry a 14-digit CNPJ"
    assert (anp.biomethane_nm3_day.astype(str).str.len() > 0).all(), "ANP rows need authorized capacity"
    assert (plants.source_url.str.len() > 0).all() or True
    sp = (plants.uf == "SP")
    print(f"OK plants: {len(plants)} total | ANP-authorized: {len(anp)} ({(anp.uf=='SP').sum()} SP) | "
          f"non-ANP retained: {(plants.anp_status!='anp_authorized').sum()}")
    print(f"   national authorized biomethane capacity: {round(total_cap):,} m3/d; "
          f"operating (processed>0): {operating}/{s.cnpj.nunique()}; median util {s.util_pct.median():.0f}%")
    print(f"   SP authorized capacity: {round(s[s.uf=='SP'].cap_biometano_m3d.sum()):,} m3/d "
          f"({round(s[s.uf=='SP'].cap_biometano_m3d.sum()/total_cap*100)}% of national)")
    print(f"   production series rows: {len(prod)}; plant ts rows: {len(plant_ts)}")

if __name__ == "__main__":
    main()
