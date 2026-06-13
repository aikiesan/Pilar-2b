#!/usr/bin/env python3
"""
Build the real-world Brazilian biogas/biomethane plants dataset for Pilar-2b.

Scope (owner-approved): São Paulo exhaustive + major national plants.
Every row carries a source_url; electrical capacity (MW) and gas volume (Nm³/day)
are kept in SEPARATE columns and never conflated. Aggregate (state-level) figures
live in a companion file, not mixed with plant-level rows.

Data provenance: operator-official pages and reports citing official figures,
gathered via a deep-research web sweep (June 2026). The ANEEL SIGA open-data CSV
and the ABiogás Panorama/SP PDFs are blocked by this environment's network egress
policy, so electrical-capacity rows that would be ANEEL-confirmed are marked
data_confidence='secondary' with the ANEEL URL noted for manual verification.

Outputs:
  analysis/data/05_biogas_plants_brazil.csv
  analysis/data/05b_biogas_aggregates_by_state.csv
  analysis/data/05_biogas_plants_brazil.xlsx   (two sheets)
"""
import csv
import pandas as pd
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] if (Path(__file__).resolve().parents[1] / "analysis").exists() else Path(".")
DATA = Path("analysis/data")

# ---- geocoding: reuse existing SP municipality centroids -------------------
_cent = pd.read_csv(
    DATA / "01_master_residue_streams_SP_2023.csv",
    usecols=["municipality_name", "lat", "lon"],
).drop_duplicates("municipality_name")
CENTROIDS = {r.municipality_name: (round(r.lat, 5), round(r.lon, 5)) for r in _cent.itertuples()}

# Non-SP municipalities geocoded from public sources (IBGE seat coordinates).
EXTRA_CENTROIDS = {
    "Caucaia": (-3.73583, -38.65306),          # CE
    "Jaboatão dos Guararapes": (-8.11296, -35.01468),  # PE
    "Campos Novos": (-27.40194, -51.22500),    # SC
    "Nova Alvorada do Sul": (-21.46556, -54.38250),  # MS
    "Seropédica": (-22.74417, -43.70750),      # RJ (Gás Verde / Barra Mansa region varies)
}

def geo(muni, uf):
    if uf == "SP" and muni in CENTROIDS:
        return CENTROIDS[muni]
    if muni in EXTRA_CENTROIDS:
        return EXTRA_CENTROIDS[muni]
    return ("", "")

# ---- column schema (validation_plants-compatible) --------------------------
COLUMNS = [
    "plant_id", "plant_name", "operator", "sector", "feedstock",
    "municipality", "uf", "lat", "lon", "status", "year_online",
    "elec_capacity_mw", "biogas_nm3_day", "biomethane_nm3_day",
    "annual_output_value", "annual_output_unit",
    "data_confidence", "source_name", "source_url", "notes",
]

# sector vocab: landfill | sugarcane | sanitation | agro | industry
# status vocab: operating | construction | planned | deactivated
# data_confidence: primary (operator/official report) | secondary (news citing official)

def P(plant_id, name, operator, sector, feedstock, muni, uf, status, year,
      mw="", biogas="", biomethane="", out_v="", out_u="",
      conf="secondary", src_name="", src_url="", notes=""):
    lat, lon = geo(muni, uf)
    return dict(zip(COLUMNS, [
        plant_id, name, operator, sector, feedstock, muni, uf, lat, lon, status, year,
        mw, biogas, biomethane, out_v, out_u, conf, src_name, src_url, notes,
    ]))

