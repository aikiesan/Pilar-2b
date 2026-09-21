import pandas as pd

from app.services.municipality_exports import (
    RESIDUOS,
    _coalesce,
    _sheet_residuos,
    _sheet_setores,
    ascii_slug,
    build_workbook,
)

WHO = {
    "municipality_name": "Lençóis Paulista",
    "ibge_code": "3526803",
    "uf": "SP",
    "immediate_region": "Bauru",
    "intermediate_region": "Bauru",
    "area_km2": 809.54,
    "population": 66505,
    "population_year": 2022,
    "potential_category": "ALTO",
    "data_confidence": "validated",
}

MUNI = {
    "total_biogas_m3_year": 100102915.0,
    "agricultural_biogas_m3_year": 88701602.0,
    "livestock_biogas_m3_year": 750775.0,
    "urban_biogas_m3_year": 2377063.0,
    "forestry_biogas_m3_year": 8273475.0,
    "sugarcane_biogas_m3_year": 81216000.0,
    "sugarcane_biomass_tons_year": 1621440.0,
    # A measured zero, not a gap: this municipality farms no fish.
    "aquaculture_biogas_m3_year": 0.0,
    "aquaculture_biomass_tons_year": 0.0,
    # Sewage has CH4 but no biogas total column at all — genuinely absent.
    "ch4_real_sewage_m3_year": 99797.97,
}


def _residuos():
    return _sheet_residuos(MUNI, [])


def test_a_measured_zero_survives_as_zero_not_as_missing():
    # aquaculture_biogas_m3_year is 0.0 in the database. `a or b` coalescing
    # would drop it, turning "we measured none" into "we have no reading".
    row = _residuos().set_index("Resíduo").loc["Aquicultura"]

    assert row["Biogás (m³/ano)"] == 0.0
    assert row["Biomassa (t/ano)"] == 0.0


def test_an_absent_column_stays_absent():
    # Sewage has no *_biogas_m3_year column; that must not become 0.
    row = _residuos().set_index("Resíduo").loc["Esgoto"]

    assert pd.isna(row["Biogás (m³/ano)"])


def test_coalesce_prefers_a_zero_over_a_later_value():
    assert _coalesce(0.0, 42.0) == 0.0
    assert _coalesce(None, 42.0) == 42.0
    assert _coalesce(None, None) is None


def test_stream_data_fills_in_only_where_the_municipality_row_is_silent():
    streams = [{"residue_stream": "citrus", "residue_tons_yr": 46992.0, "biogas_m3_yr": 892848.0}]
    row = _sheet_residuos(MUNI, streams).set_index("Resíduo").loc["Citros"]

    assert row["Biomassa (t/ano)"] == 46992.0
    assert row["Biogás (m³/ano)"] == 892848.0


def test_sector_total_reconciles_with_the_municipality_total():
    frame = _sheet_setores(MUNI)
    total = frame.loc[frame["Setor"] == "TOTAL", "Biogás (m³/ano)"].iloc[0]

    assert total == MUNI["total_biogas_m3_year"]


def test_sector_shares_sum_to_one():
    frame = _sheet_setores(MUNI)
    shares = frame.loc[frame["Setor"] != "TOTAL", "% do biogás"]

    assert abs(shares.sum() - 1.0) < 1e-9


def test_every_residue_is_placed_in_a_sector():
    sectors = {s for _, _, s in RESIDUOS}

    assert sectors == {"Agrícola", "Pecuária", "Urbano", "Florestal"}


def test_workbook_has_the_six_curated_sheets_and_no_raw_table_dump():
    from io import BytesIO

    sections = {"municipality": [MUNI], "residue_streams": [], "timeseries": [], "infrastructure": []}
    book = pd.ExcelFile(BytesIO(build_workbook(sections, WHO)))

    assert book.sheet_names == [
        "Resumo",
        "Por setor",
        "Por resíduo",
        "Séries temporais",
        "Infraestrutura",
        "Fontes e notas",
    ]


def test_filenames_fold_accents_for_content_disposition():
    assert ascii_slug("Lençóis Paulista") == "lencois_paulista"
    assert ascii_slug("São João da Boa Vista") == "sao_joao_da_boa_vista"
