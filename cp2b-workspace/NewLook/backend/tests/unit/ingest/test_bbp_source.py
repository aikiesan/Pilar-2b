"""Reading PAM/PPM from the bbp schema must give the same frames and gates as the workbooks."""

import pytest

from ingest import bbp
from ingest.contract import IngestContext
from ingest.sources.ibge_ppm import source as ppm
from ingest.sources.pam_1612 import source as pam1612
from ingest.sources.pam_1613 import source as pam1613


class FakeConn:
    """Answers the two queries ingest.bbp issues, from {(table, year, variable): rows}."""

    def __init__(self, slices, has_schema=True):
        self.slices = slices
        self.has_schema = has_schema

    def cursor(self):
        return FakeCursor(self)


class FakeCursor:
    def __init__(self, conn):
        self.conn = conn
        self.result = []

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def execute(self, sql, params=None):
        if sql.startswith("SELECT to_regclass"):
            self.result = [("bbp.v_sidra" if self.conn.has_schema else None,)]
        elif "FROM bbp.v_sidra" in sql:
            self.result = self.conn.slices.get(tuple(params), [])
        elif "FROM bbp.release" in sql:
            self.result = [(3, "0.1.0", "test", "abc123", None)]

    def fetchone(self):
        return self.result[0] if self.result else None

    def fetchall(self):
        return self.result


def test_reading_keeps_zero_and_missing_apart():
    reading, prelim = bbp.reading_from_rows(
        [
            (3550308, "Soja (em grão)", 0.0, False),
            (3550308, "Laranja", None, False),
            (5107925, "Soja (em grão)", 1.5e6, True),
        ]
    )
    assert reading["3550308"] == {"Soja (em grão)": 0.0, "Laranja": None}  # "-" vs "..."/"X"
    assert reading["5107925"]["Soja (em grão)"] == 1.5e6
    assert prelim is True


def test_missing_schema_is_a_clear_error():
    with pytest.raises(bbp.BbpUnavailable, match="bbp load"):
        bbp.read_year(FakeConn({}, has_schema=False), 1612, 2025, bbp.PAM_PRODUCTION)


def test_pam_frames_match_the_workbook_shape():
    slices = {
        (1612, 2025, "production_t"): [
            (1100015, "Soja (em grão)", 10.0, True),
            (1100015, "Milho (em grão)", None, True),
            (1100015, "Cana-de-açúcar", 0.0, True),
        ],
        (1613, 2024, "production_t"): [
            (1100015, "Café (em grão) Total", 5.0, False),
            (1100015, "Café (em grão) Arábica", 2.0, False),
            (1100015, "Café (em grão) Canephora", 3.0, False),
            (1100015, "Laranja", 7.0, False),
        ],
    }
    conn = FakeConn(slices)
    frame, prelim = pam1612.load_bbp(2025, conn)
    assert prelim is True
    assert set(frame.columns) == {"ibge_code", *pam1612.PRODUCTS.values()}
    row = frame.iloc[0]
    assert row["ibge_code"] == "1100015" and row["soybean_production_t"] == 10.0
    assert row["sugarcane_production_t"] == 0.0 and frame["corn_production_t"].isna().all()

    frame, prelim = pam1613.load_bbp(2024, conn)
    assert prelim is False
    assert frame.iloc[0]["coffee_production_t"] == 5.0
    assert frame.iloc[0]["_coffee_arabica_t"] == 2.0  # kept for the containment gate


def test_pam_load_bbp_without_data_raises():
    with pytest.raises(bbp.BbpUnavailable):
        pam1612.load_bbp(2030, FakeConn({}))


def test_ppm_frame_from_bbp_sums_fish_species_and_feeds_the_fish_gate():
    slices = {
        (3939, 2025, bbp.PPM_HERDS): [
            (1100015, "Bovino", 566000.0, True),
            (1100015, "Suíno - total", 5820.0, True),
            (1100015, "Galináceos - total", 100.0, True),
        ],
        (74, 2025, bbp.PPM_ANIMAL_PRODUCTS): [(1100015, "Leite (Mil litros)", 4711.0, True)],
        (3940, 2025, bbp.PPM_AQUACULTURE): [
            (1100015, "Tambaqui (Quilogramas)", 1000.0, True),
            (1100015, "Tilápia (Quilogramas)", 500.0, True),
            (1100015, "Peixes (Quilogramas)", 0.0, True),
        ],
    }
    frame, prelim, aquaculture = ppm.load_bbp(2025, FakeConn(slices))
    assert prelim is True
    row = frame.iloc[0]
    assert row["bovino"] == 566000.0 and row["leite"] == 4711.0
    assert row[ppm.FISH_VARIABLE] == 1500.0

    gate = ppm.fish_method_gate(2025, aquaculture, frame)
    assert gate.passed, gate.details

    aquaculture["1100015"]["Peixes (Quilogramas)"] = 2000.0  # IBGE starts filling the aggregate
    assert not ppm.fish_method_gate(2025, aquaculture, frame).passed


def test_ppm_validate_runs_the_fish_gate_on_a_bbp_reading():
    slices = {(3939, 2025, bbp.PPM_HERDS): [(1100015, "Bovino", 1.0, True)]}
    frame, _, aquaculture = ppm.load_bbp(2025, FakeConn(slices))
    results, _ = ppm.validate(
        frame, IngestContext(spec=ppm.SPEC, year=2025), aquaculture_reading=aquaculture
    )
    assert "fish-total-method" in {r.gate for r in results}


def test_published_national_covers_every_year_of_the_series():
    for module, column in (
        (pam1612, "soybean_production_t"),
        (pam1613, "coffee_production_t"),
        (ppm, "bovino"),
    ):
        years = set(module.PUBLISHED_NATIONAL)
        assert set(range(2008, 2026)) <= years, module.__name__
        assert all(column in module.PUBLISHED_NATIONAL[y] for y in years)
