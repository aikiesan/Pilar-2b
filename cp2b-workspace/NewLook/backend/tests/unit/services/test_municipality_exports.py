import pandas as pd

from app.services.municipality_exports import (
    RESIDUOS,
    _coalesce,
    _fmt,
    _sheet_residuos,
    _sheet_setores,
    ascii_slug,
    build_pdf,
    build_workbook,
    potential_category,
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
}

# The municipality's row of the CP2b view: Cenário Real = N4, Ideal = N3.
CP2B = {
    "ch4_cp2b_n4_m3_year": 1_000_000.0,
    "ch4_cp2b_n3_m3_year": 1_200_000.0,
    "ch4_cp2b_n4_agricultural_m3_year": 900_000.0,
    # Sewage has CH4 but no biogas total column at all — genuinely absent there.
    "ch4_cp2b_n4_sewage_m3_year": 99797.97,
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

    sections = {
        "municipality": [MUNI],
        "residue_streams": [],
        "timeseries": [],
        "infrastructure": [],
    }
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


# ── English edition ──────────────────────────────────────────────────────────

SECTIONS = {
    "municipality": [MUNI],
    "residue_streams": [
        {"residue_stream": "sugarcane", "sector": "agricultural", "biogas_m3_yr": 81216000.0}
    ],
    "timeseries": [],
    "infrastructure": [],
}


def test_the_english_workbook_names_its_sheets_in_english():
    from io import BytesIO

    book = pd.ExcelFile(BytesIO(build_workbook(SECTIONS, WHO, "en")))

    assert book.sheet_names == [
        "Summary",
        "By sector",
        "By residue",
        "Time series",
        "Infrastructure",
        "Sources and notes",
    ]


def test_the_english_sheets_reconcile_like_the_portuguese_ones():
    frame = _sheet_setores(MUNI, "en")
    total = frame.loc[frame["Sector"] == "TOTAL", "Biogas (m³/year)"].iloc[0]

    assert total == MUNI["total_biogas_m3_year"]
    assert set(frame["Sector"]) == {"Agricultural", "Livestock", "Urban", "Forestry", "TOTAL"}


def test_english_residue_rows_keep_zero_and_absent_apart():
    frame = _sheet_residuos(MUNI, [], "en").set_index("Residue")

    assert frame.loc["Aquaculture", "Biogas (m³/year)"] == 0.0
    assert pd.isna(frame.loc["Sewage", "Biogas (m³/year)"])


def test_the_potential_category_is_worded_per_language():
    assert potential_category("ALTO", "en") == "High"
    assert potential_category("ALTO", "pt-BR") == "Alto"
    assert potential_category("SEM DADOS", "en") == "SEM DADOS"  # unknown codes pass through
    assert potential_category(None, "en") is None


def test_numbers_use_the_language_decimal_mark():
    assert _fmt(1234.5, 1, "en") == "1 234.5"
    assert _fmt(1234.5, 1, "pt-BR") == "1 234,5"
    assert _fmt(None, 0, "en") == "—"


def test_the_report_renders_in_both_languages():
    for lang in ("pt-BR", "en"):
        pdf = build_pdf(SECTIONS, WHO, None, None, lang)
        assert pdf.startswith(b"%PDF"), lang


# ── Cenário Real / Ideal = CP2b N4 / N3 ──────────────────────────────────────


def test_the_scenario_columns_read_cp2b_not_the_atlas():
    # A stale Atlas value on the municipalities row must not leak into the sheet.
    muni = {**MUNI, "ch4_real_agricultural_m3_year": 5.0}
    frame = _sheet_setores(muni, "en", CP2B).set_index("Sector")

    assert frame.loc["Agricultural", "CH₄ Real (m³/year)"] == 900_000.0
    # CP2b has no forestry stream: empty, not zero.
    assert pd.isna(frame.loc["Forestry", "CH₄ Real (m³/year)"])


def test_residue_rows_take_the_cp2b_shares():
    frame = _sheet_residuos(MUNI, [], "en", CP2B).set_index("Residue")

    assert frame.loc["Sewage", "CH₄ Real (m³/year)"] == 99797.97
    assert pd.isna(frame.loc["Sewage", "Biogas (m³/year)"])


def test_without_cp2b_the_scenarios_are_empty_not_zero():
    frame = _sheet_setores(MUNI, "en", {}).set_index("Sector")

    assert frame["CH₄ Real (m³/year)"].drop("TOTAL").isna().all()
    # The TOTAL row too: summing an all-empty column must not fabricate a 0.
    assert pd.isna(frame.loc["TOTAL", "CH₄ Real (m³/year)"])
    assert pd.isna(frame.loc["TOTAL", "CH₄ Ideal (m³/year)"])


def test_a_partial_cp2b_row_still_totals():
    frame = _sheet_setores(MUNI, "en", CP2B).set_index("Sector")

    assert frame.loc["TOTAL", "CH₄ Real (m³/year)"] == 900_000.0


def test_the_workbook_says_which_figures_are_cp2b():
    from app.services.municipality_exports import _sheet_fontes

    items = set(_sheet_fontes({}, WHO, "en")["Item"].dropna())
    assert {"Real and Ideal scenarios", "Biogas, energy, CO₂, biomass and sectors"} <= items


def test_the_workbook_reads_the_cp2b_section():
    from io import BytesIO

    book = pd.ExcelFile(BytesIO(build_workbook({**SECTIONS, "cp2b": [CP2B]}, WHO, "en")))
    summary = pd.read_excel(book, "Summary", header=None)
    row = summary[summary[0] == "CH₄, Real scenario (CP2b N4)"]

    assert float(str(row.iloc[0, 1]).replace(" ", "")) == 1_000_000.0
