"""Canonical energy-route parameters loaded from the versioned YAML file."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import yaml

ENERGY_PARAMETERS_PATH = (
    Path(__file__).resolve().parents[3]
    / "data"
    / "canonical_parameters"
    / "energy.yaml"
)


@lru_cache(maxsize=1)
def load_energy_parameters() -> dict:
    with ENERGY_PARAMETERS_PATH.open(encoding="utf-8") as handle:
        return yaml.safe_load(handle)


ENERGY_PARAMETERS = load_energy_parameters()
UPGRADING_EFFICIENCY = float(
    ENERGY_PARAMETERS["biomethane"]["upgrading_recovery"]
)
