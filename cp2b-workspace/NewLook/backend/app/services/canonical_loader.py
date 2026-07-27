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

# Streams whose activity count is split across two or more canonical feedstocks.
#
# One CSV column, several substrates. IBGE reports a single cattle head count for a
# herd that is two different systems: extensive beef on western pasture, where almost
# nothing is collectible, and confined dairy in the east, where almost everything is.
# A single ESTERCO_BOVINO averages them and buries the dairy cluster.
#
# THIS IS THE ONLY DECLARATION OF THE SPLIT. STREAM_TO_CANONICAL keeps mapping
# 'cattle' to the AGGREGATE code, because the map and the availability service read
# one code per stream and must not double-count; the state pipeline reads this table
# instead. The guard test in tests/unit/services/test_spatial_livestock.py asserts the
# two stay consistent — that the aggregate is never itself a sub-population, that the
# fractions sum to 1, and that no consumer silently mixes the two representations.
#
# entry: stream → ((sub_stream_label, canonical_code, fraction_of_head_count), ...)
STREAM_SUBPOPULATIONS: dict[str, tuple[tuple[str, str, float], ...]] = {
    # IBGE Censo Agropecuário 2017 (ibge2017_censo): SP herd ≈10.5M head,
    # ~67% beef/semi-extensive (Araçatuba, Pres. Prudente, Marília, Bauru, S.J. Rio
    # Preto) and ~33% dairy/intensive (Campinas, Sorocaba, Piracicaba, Araraquara,
    # Ribeirão Preto). State-level proportions; a per-municipality split needs SIDRA.
    "cattle": (
        ("cattle_corte", "ESTERCO_BOVINO_CORTE", 0.67),
        ("cattle_leiteiro", "ESTERCO_BOVINO_LEITEIRO", 0.33),
    ),
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


_FACTOR_KEYS = ("fc", "fco_available", "fl")


def _resolve_availability(entry: dict) -> Range:
    """Physical availability = FC × FCo_available × FL, DERIVED, never read.

    The three factors in `fde.components` are the data of record; availability is
    their product and is deliberately absent from the YAML. It used to be stored
    alongside them and had drifted out of step in 11 of 78 feedstock×scenario
    pairs (Lote 2, 2026-07-26) — a stored aggregate cannot contradict its own
    components if it is never stored.

    `fco_available` is the AVAILABLE share, not the committed one; the convention
    is `fco_available == 1 - fcp_committed`. The name carries the direction so the
    two cannot be silently swapped again (divergência D1 da auditoria).

    Shapes still accepted:
      1. components: fde: {components: {fc, fco_available, fl}, eta, ...}
      2. flat:       fde: {min, medio, max}   (already the product, includes η)
      3. absent:     → 1.0 (theoretical potential)
    """
    block = entry.get("fde")
    if not isinstance(block, dict):
        return Range(1.0, 1.0, 1.0)
    comps = block.get("components")
    if isinstance(comps, dict) and all(k in comps for k in _FACTOR_KEYS):
        prod = [1.0, 1.0, 1.0]
        for key in _FACTOR_KEYS:
            f = _range_from(comps[key])
            prod[0] *= f.min
            prod[1] *= f.medio
            prod[2] *= f.max
        return Range(*prod)
    if {"min", "medio", "max"} <= set(block):
        # flat FDE already includes η — can't separate; use as-is
        return _range_from(block)
    return Range(1.0, 1.0, 1.0)


def _resolve_fde(entry: dict) -> Range:
    """Effective FDE = availability (FC×FCo×FL) × eta (conversion efficiency).

    Derived on read from `fde.components` and `fde.eta`. Never persisted — no
    YAML field, no comment, holds an FDE or an availability product.
    """
    block = entry.get("fde")
    if not isinstance(block, dict):
        return Range(1.0, 1.0, 1.0)
    if {"min", "medio", "max"} <= set(block) and "components" not in block:
        return _range_from(block)  # flat shape already includes η
    avail = _resolve_availability(entry)
    eta = _eta_range(block.get("eta"))
    return Range(avail.min * eta.min, avail.medio * eta.medio, avail.max * eta.max)


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


@dataclass(frozen=True)
class AvailabilityProfile:
    """Temporal generation profile; descriptive and never multiplied into FDE."""

    window_months: tuple[int, ...]
    days_available_yr: int
    storable: bool
    max_storage_days: int | None
    point_of_availability: str
    source: str


def get_availability_profile(
    code: str, path: str | None = None
) -> AvailabilityProfile:
    """Return the non-multiplicative temporal profile for an instantiated code."""
    fs = load_raw(path)
    if code not in fs:
        raise KeyError(f"unknown canonical feedstock code: {code!r}")
    block = fs[code].get("availability_profile")
    if not isinstance(block, dict):
        raise KeyError(f"feedstock {code!r} has no `availability_profile`")
    return AvailabilityProfile(
        window_months=tuple(int(month) for month in block["window_months"]),
        days_available_yr=int(block["days_available_yr"]),
        storable=bool(block["storable"]),
        max_storage_days=(
            int(block["max_storage_days"])
            if block.get("max_storage_days") is not None
            else None
        ),
        point_of_availability=str(block["point_of_availability"]),
        source=str(block["source"]),
    )


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


def biomass_tons_from_code(code: str, units: float, path: str | None = None) -> Range:
    """Activity units → wet tonnes/year for a canonical code, bypassing the stream map.

    Needed by sub-populations that have no stream of their own: the cattle spatial
    split feeds one CSV column ('cattle') into ESTERCO_BOVINO_CORTE and
    ESTERCO_BOVINO_LEITEIRO, so there is no 1:1 stream→code mapping to look up.

    Goes through the loader on purpose. The Fase 2 branch reached into
    fs[code]["generation"] from inside the compute script — the exact shape that
    produced the 205M-chickens-as-tonnes bug documented above.
    """
    generation = get_generation(code, path)
    if generation is None:
        raise KeyError(
            f"feedstock {code!r} has no canonical `generation` block, so its activity "
            "units cannot be converted to tonnes. Add one to feedstocks.yaml rather "
            "than passing the raw count through as though it were biomass."
        )
    factor = generation.per_unit_yr
    return Range(units * factor.min, units * factor.medio, units * factor.max)


def biomass_tons_from_units(stream: str, units: float, path: str | None = None) -> Range:
    """Activity units (head count or population) → wet tonnes/year, per scenario.

    The single conversion for every livestock and urban stream. Raises rather than
    guessing: a stream with no `generation` block has no defensible head→tonnes
    factor, and silently returning the head count is the bug this replaces.
    """
    if stream not in STREAM_TO_CANONICAL:
        raise KeyError(f"no canonical mapping for stream {stream!r}")
    return biomass_tons_from_code(STREAM_TO_CANONICAL[stream], units, path)


def residue_tons_from_production(
    stream: str, production_tons: float, path: str | None = None
) -> Range:
    """Crop production tonnes → residue tonnes/year, via the canonical RPR.

    IBGE PAM reports what was HARVESTED (grain, green coffee); the platform models
    what is left over. `rpr` is that bridge, and it lives in feedstocks.yaml so the
    map, the canonical state totals and the ingest gates cannot drift apart —
    before this it existed only as a hardcoded constant in one frontend page.

    The ratio is GROSS: collectability (how much may actually be removed without
    stripping soil cover) is the fde/FCo block's job. Applying both here would
    discount the residue twice.
    """
    if stream not in STREAM_TO_CANONICAL:
        raise KeyError(f"no canonical mapping for stream {stream!r}")
    block = load_raw(path)[STREAM_TO_CANONICAL[stream]].get("rpr")
    if block is None:
        raise KeyError(
            f"stream {stream!r} has no canonical `rpr` block, so crop production "
            "cannot be converted to residue. Add one to feedstocks.yaml rather than "
            "treating production tonnage as though it were residue."
        )
    ratio = _range_from(block)
    return Range(
        production_tons * ratio.min,
        production_tons * ratio.medio,
        production_tons * ratio.max,
    )


def mill_delivery_fraction(stream: str, path: str | None = None) -> Range | None:
    """Share of reported crop production that reaches industrial processing.

    Only sugarcane has one today: PAM reports cane PRODUCED, but bagaço, torta
    and vinhaça are generated inside the mill, so they exist only for the cane
    actually crushed. Returns None for streams where production and processing
    are the same thing.
    """
    if stream not in STREAM_TO_CANONICAL:
        raise KeyError(f"no canonical mapping for stream {stream!r}")
    block = load_raw(path)[STREAM_TO_CANONICAL[stream]].get("mill_delivery_fraction")
    return _range_from(block) if block else None


def biomass_tons_from_collected_waste(
    stream: str, collected_tons: float, path: str | None = None
) -> Range:
    """Collected municipal waste tonnage → digestible substrate tonnes/year.

    The measured counterpart of biomass_tons_from_units: where a municipality
    REPORTS what it collected (SNIS CO111), that beats modelling the tonnage from
    population. Only the composition step remains — collected household waste is
    the whole stream, of which 50–55% is organic (feedstocks.yaml
    FORSU.organic_fraction_of_rdo, ref snis2022_rsu).

    Raises rather than guessing, for the same reason as biomass_tons_from_units:
    passing collected MSW through as if it were all digestible substrate would
    overstate the organic fraction by roughly 2x.
    """
    if stream not in STREAM_TO_CANONICAL:
        raise KeyError(f"no canonical mapping for stream {stream!r}")
    block = load_raw(path)[STREAM_TO_CANONICAL[stream]].get("organic_fraction_of_rdo")
    if block is None:
        raise KeyError(
            f"stream {stream!r} has no `organic_fraction_of_rdo` block, so collected "
            "waste tonnage cannot be converted to digestible substrate. Add one to "
            "feedstocks.yaml rather than treating collected MSW as all-organic."
        )
    fraction = _range_from(block)
    return Range(
        collected_tons * fraction.min,
        collected_tons * fraction.medio,
        collected_tons * fraction.max,
    )


def get_params_for_stream(stream: str, path: str | None = None) -> FeedstockParams:
    """Build FeedstockParams for an aggregate municipality stream key.

    Raises KeyError if the stream has no canonical mapping (e.g. 'forestry',
    'aquaculture' until those are added to the canonical database)."""
    if stream not in STREAM_TO_CANONICAL:
        raise KeyError(f"no canonical mapping for stream {stream!r}")
    return get_params(STREAM_TO_CANONICAL[stream], path)