PLANTS = [
    # ===================== SÃO PAULO — LANDFILL =====================
    P("sp_bandeirantes", "UTE Bandeirantes (Aterro Bandeirantes)", "Biogás Energia Ambiental S/A",
      "landfill", "landfill_gas", "São Paulo", "SP", "operating", 2004,
      mw=20, out_v=170000, out_u="MWh/year",
      conf="primary", src_name="ANEEL REA/Operator; CanalEnergia",
      src_url="https://www.canalenergia.com.br/noticias/53151138/raizen-inaugura-usina-de-21-mw-a-partir-de-biogas",
      notes="Perus district; 24x 925 kW gensets; among the first large landfill-gas plants in BR."),
    P("sp_saojoao", "UTE São João Biogás (Aterro São João)", "São João Energia Ambiental S.A.",
      "landfill", "landfill_gas", "São Paulo", "SP", "deactivated", 2007,
      mw=20,
      conf="primary", src_name="ANEEL REA 579/2006; Prefeitura SP",
      src_url="https://www.prefeitura.sp.gov.br/cidade/secretarias/comunicacao/noticias/?p=124137",
      notes="ANEEL authorization REA 579 (2006); facility deactivated ~Nov 2009. ANEEL SIGA would confirm fiscalised capacity."),
    P("sp_caieiras", "Termoverde Caieiras / Gás Verde biomethane", "Solví Essencis Ambiental; Gás Verde (Urca Energia)",
      "landfill", "landfill_gas", "Caieiras", "SP", "operating", 2016,
      mw=29.5, biomethane=70000,
      conf="primary", src_name="Operator (Gás Verde/Solví); CPG",
      src_url="https://canalsolar.com.br/en/Caieiras-landfill-biomethane-production/",
      notes="Largest landfill in Latin America. 29.5 MW power (2016); biomethane upgrading 70k Nm³/d (2024); grid injection from 2019."),

    # ===================== SÃO PAULO — SUGARCANE =====================
    P("sp_bonfim", "Raízen Geo Biogás — Bonfim", "Raízen / Geo Energética (JV)",
      "sugarcane", "vinasse_filtercake", "Guariba", "SP", "operating", 2020,
      mw=21, biogas=187000, out_v=138000, out_u="MWh/year",
      conf="primary", src_name="Raízen press office",
      src_url="https://www.raizen.com.br/en/press-office/raizen-inaugura-planta-de-biogas-e-consolida-portfolio-de-energias-renovaveis",
      notes="First biogas plant to win a Brazilian energy auction. ~9,200 m³/d vinasse + filter cake; R$153M."),
    P("sp_costapinto", "Raízen Costa Pinto — biomethane", "Raízen / Geo Energética",
      "sugarcane", "vinasse_filtercake", "Piracicaba", "SP", "construction", 2025,
      biomethane=71233, out_v=26000000, out_u="Nm3/year",
      conf="secondary", src_name="RPAnews / Bioenergy International",
      src_url="https://revistarpanews.com.br/raizen-investe-r-300-milhoes-na-construcao-da-planta-de-biogas-em-piracicaba/",
      notes="~26 MM Nm³/yr biomethane (~71,233 Nm³/d). Offtake VW (50k Nm³/d) + Yara (20k Nm³/d). R$300M. Year/status vary by source (2023–2025)."),
    P("sp_narandiba", "Cocal Geo Biogás — Narandiba", "Cocal / Geo Energética (JV)",
      "sugarcane", "vinasse_filtercake_manure", "Narandiba", "SP", "operating", 2022,
      biomethane=25000,
      conf="primary", src_name="GeoBiogás / Cocal",
      src_url="https://www.geobiogas.tech/en/plantas/cocal-geo-biogas",
      notes="First dedicated biomethane pipeline in Brazil (~65 km, w/ Necta/GasBrasiliano). R$150M."),
    P("sp_paraguacu", "Cocal Geo Biogás — Paraguaçu Paulista", "Cocal / Geo Energética",
      "sugarcane", "vinasse_filtercake_manure", "Paraguaçu Paulista", "SP", "operating", 2025,
      biomethane=60000,
      conf="primary", src_name="Cocal official",
      src_url="https://www.cocal.com.br/noticias/biometano/cocal-inicia-a-operacao-da-sua-segunda-planta-de-biogás-no-oeste-de-sao-paulo/",
      notes="Operation began Sept 2025. R$216M. Vinasse/filter cake/manure stored for year-round feed."),
    P("sp_zeg_jambeiro", "ZEG Biogás — Jambeiro", "ZEG Biogás",
      "sugarcane", "vinasse_filtercake", "Jambeiro", "SP", "operating", 2023,
      biomethane=30000,
      conf="secondary", src_name="ZEG Biogás (industry reporting)",
      src_url="https://www.abegas.org.br/",
      notes="~30k Nm³/d biomethane. Confirm capacity/year against operator page or ANP authorization."),

    # ===================== SÃO PAULO — MSW (FORSU) =====================
    P("sp_onebio_paulinia", "OneBio (Biometano Verde Paulínia)", "Edge (51%) / Orizon VR (49%)",
      "industry", "msw_forsu", "Paulínia", "SP", "operating", 2026,
      biomethane=225000,
      conf="primary", src_name="Brasil 61 / BNDES",
      src_url="https://brasil61.com/n/maior-planta-de-biometano-do-brasil-e-inaugurada-em-paulinia-sp-bras2616017",
      notes="Largest biomethane plant in Brazil (225k m³/d). Inaugurated Mar 2026, ~50% capacity as of Mar 2026. BNDES R$450M."),

    # ===================== SÃO PAULO — SANITATION (SABESP) =====================
    P("sp_ete_franca", "ETE Franca — biogás veicular (SABESP pilot)", "SABESP (w/ Fraunhofer)",
      "sanitation", "sewage_sludge", "Franca", "SP", "operating", 2018,
      biogas=3000,
      conf="primary", src_name="SABESP / Fraunhofer; Tratamento de Água",
      src_url="https://tratamentodeagua.com.br/artigo/biogas-uso-veicular-sabesp/",
      notes="Pilot: ~3,000 m³/d biogas, ~65% CH4; fuels ~40 SABESP CNG vehicles. ETE capacity 550 L/s."),
    P("sp_ete_barueri", "ETE Barueri — biometano (SABESP program)", "SABESP",
      "sanitation", "sewage_sludge", "Barueri", "SP", "planned", "",
      biomethane=100000,
      conf="secondary", src_name="ABEGÁS / Haskoning",
      src_url="https://www.abegas.org.br/arquivos/89989",
      notes="Largest WWTP in Latin America. 100k Nm³/d biomethane target; in bidding/development (2024+). Part of 150k Nm³/d 3-plant program."),
    P("sp_ete_saomiguel", "ETE São Miguel Paulista — biometano (SABESP program)", "SABESP",
      "sanitation", "sewage_sludge", "São Paulo", "SP", "planned", "",
      conf="secondary", src_name="Infraroi (SABESP RFP)",
      src_url="http://infraroi.com.br/2024/05/03/sabesp-vai-aumentar-producao-de-biogas-em-etes/",
      notes="Part of SABESP 150k Nm³/d combined biomethane program (Barueri + São Miguel + Parque Novo Mundo)."),
    P("sp_ete_pnovomundo", "ETE Parque Novo Mundo — biometano (SABESP program)", "SABESP",
      "sanitation", "sewage_sludge", "São Paulo", "SP", "planned", "",
      conf="secondary", src_name="Infraroi (SABESP RFP)",
      src_url="http://infraroi.com.br/2024/05/03/sabesp-vai-aumentar-producao-de-biogas-em-etes/",
      notes="Part of SABESP 150k Nm³/d combined biomethane program."),

    # ===================== NATIONAL — MAJOR PLANTS =====================
    P("rj_gasverde", "Gás Verde — Seropédica/Barra Mansa biomethane", "Gás Verde (Grupo Urca Energia)",
      "landfill", "landfill_gas", "Seropédica", "RJ", "operating", "",
      biomethane=160000,
      conf="secondary", src_name="Brasil Energia",
      src_url="https://brasilenergia.com.br/brasilenergia/acoes-em-transicao-energetica/sao-paulo-sem-a-eletrificacao-da-frota-recorre-ao-biometano",
      notes="~160k m³/d across 2 plants; expansion to 650k m³/d by 2028 announced. Largest landfill-biomethane operator in BR."),
    P("ce_gnr_fortaleza", "GNR Fortaleza", "MDC Group / Marquise",
      "landfill", "landfill_gas", "Caucaia", "CE", "operating", 2018,
      biomethane=100000,
      conf="secondary", src_name="CanalEnergia",
      src_url="https://www.canalenergia.com.br/noticias/53248273/gnr-fortaleza-pretende-aumentar-producao-da-planta-para-108-mil-m%C2%B3-de-biometano-dia",
      notes="First landfill biomethane plant in BR (2018). 100k m³/d, expandable to 108k."),
    P("pe_orizon_jaboatao", "Orizon — Jaboatão (Ecoparque Pernambuco)", "Orizon VR",
      "landfill", "msw_forsu", "Jaboatão dos Guararapes", "PE", "operating", 2025,
      biomethane=108000,
      conf="secondary", src_name="Orizon VR (industry reporting)",
      src_url="https://brasilenergia.com.br/energia/gas/edge-e-orizon-vao-comercializar-biometano-da-planta-onebio",
      notes="108k m³/d landfill biomethane. Orizon operates 17 ecoparks."),
    P("sc_h2a_campos_novos", "H2A Bioenergia — Campos Novos", "H2A Bioenergia / Copercampos",
      "agro", "swine_manure", "Campos Novos", "SC", "operating", 2026,
      biomethane=40000,
      conf="secondary", src_name="Folha de Florianópolis",
      src_url="https://www.folhadeflorianopolis.com.br/noticia/biometano-consolida-a-terceira-safra-e-impulsiona-plano-de-r-2-9-bilhoes-no-brasil",
      notes="Swine-manure biomethane (~40k m³/d, estimated). Part of H2A 22-plant / R$2.9bn plan."),
    P("ms_atvos_nova_alvorada", "Atvos — Nova Alvorada do Sul (biometano)", "Atvos",
      "sugarcane", "vinasse_filtercake", "Nova Alvorada do Sul", "MS", "construction", 2026,
      out_v=28000000, out_u="Nm3/season",
      conf="secondary", src_name="Industry reporting (ABEGÁS)",
      src_url="https://www.abegas.org.br/",
      notes="~28 MM Nm³/season (~76,712 Nm³/d). Under construction (inoculation phase), expected end-2026."),
]

