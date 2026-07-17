"""
Tests for canonical_loader.py — YAML → FeedstockParams bridge.

Verifies the loader reads canonical values correctly, maps aggregate streams to
representative feedstock codes, defaults FDE to 1.0 when no availability block is
present, and raises clearly on unknown codes/streams.
"""

from pathlib import Path

import pytest

yaml = pytest.importorskip("yaml", reason="PyYAML required for canonical loader tests")

from app.services import canonical_loader  # noqa: E402
from app.services.biogas_forward import FeedstockParams, Range  # noqa: E402
from app.services.canonical_loader import (  # noqa: E402
    STREAM_TO_CANONICAL,
    get_params,
    get_params_for_stream,
    load_raw,
    resolve_feedstocks_path,
)


def _plant(services_dir: Path, yaml_root: Path) -> Path:
    """Create a fake canonical_loader.py plus a feedstocks.yaml under yaml_root."""
    services_dir.mkdir(parents=True, exist_ok=True)
    module = services_dir / "canonical_loader.py"
    module.touch()
    target = yaml_root / "data" / "canonical_parameters" / "feedstocks.yaml"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text("feedstocks: {}\n", encoding="utf-8")
    return module


@pytest.mark.unit
class TestResolveFeedstocksPath:
    """feedstocks.yaml lives outside backend/, and how many parent hops reach it
    depends on the runtime layout. Getting this wrong is silent: callers catch the
    error per-municipality, so the map renders on legacy columns and only the
    canonical properties vanish. These tests pin both layouts."""

    @pytest.fixture(autouse=True)
    def _clear(self, monkeypatch):
        monkeypatch.delenv("CANONICAL_PARAMETERS_PATH", raising=False)
        load_raw.cache_clear()
        yield
        load_raw.cache_clear()

    def test_repo_layout_resolves(self, tmp_path, monkeypatch):
        # <NewLook>/backend/app/services/canonical_loader.py -> parents[3] = <NewLook>
        newlook = tmp_path / "NewLook"
        module = _plant(newlook / "backend" / "app" / "services", newlook)
        monkeypatch.setattr(canonical_loader, "__file__", str(module))

        assert resolve_feedstocks_path() == newlook / "data" / "canonical_parameters" / (
            "feedstocks.yaml"
        )

    def test_docker_layout_resolves(self, tmp_path, monkeypatch):
        # Compose binds backend/ as /app, so the tree is one level shallower:
        # /app/app/services/canonical_loader.py -> parents[2] = /app
        app = tmp_path / "app"
        module = _plant(app / "app" / "services", app)
        monkeypatch.setattr(canonical_loader, "__file__", str(module))

        assert resolve_feedstocks_path() == app / "data" / "canonical_parameters" / (
            "feedstocks.yaml"
        )

    def test_env_override_wins(self, tmp_path, monkeypatch):
        elsewhere = tmp_path / "somewhere" / "feedstocks.yaml"
        monkeypatch.setenv("CANONICAL_PARAMETERS_PATH", str(elsewhere))

        assert resolve_feedstocks_path() == elsewhere

    def test_real_checkout_resolves(self):
        """The unmocked module must find the file it actually ships with."""
        assert resolve_feedstocks_path().is_file()

    def test_missing_file_raises_with_actionable_message(self, tmp_path, monkeypatch):
        # Nothing planted anywhere: the loader must fail loudly rather than return {}.
        services = tmp_path / "nowhere" / "backend" / "app" / "services"
        services.mkdir(parents=True)
        module = services / "canonical_loader.py"
        module.touch()
        monkeypatch.setattr(canonical_loader, "__file__", str(module))

        with pytest.raises(FileNotFoundError) as exc:
            load_raw()
        assert "CANONICAL_PARAMETERS_PATH" in str(exc.value)


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
        # BMP updated 2026-06: median raised to 165 NmL/gVS per Paulose 2021 (187.9 untreated)
        p = get_params("BAGACO")
        assert isinstance(p, FeedstockParams)
        assert p.bmp.medio == pytest.approx(165.0)
        assert p.ts.medio == pytest.approx(58.9)
        assert p.vs_of_ts.medio == pytest.approx(90.0)
        assert p.ch4_pct == pytest.approx(55.0)

    def test_bmp_range_ordering(self):
        p = get_params("BAGACO")
        assert p.bmp.min <= p.bmp.medio <= p.bmp.max

    def test_fde_defaults_to_one_when_absent(self):
        # All 26 canonical feedstocks now carry an audited fde block, so the
        # 1.0 fallback is exercised at the resolver level: an entry with no
        # `fde` key must yield theoretical potential (FDE = 1.0).
        from app.services.canonical_loader import _resolve_availability, _resolve_fde

        entry_without_fde = {"bmp": {"min": 1, "medio": 2, "max": 3}}
        fde = _resolve_fde(entry_without_fde)
        avail = _resolve_availability(entry_without_fde)
        assert fde.min == 1.0 and fde.medio == 1.0 and fde.max == 1.0
        assert avail.min == 1.0 and avail.medio == 1.0 and avail.max == 1.0

    def test_all_canonical_feedstocks_have_audited_fde(self):
        # Coverage guard: every feedstock must carry a real availability×eta block
        # (no feedstock silently falls back to theoretical FDE=1.0).
        fs = load_raw()
        for code in fs:
            p = get_params(code)
            assert 0.0 < p.fde.medio < 1.0, f"{code} has non-audited FDE {p.fde.medio}"
            assert p.fde.min <= p.fde.medio <= p.fde.max, f"{code} FDE not ordered"

    def test_fde_resolved_as_availability_times_eta(self):
        # BAGACO: availability medio 0.1693 × eta 0.70 = 0.11851
        # (FCo updated 2026-06: surplus fraction raised from 0.1818 to 0.22 per EPE BEN 2024)
        p = get_params("BAGACO")
        assert p.fde.medio == pytest.approx(0.1693 * 0.70, rel=1e-3)
        assert p.fde.min < p.fde.medio < p.fde.max  # genuine envelope

    def test_unknown_code_raises(self):
        with pytest.raises(KeyError):
            get_params("NOT_A_REAL_CODE")


@pytest.mark.unit
class TestGetParamsForStream:
    @pytest.mark.parametrize(
        "stream,code",
        [
            ("sugarcane", "BAGACO"),
            ("coffee", "CASCA_CAFE"),
            ("corn", "PALHA_MILHO"),
            ("soybean", "PALHA_SOJA"),  # field straw mapping (confirmed 2026-06)
            ("citrus", "BAGACO_CITROS"),
        ],
    )
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
