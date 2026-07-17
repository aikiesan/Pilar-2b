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
import os
from dataclasses import dataclass
from pathlib import Path

from app.services.biogas_forward import FeedstockParams, Range

# feedstocks.yaml sits at <NewLook>/data/, outside backend/, and how many parent
# hops reach it depends on the runtime layout — no single parents[N] works for both:
#
#   repo checkout: <NewLook>/backend/app/services/  → parents[3] = <NewLook>
#   Docker:        /app/app/services/               → parents[3] = /   (compose
#                  binds ./backend as /app, so the tree is one level shallower)
#
# So resolve by looking, not by counting.
_RELATIVE = Path("data") / "canonical_parameters" / "feedstocks.yaml"
_PATH_ENV_VAR = "CANONICAL_PARAMETERS_PATH"


def resolve_feedstocks_path() -> Path:
    """Locate feedstocks.yaml across the repo and container layouts.

    Falls back to the repo-layout path when nothing is found, so the resulting
    error names the location a developer most likely expects.
    """
    override = os.environ.get(_PATH_ENV_VAR)
    if override:
        return Path(override)
    here = Path(__file__).resolve()
    for hop in (3, 2):  # 3 = repo checkout root; 2 = backend/, which is /app in Docker
        candidate = here.parents[hop] / _RELATIVE
        if candidate.is_file():
            return candidate
    return here.parents[3] / _RELATIVE


# Aggregate stream key (as used in municipality data) → representative canonical
# feedstock code. Mirrors SERVICE_LAYER_MAP in scripts/generate_from_canonical.py
# and SERVICE_MAP in tests/unit/test_canonical_parameters.py.
STREAM_TO_CANONICAL: dict[str, str] = {
    "sugarcane": "BAGACO",
    "soybean": "PALHA_SOJA",  # field straw (confirmed 2026-06); NOT hull (CASCA_SOJA)
    "corn": "PALHA_MILHO",
    "coffee": "CASCA_CAFE",
    "citrus": "BAGACO_CITROS",
    "cattle": "ESTERCO_BOVINO",
    "swine": "DEJETOS_SUINO",
    "poultry": "CAMA_AVIARIO",
    "rsu": "FORSU",
    "rsu_organic": "FORSU",
    "rpo": "PODA_URBANA",  # urban pruning waste (confirmed 2026-06); NOT sludge
    "rpo_pruning": "PODA_URBANA",  # idem
}


def _range_from(block: dict) -> Range:
    return Range(float(block["min"]), float(block["medio"]), float(block["max"]))


@functools.lru_cache(maxsize=1)
def load_raw(path: str | None = None) -> dict:
    """Load and cache the raw feedstocks mapping from YAML."""
    import yaml  # imported lazily so non-canonical code paths don't require PyYAML

    p = Path(path) if path else resolve_feedstocks_path()
    if not p.is_file():
        raise FileNotFoundError(
            f"canonical parameters not found at {p}. feedstocks.yaml is the single "
            "source of truth for every BMP/TS/VS/FDE value — without it no canonical "
            "metric can be computed at all. In Docker, mount data/canonical_parameters "
            "into the image (compose binds only backend/ as /app, so nothing under "
            f"data/ is visible by default), or set {_PATH_ENV_VAR}."
        )
    data = yaml.safe_load(p.read_text(encoding="utf-8"))
    return data["feedstocks"]


def _eta_range(block) -> Range:
    """Conversion efficiency as a Range. Accepts a scalar or a min/medio/max dict."""
    if isinstance(block, dict) and {"min", "medio", "max"} <= set(block):
        return _range_from(block)
    if block is None:
        return Range(1.0, 1.0, 1.0)
    e = float(block)
    return Range(e, e, e)


def _resolve_fde(entry: dict) -> Range:
    """Effective FDE = availability (FC×FCo×FS×FL) × eta (conversion efficiency).

    Supports three YAML shapes for backward/forward compatibility:
      1. structured:  fde: {availability: {min,medio,max}, eta: <scalar|range>, ...}
      2. flat:        fde: {min, medio, max}   (already the product)
      3. absent:      → 1.0 (theoretical potential)
    """
    block = entry.get("fde")
    if not isinstance(block, dict):
        return Range(1.0, 1.0, 1.0)
    if "availability" in block:
        avail = _range_from(block["availability"])
        eta = _eta_range(block.get("eta"))
        return Range(
            avail.min * eta.min,
            avail.medio * eta.medio,
            avail.max * eta.max,
        )
    if {"min", "medio", "max"} <= set(block):
        return _range_from(block)
    return Range(1.0, 1.0, 1.0)