# ---- aggregate (state-level) figures — kept SEPARATE -----------------------
AGGREGATES = [
    # year, scope, metric, value, unit, source_name, source_url, notes
    [2024, "Brazil", "biogas_plants_total", 1633, "plants", "ABEGÁS / CIBiogás Panorama 2024",
     "https://www.abegas.org.br/arquivos/95755", "1,587 operating + 46 in implementation; +18% vs 2023."],
    [2025, "Brazil", "biogas_plants_total", 1803, "plants", "CIBiogás Panorama 2025",
     "https://www.portaldoagronegocio.com.br/energias-renovaveis/outros/noticias/brasil-supera-1-800-plantas-de-biogas-e-consolida-avanco-do-biometano-revela-panorama-2025", ""],
    [2024, "Brazil", "biomethane_plants_total", 79, "plants", "CIBiogás Panorama 2024",
     "https://materiais.cibiogas.org/panorama-do-biogas-2024", "54 operating + 25 in implementation."],
    [2024, "Brazil", "biogas_volume_capacity", 667, "million Nm3/year", "CIBiogás Panorama 2024",
     "https://materiais.cibiogas.org/panorama-do-biogas-2024", "Registered capacity."],
    [2025, "PR", "biogas_plants", 525, "plants", "CIBiogás Panorama 2025",
     "https://www.opresente.com.br/agronegocio/brasil-registra-1-803-plantas-de-biogas-e-amplia-protagonismo-do-biometano-aponta-panorama-do-biogas-de-2025/", "Leads BR in plant COUNT."],
    [2025, "MG", "biogas_plants", 387, "plants", "CIBiogás Panorama 2025",
     "https://www.opresente.com.br/agronegocio/brasil-registra-1-803-plantas-de-biogas-e-amplia-protagonismo-do-biometano-aponta-panorama-do-biogas-de-2025/", ""],
    [2025, "SC", "biogas_plants", 161, "plants", "CIBiogás Panorama 2025",
     "https://www.opresente.com.br/agronegocio/brasil-registra-1-803-plantas-de-biogas-e-amplia-protagonismo-do-biometano-aponta-panorama-do-biogas-de-2025/", ""],
    [2025, "SP", "biogas_plants", 181, "plants", "CIBiogás Panorama 2025 / WBA",
     "https://www.worldbiogasassociation.org/why-brazil-is-the-biogas-market-you-dont-want-to-miss/", "2024 ed. showed ~134; counts edition-sensitive."],
    [2025, "GO", "biogas_plants", 131, "plants", "CIBiogás Panorama 2025",
     "https://www.opresente.com.br/agronegocio/brasil-registra-1-803-plantas-de-biogas-e-amplia-protagonismo-do-biometano-aponta-panorama-do-biogas-de-2025/", ""],
    [2025, "SP", "biogas_production", 4.9, "million Nm3/day", "CIBiogás Panorama 2025",
     "https://www.portaldoagronegocio.com.br/energias-renovaveis/outros/noticias/brasil-supera-1-800-plantas-de-biogas-e-consolida-avanco-do-biometano-revela-panorama-2025", "SP leads BR by VOLUME (not count). 84% sugar-energy sector."],
    [2025, "RJ", "biogas_production", 1.8, "million Nm3/day", "CIBiogás Panorama 2025",
     "https://www.portaldoagronegocio.com.br/energias-renovaveis/outros/noticias/brasil-supera-1-800-plantas-de-biogas-e-consolida-avanco-do-biometano-revela-panorama-2025", ""],
    [2025, "PR", "biogas_production", 1.5, "million Nm3/day", "CIBiogás Panorama 2025",
     "https://www.portaldoagronegocio.com.br/energias-renovaveis/outros/noticias/brasil-supera-1-800-plantas-de-biogas-e-consolida-avanco-do-biometano-revela-panorama-2025", ""],
    [2026, "SP", "biomethane_production", 0.7, "million m3/day", "Agência SP",
     "https://www.agenciasp.sp.gov.br/sao-paulo-avanca-na-descarbonizacao-e-se-prepara-para-superar-700-mil-m%C2%B3-dia-de-biometano-ate-2026/", "~9 operating plants; target >700k m³/d by Dec 2026."],
]
AGG_COLUMNS = ["year", "scope", "metric", "value", "unit", "source_name", "source_url", "notes"]

