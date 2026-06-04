"""
Tests for canonical_loader.py — YAML → FeedstockParams bridge.

Verifies the loader reads canonical values correctly, maps aggregate streams to
representative feedstock codes, defaults FDE to 1.0 when no availability block is
present, and raises clearly on unknown codes/streams.
"""

import pytest

yaml = pytest.importorskip("yaml", reason="PyYAML required for canonical loader tests")

from app.services.biogas_forward import FeedstockParams, Range  # noqa: E402
from app.services.canonical_loader import (  # noqa: E402
    STREAM_TO_CANONICAL,
    get_params,
    get_params_for_stream,
    load_raw,
)


@pytest.mark.unit
class TestLoadRaw:
    def test_loads_feedstocks(self):
        fs = load_raw()
        assert "BAGACO" in fs
        assert "FORSU" in fs
        assert len(fs) >= 20


@pytest.mark.unit
class TestGetParams:
    def test_bagaco_values_match_canonical(self):
        p = get_params("BAGACO")
        assert isinstance(p, FeedstockParams)
        assert p.bmp.medio == pytest.approx(115.0)
        assert p.ts.medio == pytest.approx(58.9)
        assert p.vs_of_ts.medio == pytest.approx(90.0)
        assert p.ch4_pct == pytest.approx(55.0)

    def test_bmp_range_ordering(self):
        p = get_params("BAGACO")
        assert p.bmp.min <= p.bmp.medio <= p.bmp.max

    def test_fde_defaults_to_one_when_absent(self):
        # No fde block in canonical YAML yet → theoretical potential
        p = get_params("BAGACO")
        assert p.fde.min == 1.0 and p.fde.medio == 1.0 and p.fde.max == 1.0

    def test_unknown_code_raises(self):
        with pytest.raises(KeyError):
            get_params("NOT_A_REAL_CODE")


@pytest.mark.unit
class TestGetParamsForStream:
    @pytest.mark.parametrize("stream,code", [
        ("sugarcane", "BAGACO"),
        ("coffee", "CASCA_CAFE"),
        ("corn", "PALHA_MILHO"),
        ("soybean", "CASCA_SOJA"),
        ("citrus", "BAGACO_CITROS"),
    ])
    def test_agricultural_streams_map(self, stream, code):
        p = get_params_for_stream(stream)
        expected = get_params(code)
        assert p.bmp.medio == expected.bmp.medio

    def test_unknown_stream_raises(self):
        with pytest.raises(KeyError):
            get_params_for_stream("forestry")

    def test_all_mapped_codes_resolve(self):
        # Every code in STREAM_TO_CANONICAL must exist in the canonical YAML
        fs = load_raw()
        for stream, code in STREAM_TO_CANONICAL.items():
            assert code in fs, f"stream '{stream}' maps to missing code '{code}'"
