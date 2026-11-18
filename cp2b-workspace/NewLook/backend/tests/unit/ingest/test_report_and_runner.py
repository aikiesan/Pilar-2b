"""Ingest report rendering and CLI runner plumbing."""

from ingest import report, runner
from ingest.contract import IngestContext, SourceSpec
from ingest.gates import GateResult

SPEC = SourceSpec(
    source_id="demo",
    name="Demo source",
    key_column="ibge_code",
    required_columns={"ibge_code": "str"},
)


class TestReport:
    def test_report_written_with_verdict_and_gates(self, tmp_path):
        ctx = IngestContext(
            spec=SPEC,
            year=2025,
            regression_explanations={"sp_total": "yearly refresh"},
        )
        results = [
            GateResult("schema", True, "ok"),
            GateResult("range", False, "3 values > 100"),
        ]
        path = report.write_report(results, ctx, tmp_path)
        text = path.read_text(encoding="utf-8")
        assert path.name == "demo_2025.md"
        assert "BLOCKED" in text  # one failed gate blocks promotion
        assert "| schema | ✅ pass | ok |" in text
        assert "3 values > 100" in text
        assert "yearly refresh" in text

    def test_all_green_reports_promoted(self, tmp_path):
        ctx = IngestContext(spec=SPEC, year=2025)
        path = report.write_report([GateResult("schema", True, "ok")], ctx, tmp_path)
        assert "PROMOTED" in path.read_text(encoding="utf-8")


class TestRunner:
    def test_registry_lists_aneel(self, capsys):
        assert runner.main(["list"]) == 0
        assert "aneel_siga" in capsys.readouterr().out

    def test_unknown_source_exits_with_hint(self):
        try:
            runner.main(["run", "nope", "--year", "2025"])
        except SystemExit as exc:
            assert "unknown source" in str(exc)
        else:
            raise AssertionError("expected SystemExit")

    def test_all_registered_sources_importable_and_conformant(self):
        for source_id in runner.SOURCES:
            module = runner.get_source(source_id)
            for fn in ("fetch", "load", "validate", "promote"):
                assert callable(getattr(module, fn)), f"{source_id} missing {fn}()"
            assert module.SPEC.source_id == source_id