def _resolve_availability(entry: dict) -> Range:
    """Physical availability = FC×FCo×FS×FL (without eta conversion efficiency).

    Returns the fraction of biomass that is physically mobilisable for biogas,
    independent of the digestion conversion efficiency. Used to compute
    biomass_corrected = biomass_gross × availability.
    """
    block = entry.get("fde")
    if not isinstance(block, dict):
        return Range(1.0, 1.0, 1.0)
    if "availability" in block:
        return _range_from(block["availability"])
    if {"min", "medio", "max"} <= set(block):
        # flat FDE already includes η — can't separate; use as-is
        return _range_from(block)
    return Range(1.0, 1.0, 1.0)


def get_params(code: str, path: str | None = None) -> FeedstockParams:
    """Build FeedstockParams for a canonical feedstock code (e.g. 'BAGACO')."""
    fs = load_raw(path)
    if code not in fs:
        raise KeyError(f"unknown canonical feedstock code: {code!r}")
    entry = fs[code]
    return FeedstockParams(
        bmp=_range_from(entry["bmp"]),
        ts=_range_from(entry["ts"]),
        vs_of_ts=_range_from(entry["vs_of_ts"]),
        ch4_pct=float(entry.get("ch4_pct", 60.0)),
        fde=_resolve_fde(entry),
        availability=_resolve_availability(entry),
    )


# ── Generation: raw activity units → wet tonnes of residue ───────────────────
# Livestock and urban streams are not measured in tonnes anywhere. IBGE PPM counts
# ANIMALS and SNIS/IBGE count PEOPLE; the tonnage of manure or waste they imply is
# canonical, and lives in feedstocks.yaml under `generation`.
#
# This step used to exist only inside scripts/compute_sp_canonical_totals.py, which
# reached past this loader into raw YAML (fs[code]["generation"]). The map never got
# the conversion, so it read IBGE's head counts straight out of the
# `{stream}_biomass_tons_year` columns and rendered animals as tonnes — 205M chickens
# became 205M tonnes of litter (real: 9.3M). Verified 2026-07-17: those columns match
# PPM head counts at ratios 1.040 / 1.003 / 1.072, and as tonnes they would imply
# every species excreting an identical 2.74 kg/day — more than a hen's body weight.
#
# So the conversion belongs here, behind one accessor both callers must use.
_GENERATION_UNIT_KEYS = {"per_head": "t_per_head_yr", "per_capita": "t_per_capita_yr"}


@dataclass(frozen=True)
class Generation:
    """How many wet tonnes/year one unit of activity produces.

    `type` is 'per_head' (unit = one animal) or 'per_capita' (unit = one person).
    """

    type: str
    per_unit_yr: Range


def get_generation(code: str, path: str | None = None) -> Generation | None:
    """Canonical generation factor for a feedstock code, or None if it has no
    `generation` block (agricultural streams are already reported in tonnes)."""
    fs = load_raw(path)
    if code not in fs:
        raise KeyError(f"unknown canonical feedstock code: {code!r}")
    block = fs[code].get("generation")
    if not isinstance(block, dict):
        return None
    unit_key = _GENERATION_UNIT_KEYS.get(block.get("type", ""))
    if unit_key is None or unit_key not in block:
        return None
    return Generation(block["type"], _range_from(block[unit_key]))


def get_generation_for_stream(stream: str, path: str | None = None) -> Generation | None:
    if stream not in STREAM_TO_CANONICAL:
        raise KeyError(f"no canonical mapping for stream {stream!r}")
    return get_generation(STREAM_TO_CANONICAL[stream], path)


def biomass_tons_from_units(stream: str, units: float, path: str | None = None) -> Range:
    """Activity units (head count or population) → wet tonnes/year, per scenario.

    The single conversion for every livestock and urban stream. Raises rather than
    guessing: a stream with no `generation` block has no defensible head→tonnes
    factor, and silently returning the head count is the bug this replaces.
    """
    generation = get_generation_for_stream(stream, path)
    if generation is None:
        raise KeyError(
            f"stream {stream!r} has no canonical `generation` block, so its activity "
            "units cannot be converted to tonnes. Add one to feedstocks.yaml rather "
            "than passing the raw count through as though it were biomass."
        )
    factor = generation.per_unit_yr
    return Range(units * factor.min, units * factor.medio, units * factor.max)


def get_params_for_stream(stream: str, path: str | None = None) -> FeedstockParams:
    """Build FeedstockParams for an aggregate municipality stream key.

    Raises KeyError if the stream has no canonical mapping (e.g. 'forestry',
    'aquaculture' until those are added to the canonical database)."""
    if stream not in STREAM_TO_CANONICAL:
        raise KeyError(f"no canonical mapping for stream {stream!r}")
    return get_params(STREAM_TO_CANONICAL[stream], path)
