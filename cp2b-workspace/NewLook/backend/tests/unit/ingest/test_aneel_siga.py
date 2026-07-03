"""ANEEL SIGA loader — the ingestion-contract template source."""

from pathlib import Path

import pytest

from ingest.contract import IngestContext
from ingest.sources.aneel_siga import source as aneel

FIXTURES = Path(__file__).parent / "fixtures"


class TestFetch:
    def test_existing_snapshot_returned(self):
        snapshot = aneel.fetch(2025, FIXTURES)
        assert snapshot.name == "siga_operacao.csv"

    def test_missing_snapshot_raises_with_instructions(self, tmp_path):
        with pytest.raises(FileNotFoundError, match="dadosabertos.aneel.gov.br"):
            aneel.fetch(1999, tmp_path)

    def test_fetch_never_overwrites(self, tmp_path):
        # fetch() is read-only by design: pointing it at an existing snapshot
        # must not modify it.
        target = tmp_path / "aneel_siga" / "2025"
        target.mkdir(parents=True)
        original = "CodCEG;canary\n"
        (target / aneel.RAW_FILENAME).write_text(original, encoding="utf-8")
        aneel.fetch(2025, tmp_path)
        assert (target / aneel.RAW_FILENAME).read_text(encoding="utf-8") == original


class TestLoad:
    def test_filters_to_biomass_and_normalizes_units(self):
        df = aneel.load(2025, FIXTURES)
        # The fóssil row must be filtered out.
        assert len(df) == 3
        assert set(df["fuel_origin"]) == {"Biomassa"}
        # Brazilian number format parsed: 19.912,00 kW -> 19912.0 kW -> 19.912 MW.
        salvador = df[df["plant_name"] == "Termoverde Salvador"].iloc[0]
        assert salvador["capacity_kw"] == pytest.approx(19912.0)
        assert salvador["capacity_mw"] == pytest.approx(19.912)

    def test_unit_audit_kw_vs_mw(self):
        """The 19.69-vs-6.39 discrepancy class: capacity_mw must always be
        capacity_kw / 1000, nothing else, for every row."""
        df = aneel.load(2025, FIXTURES)
        assert (df["capacity_mw"] * 1_000 - df["capacity_kw"]).abs().max() < 1e-9

    def test_schema_drift_raises_actionable_error(self, tmp_path):
        target = tmp_path / "aneel_siga" / "2025"
        target.mkdir(parents=True)
        (target / aneel.RAW_FILENAME).write_text("CodCEG;RenamedColumn\nx;y\n", encoding="utf-8")
        with pytest.raises(ValueError, match="schema changed"):
            aneel.load(2025, tmp_path)


class TestValidate:
    def test_default_context_runs_battery(self):
        df = aneel.load(2025, FIXTURES)
        results, ctx = aneel.validate(df)
        names = [r.gate for r in results]
        assert names == ["schema", "coverage", "range", "aggregation"]
        by_name = {r.gate: r for r in results}
        assert by_name["schema"].passed, by_name["schema"].details
        assert by_name["coverage"].passed  # plant-keyed -> skipped
        assert by_name["range"].passed, by_name["range"].details
        # No published totals in the default context — must fail loudly, so a
        # real ingest cannot silently skip the aggregation certification.
        assert not by_name["aggregation"].passed

    def test_full_context_passes_aggregation(self):
        df = aneel.load(2025, FIXTURES)
        total = float(df["capacity_mw"].sum())
        ctx = IngestContext(
            spec=aneel.SPEC,
            year=2025,
            published_totals={"BR": total},
            totals_column="capacity_mw",
        )
        results, _ = aneel.validate(df, ctx)
        assert all(r.passed for r in results), [str(r) for r in results]


class TestPromote:
    def test_blocked_until_staging_schema_exists(self):
        with pytest.raises(NotImplementedError, match="migration 021"):
            aneel.promote(None, None)
