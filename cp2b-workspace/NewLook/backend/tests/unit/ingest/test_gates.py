"""Unit tests for the standard 8-gate validation battery (ingest.gates)."""

import json

import pandas as pd
import pytest

from ingest import gates
from ingest.contract import IngestContext, SourceSpec

SPEC = SourceSpec(
    source_id="test_source",
    name="Test source",
    key_column="ibge_code",
    required_columns={"ibge_code": "str", "value": "float"},
    value_bounds={"value": (0, 100)},
    scope_ufs=("SP",),
    aggregation_tolerance_pct=1.0,
)


def sp_frame(n=645, value=1.0):
    """A frame covering all 645 SP municipalities with synthetic codes.

    Coverage counts by UF prefix only, so synthetic 35xxxxx codes suffice."""
    codes = [f"35{i:05d}" for i in range(n)]
    return pd.DataFrame({"ibge_code": codes, "value": [value] * n})


class TestSchemaGate:
    def test_passes_on_clean_frame(self):
        result = gates.schema_gate(sp_frame(), SPEC)
        assert result.passed, result.details

    def test_fails_on_missing_column(self):
        df = sp_frame().drop(columns=["value"])
        result = gates.schema_gate(df, SPEC)
        assert not result.passed
        assert "missing columns" in result.details

    def test_fails_on_wrong_dtype(self):
        df = sp_frame()
        df["value"] = df["value"].astype(str)
        # "str" for a float column: str check via object dtype passes, so flip
        # the spec instead: value must be float but is object.
        result = gates.schema_gate(df, SPEC)
        assert not result.passed
        assert "expected float" in result.details

    def test_fails_on_duplicate_and_null_keys(self):
        df = sp_frame(3)
        df.loc[1, "ibge_code"] = df.loc[0, "ibge_code"]
        df.loc[2, "ibge_code"] = None
        result = gates.schema_gate(df, SPEC)
        assert not result.passed
        assert "duplicate" in result.details
        assert "null" in result.details

    def test_fails_on_invalid_ibge_code(self):
        df = sp_frame(2)
        df.loc[0, "ibge_code"] = "9999999"
        result = gates.schema_gate(df, SPEC)
        assert not result.passed
        assert "invalid ibge_codes" in result.details


class TestCoverageGate:
    def test_full_sp_coverage_passes(self):
        result = gates.coverage_gate(sp_frame(645), SPEC)
        assert result.passed, result.details

    def test_missing_municipality_fails(self):
        result = gates.coverage_gate(sp_frame(644), SPEC)
        assert not result.passed
        assert "SP: 644/645" in result.details

    def test_allowlist_makes_documented_gap_pass(self):
        spec = SourceSpec(
            **{
                **SPEC.__dict__,
                "missing_allowlist": ("3500001",),
            }
        )
        df = sp_frame(645)
        df = df[df["ibge_code"] != "3500001"]
        result = gates.coverage_gate(df, spec)
        assert result.passed, result.details

    def test_non_municipal_source_skips(self):
        spec = SourceSpec(**{**SPEC.__dict__, "key_column": "ceg_code"})
        result = gates.coverage_gate(pd.DataFrame({"ceg_code": ["a"]}), spec)
        assert result.passed
        assert "skipped" in result.details


class TestRangeGate:
    def test_within_bounds_passes(self):
        assert gates.range_gate(sp_frame(value=50.0), SPEC).passed

    def test_out_of_bounds_fails(self):
        df = sp_frame(3)
        df.loc[0, "value"] = -5.0
        df.loc[1, "value"] = 1e9
        result = gates.range_gate(df, SPEC)
        assert not result.passed
        assert "< 0" in result.details and "> 100" in result.details


class TestAggregationGate:
    def test_matching_totals_pass(self):
        df = sp_frame(645, value=2.0)
        ctx = IngestContext(
            spec=SPEC,
            year=2024,
            published_totals={"SP": 1290.0, "BR": 1290.0},
            totals_column="value",
        )
        result = gates.aggregation_gate(df, ctx)
        assert result.passed, result.details

    def test_off_totals_fail(self):
        df = sp_frame(645, value=2.0)
        ctx = IngestContext(
            spec=SPEC, year=2024, published_totals={"SP": 2000.0}, totals_column="value"
        )
        assert not gates.aggregation_gate(df, ctx).passed

    def test_missing_totals_fail_loudly(self):
        ctx = IngestContext(spec=SPEC, year=2024)
        result = gates.aggregation_gate(sp_frame(), ctx)
        assert not result.passed
        assert "no published totals" in result.details


