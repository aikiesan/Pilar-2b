"""Every word the municipal dossier prints, in each language it is offered in.

The workbook and the PDF report (app.services.municipality_exports) take a
``lang`` — "pt-BR", the default, or "en" — and hold no copy of their own. The
two catalogs must define exactly the same keys; tests/unit/services/
test_dossier_text.py checks that, so a string added in one language only fails
the suite instead of surfacing as a KeyError in a download.
"""

from __future__ import annotations

from typing import Literal

Lang = Literal["pt-BR", "en"]
LANGS: tuple[Lang, ...] = ("pt-BR", "en")
DEFAULT_LANG: Lang = "pt-BR"

# Residues in dossier order, each with its sector. Every residue maps to the
# column prefix the municipalities table uses.
RESIDUE_SECTORS: tuple[tuple[str, str], ...] = (
    ("sugarcane", "agricultural"),
    ("soybean", "agricultural"),
    ("corn", "agricultural"),
    ("coffee", "agricultural"),
    ("citrus", "agricultural"),
    ("cattle", "livestock"),
    ("swine", "livestock"),
    ("poultry", "livestock"),
    ("aquaculture", "livestock"),
    ("rsu", "urban"),
    ("rpo", "urban"),
    ("sewage", "urban"),
    ("forestry", "forestry"),
)

SECTORS: tuple[str, ...] = ("agricultural", "livestock", "urban", "forestry")

RESIDUE_NAMES: dict[Lang, dict[str, str]] = {
    "pt-BR": {
        "sugarcane": "Cana-de-açúcar",
        "soybean": "Soja",
        "corn": "Milho",
        "coffee": "Café",
        "citrus": "Citros",
        "cattle": "Bovinos",
        "swine": "Suínos",
        "poultry": "Aves",
        "aquaculture": "Aquicultura",
        "rsu": "RSU — resíduos sólidos urbanos",
        "rpo": "RPO — resíduos de poda",
        "sewage": "Esgoto",
        "forestry": "Florestal",
    },
    "en": {
        "sugarcane": "Sugarcane",
        "soybean": "Soybean",
        "corn": "Corn",
        "coffee": "Coffee",
        "citrus": "Citrus",
        "cattle": "Cattle",
        "swine": "Swine",
        "poultry": "Poultry",
        "aquaculture": "Aquaculture",
        "rsu": "MSW — municipal solid waste",
        "rpo": "Urban pruning",
        "sewage": "Sewage",
        "forestry": "Forestry",
    },
}

SECTOR_NAMES: dict[Lang, dict[str, str]] = {
    "pt-BR": {
        "agricultural": "Agrícola",
        "livestock": "Pecuária",
        "urban": "Urbano",
        "forestry": "Florestal",
    },
    "en": {
        "agricultural": "Agricultural",
        "livestock": "Livestock",
        "urban": "Urban",
        "forestry": "Forestry",
    },
}

# The backend's potential-category codes, as a reader sees them.
POTENTIAL_CATEGORIES: dict[Lang, dict[str, str]] = {
    "pt-BR": {"ALTO": "Alto", "MEDIO": "Médio", "MÉDIO": "Médio", "BAIXO": "Baixo"},
    "en": {"ALTO": "High", "MEDIO": "Medium", "MÉDIO": "Medium", "BAIXO": "Low"},
}

