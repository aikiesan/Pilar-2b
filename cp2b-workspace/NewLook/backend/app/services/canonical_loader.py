"""
Canonical parameter loader — YAML single source of truth → FeedstockParams.

Bridges data/canonical_parameters/feedstocks.yaml to the pure forward
calculation engine (biogas_forward.py). Keeping I/O here leaves the engine
side-effect free and trivially testable.

If an `fde:` block is present for a feedstock it is loaded as a min/medio/max
Range; otherwise FDE defaults to 1.0 (theoretical potential) so the loader is
usable before the availability factors are canonicalised.
"""

from __future__ import annotations

import functools
from pathlib import Path

from app.services.biogas_forward import FeedstockParams, Range

# <NewLook>/data/canonical_parameters/feedstocks.yaml
# this file: <NewLook>/backend/app/services/canonical_loader.py → parents[3] = NewLook
_FEEDSTOCKS_PATH = (
    Path(__file__).resolve().parents[3] / "data" / "canonical_parameters" / "feedstocks.yaml"
)

# Aggregate stream key (as used in municipality data) → representative canonical
# feedstock code. Mirrors SERVICE_LAYER_MAP in scripts/generate_from_canonical.py
# and SERVICE_MAP in tests/unit/test_canonical_parameters.py.
STREAM_TO_CANONICAL: dict[str, str] = {
    "sugarcane": "BAGACO",
    "soybean": "CASCA_SOJA",
    "corn": "PALHA_MILHO",
    "coffee": "CASCA_CAFE",
    "citrus": "BAGACO_CITROS",
    "cattle": "ESTERCO_BOVINO",
    "swine": "DEJETOS_SUINO",
    "poultry": "CAMA_AVIARIO",
    "rsu": "FORSU",
    "rsu_organic": "FORSU",
    "rpo": "LODO_PRIMARIO",
    "rpo_pruning": "LODO_PRIMARIO",
}


def _range_from(block: dict) -> Range:
    return Range(float(block["min"]), float(block["medio"]), float(block["max"]))


@functools.lru_cache(maxsize=1)
def load_raw(path: str | None = None) -> dict:
    """Load and cache the raw feedstocks mapping from YAML."""
    import yaml  # imported lazily so non-canonical code paths don't require PyYAML

    p = Path(path) if path else _FEEDSTOCKS_PATH
    data = yaml.safe_load(p.read_text(encoding="utf-8"))
    return data["feedstocks"]


def get_params(code: str, path: str | None = None) -> FeedstockParams:
    """Build FeedstockParams for a canonical feedstock code (e.g. 'BAGACO')."""
    fs = load_raw(path)
    if code not in fs:
        raise KeyError(f"unknown canonical feedstock code: {code!r}")
    entry = fs[code]
    fde = (
        _range_from(entry["fde"])
        if isinstance(entry.get("fde"), dict) and {"min", "medio", "max"} <= set(entry["fde"])
        else Range(1.0, 1.0, 1.0)
    )
    return FeedstockParams(
        bmp=_range_from(entry["bmp"]),
        ts=_range_from(entry["ts"]),
        vs_of_ts=_range_from(entry["vs_of_ts"]),
        ch4_pct=float(entry.get("ch4_pct", 60.0)),
        fde=fde,
    )


def get_params_for_stream(stream: str, path: str | None = None) -> FeedstockParams:
    """Build FeedstockParams for an aggregate municipality stream key.

    Raises KeyError if the stream has no canonical mapping (e.g. 'forestry',
    'aquaculture' until those are added to the canonical database)."""
    if stream not in STREAM_TO_CANONICAL:
        raise KeyError(f"no canonical mapping for stream {stream!r}")
    return get_params(STREAM_TO_CANONICAL[stream], path)