class TestCrossSourceGate:
    def test_wraps_pass_and_fail(self):
        ok = gates.cross_source_gate("anp-overlap", lambda: (True, "42/45 plants match"))
        assert ok.passed and "anp-overlap" in ok.gate
        bad = gates.cross_source_gate("anp-overlap", lambda: (False, "only 3/45 match"))
        assert not bad.passed

    def test_crashing_check_fails_gate_not_run(self):
        result = gates.cross_source_gate("boom", lambda: 1 / 0)
        assert not result.passed
        assert "raised" in result.details


class TestIdempotencyGate:
    def test_same_content_different_order_matches(self):
        df1 = sp_frame(10)
        df2 = df1.sample(frac=1, random_state=7)[list(reversed(df1.columns))]
        c1, c2 = gates.frame_checksum(df1), gates.frame_checksum(df2)
        assert gates.idempotency_gate(c1, c2).passed

    def test_different_content_fails(self):
        c1 = gates.frame_checksum(sp_frame(10, value=1.0))
        c2 = gates.frame_checksum(sp_frame(10, value=2.0))
        assert not gates.idempotency_gate(c1, c2).passed


class TestLineageGate:
    def _metadata(self, tmp_path, entry):
        path = tmp_path / "METADATA.json"
        path.write_text(json.dumps({"sources": [entry]}), encoding="utf-8")
        return str(path)

    def test_complete_entry_passes(self, tmp_path):
        path = self._metadata(
            tmp_path,
            {
                "id": "test_source",
                "name": "Test",
                "role": "testing",
                "reference_year": "2024",
                "url": "https://example.org",
                "retrieved": "2026-07-03",
            },
        )
        assert gates.lineage_gate(path, "test_source").passed

    def test_verify_placeholder_fails(self, tmp_path):
        path = self._metadata(
            tmp_path,
            {
                "id": "test_source",
                "name": "Test",
                "role": "testing",
                "reference_year": "2024 (VERIFY)",
                "url": "https://example.org",
                "retrieved": "VERIFY",
            },
        )
        result = gates.lineage_gate(path, "test_source")
        assert not result.passed
        assert "VERIFY" in result.details

    def test_missing_source_fails(self, tmp_path):
        path = self._metadata(tmp_path, {"id": "other"})
        assert not gates.lineage_gate(path, "test_source").passed


class TestRegressionGate:
    def test_unchanged_metrics_pass(self):
        ctx = IngestContext(spec=SPEC, year=2024, baseline_metrics={"sp_total_ch4": 100.0})
        assert gates.regression_gate({"sp_total_ch4": 100.0}, ctx).passed

    def test_unexplained_change_fails(self):
        ctx = IngestContext(spec=SPEC, year=2024, baseline_metrics={"sp_total_ch4": 100.0})
        result = gates.regression_gate({"sp_total_ch4": 150.0}, ctx)
        assert not result.passed
        assert "unexplained" in result.details

    def test_explained_change_passes(self):
        ctx = IngestContext(
            spec=SPEC,
            year=2024,
            baseline_metrics={"sp_total_ch4": 100.0},
            regression_explanations={"sp_total_ch4": "PAM 2024 crop-year update"},
        )
        assert gates.regression_gate({"sp_total_ch4": 150.0}, ctx).passed

    def test_no_baseline_passes_as_first_ingest(self):
        ctx = IngestContext(spec=SPEC, year=2024)
        result = gates.regression_gate({}, ctx)
        assert result.passed
        assert "first ingest" in result.details


class TestBattery:
    def test_standard_battery_runs_gates_1_to_4(self):
        df = sp_frame(645, value=2.0)
        ctx = IngestContext(
            spec=SPEC, year=2024, published_totals={"SP": 1290.0}, totals_column="value"
        )
        results = gates.run_standard_battery(df, ctx)
        names = [r.gate for r in results]
        assert names == ["schema", "coverage", "range", "aggregation"]
        assert gates.all_passed(results)

    def test_lineage_included_when_metadata_path_set(self, tmp_path):
        meta = tmp_path / "METADATA.json"
        meta.write_text(json.dumps({"sources": []}), encoding="utf-8")
        ctx = IngestContext(
            spec=SPEC,
            year=2024,
            published_totals={"SP": 1290.0},
            totals_column="value",
            metadata_path=str(meta),
        )
        results = gates.run_standard_battery(sp_frame(645, 2.0), ctx)
        assert results[-1].gate == "lineage"
        assert not results[-1].passed  # source not documented yet


@pytest.mark.unit
class TestGateResultRendering:
    def test_str_form_used_in_reports(self):
        r = gates.GateResult("schema", True, "all good")
        assert str(r) == "[PASS] schema: all good"