TEXT: dict[Lang, dict[str, str]] = {
    "pt-BR": {
        # Sheet names (Excel caps them at 31 characters)
        "sheet_summary": "Resumo",
        "sheet_sectors": "Por setor",
        "sheet_residues": "Por resíduo",
        "sheet_series": "Séries temporais",
        "sheet_infra": "Infraestrutura",
        "sheet_sources": "Fontes e notas",
        # Summary sheet
        "col_indicator": "Indicador",
        "col_value": "Valor",
        "col_unit": "Unidade",
        "sec_identification": "IDENTIFICAÇÃO",
        "municipality": "Município",
        "ibge_code": "Código IBGE",
        "uf": "UF",
        "immediate_region": "Região imediata",
        "intermediate_region": "Região intermediária",
        "area": "Área",
        "population": "População",
        "population_unit": "hab. ({year})",
        "density": "Densidade demográfica",
        "density_unit": "hab./km²",
        "sec_biogas": "POTENCIAL DE BIOGÁS",
        "total_potential": "Potencial total",
        "daily_potential": "Potencial diário",
        "potential_class": "Classe de potencial",
        "sec_energy": "ENERGIA E EMISSÕES",
        "energy_potential": "Energia potencial",
        "co2_avoided": "CO₂ evitado",
        "sec_biomass": "BIOMASSA",
        "total_biomass": "Biomassa total",
        "sec_methane": "METANO (CH₄)",
        "ch4_real": "CH₄ cenário Real (CP2b N4)",
        "ch4_ideal": "CH₄ cenário Ideal (CP2b N3)",
        "sec_provenance": "PROCEDÊNCIA",
        "data_confidence": "Confiança dos dados",
        "extracted_at": "Extraído em (UTC)",
        "source": "Fonte",
        "unit_m3_year": "m³/ano",
        "unit_m3_day": "m³/dia",
        "unit_mwh_year": "MWh/ano",
        "unit_kwh_day": "kWh/dia",
        "unit_t_year": "t/ano",
        # Sector and residue sheets
        "col_sector": "Setor",
        "col_residue": "Resíduo",
        "col_biomass": "Biomassa (t/ano)",
        "col_biogas": "Biogás (m³/ano)",
        "col_ch4_real": "CH₄ Real (m³/ano)",
        "col_ch4_ideal": "CH₄ Ideal (m³/ano)",
        "col_energy": "Energia (MWh/ano)",
        "col_factor": "Fator de conversão",
        "col_factor_unit": "Unidade do fator",
        "col_share": "% do biogás",
        "total": "TOTAL",
        # Time series and infrastructure sheets
        "no_series": "(sem séries temporais para este município)",
        "col_year": "Ano",
        "col_variable": "Variável",
        "col_quality": "Qualidade",
        "no_infra": "(nenhuma infraestrutura registrada neste município)",
        "col_layer": "Camada",
        "col_name": "Nome",
        "col_attributes": "Atributos",
        # Sources sheet
        "col_item": "Item",
        "col_detail": "Detalhe",
        "sec_data_provenance": "PROCEDÊNCIA DOS DADOS",
        "sec_series_sources": "FONTES DAS SÉRIES TEMPORAIS",
        "sec_typology": "TIPOLOGIA / RELAÇÃO C:N",
        "cn_molar": "C:N média aritmética (cn_molar)",
        "cn_harm": "C:N balanço N-aditivo (cn_harm)",
        "note": "Observação",
        "cn_harm_missing": (
            "cn_harm ainda não carregado nesta base — a coluna existe "
            "(migração 031) mas o snapshot do dossiê não foi aplicado."
        ),
        "sec_notes": "OBSERVAÇÕES",
        "nature": "Natureza dos números",
        "nature_value": "Potencial modelado, não produção medida.",
        # PDF report
        "pdf_total_biogas": "Potencial total de biogás",
        "pdf_energy": "Energia potencial",
        "pdf_co2": "CO₂ evitado",
        "pdf_biomass": "Biomassa total",
        "pdf_category": "Classe de potencial",
        "pdf_population": "População",
        "pdf_area": "Área",
        "pdf_confidence": "Confiança dos dados",
        "pdf_location": "Localização",
        "pdf_location_within": "Localização em {uf}",
        "pdf_geometry_unavailable": "Geometria indisponível",
        "pdf_by_sector": "Potencial de biogás por setor",
        "pdf_col_sector": "Setor",
        "pdf_col_m3_year": "m³/ano",
        "pdf_col_share": "participação",
        "pdf_streams": "Fluxos de resíduos",
        "pdf_col_stream": "Fluxo",
        "pdf_col_t_year": "t/ano",
        "pdf_col_biogas": "m³ biogás/ano",
        "pdf_col_mwh": "MWh/ano",
        "pdf_provenance": "Procedência",
        "pdf_series_sources": "Fontes das séries temporais: {sources}.",
        "pdf_provenance_count": "{count} registro(s) de procedência de biomassa.",
        "pdf_generated": (
            "Gerado pelo PILAR-2b em {when}. "
            "Os números são potencial modelado, não produção medida."
        ),
    },
    "en": {
        "sheet_summary": "Summary",
        "sheet_sectors": "By sector",
        "sheet_residues": "By residue",
        "sheet_series": "Time series",
        "sheet_infra": "Infrastructure",
        "sheet_sources": "Sources and notes",
        "col_indicator": "Indicator",
        "col_value": "Value",
        "col_unit": "Unit",
        "sec_identification": "IDENTIFICATION",
        "municipality": "Municipality",
        "ibge_code": "IBGE code",
        "uf": "State",
        "immediate_region": "Immediate region",
        "intermediate_region": "Intermediate region",
        "area": "Area",
        "population": "Population",
        "population_unit": "inhabitants ({year})",
        "density": "Population density",
        "density_unit": "inhab./km²",
        "sec_biogas": "BIOGAS POTENTIAL",
        "total_potential": "Total potential",
        "daily_potential": "Daily potential",
        "potential_class": "Potential category",
        "sec_energy": "ENERGY AND EMISSIONS",
        "energy_potential": "Energy potential",
        "co2_avoided": "CO₂ avoided",
        "sec_biomass": "BIOMASS",
        "total_biomass": "Total biomass",
        "sec_methane": "METHANE (CH₄)",
        "ch4_real": "CH₄, Real scenario (CP2b N4)",
        "ch4_ideal": "CH₄, Ideal scenario (CP2b N3)",
        "sec_provenance": "PROVENANCE",
        "data_confidence": "Data confidence",
        "extracted_at": "Extracted at (UTC)",
        "source": "Source",
        "unit_m3_year": "m³/year",
        "unit_m3_day": "m³/day",
        "unit_mwh_year": "MWh/year",
        "unit_kwh_day": "kWh/day",
        "unit_t_year": "t/year",
        "col_sector": "Sector",
        "col_residue": "Residue",
        "col_biomass": "Biomass (t/year)",
        "col_biogas": "Biogas (m³/year)",
        "col_ch4_real": "CH₄ Real (m³/year)",
        "col_ch4_ideal": "CH₄ Ideal (m³/year)",
        "col_energy": "Energy (MWh/year)",
        "col_factor": "Conversion factor",
        "col_factor_unit": "Factor unit",
        "col_share": "% of biogas",
        "total": "TOTAL",
        "no_series": "(no time series for this municipality)",
        "col_year": "Year",
        "col_variable": "Variable",
        "col_quality": "Quality",
        "no_infra": "(no infrastructure recorded in this municipality)",
        "col_layer": "Layer",
        "col_name": "Name",
        "col_attributes": "Attributes",
        "col_item": "Item",
        "col_detail": "Detail",
        "sec_data_provenance": "DATA PROVENANCE",
        "sec_series_sources": "TIME SERIES SOURCES",
        "sec_typology": "TYPOLOGY / C:N RATIO",
        "cn_molar": "C:N arithmetic mean (cn_molar)",
        "cn_harm": "C:N additive nitrogen balance (cn_harm)",
        "note": "Note",
        "cn_harm_missing": (
            "cn_harm is not loaded in this database yet — the column exists "
            "(migration 031) but the dossier snapshot has not been applied."
        ),
        "sec_notes": "NOTES",
        "nature": "Nature of the figures",
        "nature_value": "Modeled potential, not measured production.",
        "pdf_total_biogas": "Total biogas potential",
        "pdf_energy": "Energy potential",
        "pdf_co2": "CO₂ avoided",
        "pdf_biomass": "Total biomass",
        "pdf_category": "Potential category",
        "pdf_population": "Population",
        "pdf_area": "Area",
        "pdf_confidence": "Data confidence",
        "pdf_location": "Location",
        "pdf_location_within": "Location within {uf}",
        "pdf_geometry_unavailable": "Geometry unavailable",
        "pdf_by_sector": "Biogas potential by sector",
        "pdf_col_sector": "Sector",
        "pdf_col_m3_year": "m³/year",
        "pdf_col_share": "share",
        "pdf_streams": "Residue streams",
        "pdf_col_stream": "Stream",
        "pdf_col_t_year": "t/year",
        "pdf_col_biogas": "m³ biogas/year",
        "pdf_col_mwh": "MWh/year",
        "pdf_provenance": "Provenance",
        "pdf_series_sources": "Time series sources: {sources}.",
        "pdf_provenance_count": "{count} biomass provenance record(s) held.",
        "pdf_generated": (
            "Generated by PILAR-2b on {when}. "
            "Figures are modeled potential, not measured production."
        ),
    },
}


def text(lang: Lang) -> dict[str, str]:
    """The catalog for ``lang``; an unknown language falls back to pt-BR."""
    return TEXT.get(lang, TEXT[DEFAULT_LANG])


def residue_name(key: str, lang: Lang) -> str | None:
    return RESIDUE_NAMES.get(lang, RESIDUE_NAMES[DEFAULT_LANG]).get(key)


def sector_name(key: str, lang: Lang) -> str | None:
    return SECTOR_NAMES.get(lang, SECTOR_NAMES[DEFAULT_LANG]).get(key)
