from scripts import seed_national_municipalities as seed


def test_mesh_refresh_updates_only_identity_and_geometry_metadata():
    update_clause = seed.UPSERT_MESH_SQL.split("DO UPDATE SET", 1)[1].lower()

    for required in (
        "municipality_name",
        "geometry",
        "geometry_detail",
        "geometry_overview",
        "centroid",
        "area_km2",
        "area_year",
        "immediate_region",
        "intermediate_region",
    ):
        assert required in update_clause

    assert "st_simplifypreservetopology" in update_clause

    for protected in (
        "biomass",
        "biogas",
        "ch4_",
        "scenario",
        "provenance",
        "gdp",
        "population",
    ):
        assert protected not in update_clause


def test_default_seed_still_preserves_existing_rows():
    assert "ON CONFLICT (ibge_code) DO NOTHING" in seed.INSERT_SQL
