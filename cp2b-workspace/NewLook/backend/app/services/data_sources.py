"""
Where the data the platform shows comes from: one registry of sources
(data/canonical_parameters/fontes_dados.yaml) that every map layer and page
block cites by key, so the page can put a source button beside what it shows.

Each entry resolves to the same shape the mandate panel uses ({key, title,
short, publisher, date, url, kind, note}) plus `license` and `to_check`. A
source without a link is either one of the platform's own estimates or says,
in `to_check`, what is missing; the list of open items comes from here.

`read` is the only I/O; it needs nothing from the app.
"""

from __future__ import annotations

from pathlib import Path

from app.services.mandate_service import SOURCE_KINDS

REGISTRY_YAML = "fontes_dados.yaml"


def read(directory: Path) -> dict:
    import yaml

    return yaml.safe_load((directory / REGISTRY_YAML).read_text(encoding="utf-8"))


def resolve(registry: dict, key: str) -> dict:
    if key not in registry["fontes"]:
        raise ValueError(f"unknown source {key!r}")
    f = registry["fontes"][key]
    if f["tipo"] not in SOURCE_KINDS:
        raise ValueError(f"source {key!r} has unknown kind {f['tipo']!r}")
    if not f.get("url") and f["tipo"] != "estimativa" and not f.get("conferir"):
        raise ValueError(f"source {key!r} has no link and does not say why")
    return {
        "key": key,
        "title": f["titulo"],
        "short": f["curta"],
        "publisher": f.get("autor"),
        "date": None if f.get("data") is None else str(f["data"]),
        "url": f.get("url"),
        "kind": f["tipo"],
        "note": f.get("nota"),
        "license": f.get("licenca"),
        "to_check": f.get("conferir"),
    }


def catalog(registry: dict) -> dict:
    """Every source, resolved, and the keys each map layer and page block cites."""
    sources = {key: resolve(registry, key) for key in registry["fontes"]}
    for group in ("camadas", "paginas"):
        for name, keys in registry[group].items():
            unknown = [k for k in keys if k not in sources]
            if unknown:
                raise ValueError(f"{group}.{name} cites unknown sources {unknown}")
    return {
        "version": str(registry["versao"]),
        "sources": sources,
        "layers": registry["camadas"],
        "pages": registry["paginas"],
        "to_check": sorted(k for k, s in sources.items() if s["to_check"]),
        "without_license": sorted(
            k for k, s in sources.items() if s["kind"] != "estimativa" and not s["license"]
        ),
    }