def main():
    plants = pd.DataFrame(PLANTS, columns=COLUMNS)
    # SP rows first, then the rest, stable within each
    plants["_sp"] = (plants.uf != "SP").astype(int)
    plants = plants.sort_values(["_sp"], kind="stable").drop(columns="_sp").reset_index(drop=True)

    agg = pd.DataFrame(AGGREGATES, columns=AGG_COLUMNS)

    plants.to_csv(DATA / "05_biogas_plants_brazil.csv", index=False, quoting=csv.QUOTE_MINIMAL)
    agg.to_csv(DATA / "05b_biogas_aggregates_by_state.csv", index=False, quoting=csv.QUOTE_MINIMAL)

    with pd.ExcelWriter(DATA / "05_biogas_plants_brazil.xlsx", engine="openpyxl") as xw:
        plants.to_excel(xw, sheet_name="plants", index=False)
        agg.to_excel(xw, sheet_name="state_aggregates", index=False)

    # ---- validation gates ----
    assert (plants.source_url.str.len() > 0).all(), "row missing source_url"
    assert plants.sector.isin({"landfill", "sugarcane", "sanitation", "agro", "industry"}).all()
    assert plants.status.isin({"operating", "construction", "planned", "deactivated"}).all()
    assert plants.data_confidence.isin({"primary", "secondary"}).all()
    sp = (plants.uf == "SP").sum()
    geocoded = ((plants.lat != "") & (plants.uf == "SP")).sum()
    print(f"OK: {len(plants)} plants ({sp} SP / {len(plants)-sp} other), "
          f"{geocoded}/{sp} SP geocoded; {len(agg)} aggregate figures.")
    print("primary:", (plants.data_confidence == 'primary').sum(),
          "secondary:", (plants.data_confidence == 'secondary').sum())

if __name__ == "__main__":
    main()
