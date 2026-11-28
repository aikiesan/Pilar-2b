"""MapBiomas Collection 11 land cover per municipality, yearly, with soy apart."""

from pathlib import Path

import pytest

from ingest.contract import IngestContext
from ingest.sources.mapbiomas_cobertura import source as cob

FIXTURES = Path(__file__).parent / "fixtures"
XLSX = FIXTURES / "mapbiomas_cobertura" / "2025" / cob.RAW_FILENAME


@pytest.fixture(scope="module")
def frame():
    return cob.load_from(XLSX, ufs=("35",))


def test_soy_split_before_crops():
    assert cob.group_of("3. Farming", "3.2. Agriculture", "3.2.1.1. Soybean") == "soy"
    assert cob.group_of("3. Farming", "3.2. Agriculture", "3.2.1.2. Sugar cane") == "cane"
    assert (
        cob.group_of("3. Farming", "3.2. Agriculture", "3.2.1.5. Other Temporary Crops") == "crops"
    )
    assert cob.group_of("3. Farming", "3.2. Agriculture", "3.2.2.2. Citrus") == "crops"
    assert cob.group_of("1. Forest", "1.1. Forest Formation", "1.1. Forest Formation") == "forest"
    assert (
        cob.group_of("5. Water", "5.1. River, Lake and Ocean", "5.1. River, Lake and Ocean")
        == "other"
    )


def test_nine_groups_41_years():
    assert cob.GROUPS == (
        "forest",
        "pasture",
        "cane",
        "soy",
        "crops",
        "silviculture",
        "mosaic",
        "urban",
        "other",
    )
    assert list(cob.YEARS) == list(range(1985, 2026))


def test_frame_shape(frame):
    assert len(frame) == 41 * 9
    assert set(frame.columns) >= {"ibge_code", "year", "group_key", "area_ha"}


def test_two_biomes_are_summed(frame):
    def at(year, group):
        return frame.query(
            "ibge_code == '3521705' and year == @year and group_key == @group"
        ).area_ha.item()

    assert at(1985, "pasture") == pytest.approx(58141, abs=1)
    assert at(2025, "pasture") == pytest.approx(8798, abs=1)
    assert at(1985, "soy") == pytest.approx(4240, abs=1)
    assert at(2025, "soy") == pytest.approx(57546, abs=1)


def test_ufs_filter(frame):
    assert cob.load_from(XLSX, ufs=("31",)).empty


def test_gate_group_sum_matches_source_total(frame):
    results, _ = cob.validate(frame, IngestContext(spec=cob.SPEC, year=2025))
    assert next(r for r in results if r.gate == "cross-source[group_sum]").passed


def test_gate_group_sum_catches_a_dropped_group(frame):
    broken = frame[frame.group_key != "urban"].reset_index(drop=True)
    results, _ = cob.validate(broken, IngestContext(spec=cob.SPEC, year=2025))
    assert not next(r for r in results if r.gate == "cross-source[group_sum]").passed


def test_promote_replaces_only_loaded_ufs(frame, fake_conn):
    n = cob.promote(frame, fake_conn, 11, ufs=("35",))
    delete_sql, params = fake_conn.executed[0]
    assert "DELETE FROM municipality_land_cover" in delete_sql and params == (["35"],)
    insert_sql, rows = fake_conn.executed[1]
    assert "ingest_run_id" in insert_sql
    assert n == len(rows) == 41 * 9
    assert rows[0][-1] == 11


def test_schema_passes_on_long_frame(frame):
    results, _ = cob.validate(frame, IngestContext(spec=cob.SPEC, year=2025))
    assert all(r.passed for r in results if r.gate == "schema")


def test_schema_catches_duplicate_municipality_year_group(frame):
    import pandas as pd

    dup = pd.concat([frame, frame.head(1)], ignore_index=True)
    dup.attrs = frame.attrs
    results, _ = cob.validate(dup, IngestContext(spec=cob.SPEC, year=2025))
    assert not all(r.passed for r in results if r.gate == "schema")
