#!/usr/bin/env python3
"""Recompute every figure in data/canonical_parameters/official_figures.yaml from its source.

The registry is only useful if it cannot drift: each entry names the file that
produces the number, and this script re-reads or recomputes it there. It also
enforces the registry's own rules:

  * no two `vigente` figures share a `rotulo_publico`;
  * every `substituido` figure names an existing `substituido_por`;
  * every `pendente` figure states its `decisao`.

Run from cp2b-workspace/NewLook:
    python3 scripts/verify_official_figures.py

Exit code 0 when everything matches, 1 otherwise.
"""

from __future__ import annotations

import ast
import csv
import importlib.util
import json
import sys
from pathlib import Path

import yaml

NEWLOOK = Path(__file__).resolve().parents[1]
REGISTRY = NEWLOOK / "data" / "canonical_parameters" / "official_figures.yaml"
RTOL = 1e-9


def _python_const(spec: dict) -> float:
    tree = ast.parse((NEWLOOK / spec["arquivo"]).read_text(encoding="utf-8"))
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(
            isinstance(t, ast.Name) and t.id == spec["nome"] for t in node.targets
        ):
            value = ast.literal_eval(node.value)
            return float(value[tuple(spec["chave"])] if "chave" in spec else value)
    raise KeyError(f"{spec['nome']} not found in {spec['arquivo']}")


def _json(spec: dict) -> float:
    node = json.loads((NEWLOOK / spec["arquivo"]).read_text(encoding="utf-8"))
    for key in spec["caminho"]:
        node = node[key]
    return float(node)


def _script(spec: dict) -> float:
    path = NEWLOOK / spec["arquivo"]
    mod_spec = importlib.util.spec_from_file_location(path.stem, path)
    mod = importlib.util.module_from_spec(mod_spec)
    mod_spec.loader.exec_module(mod)
    rows = list(csv.DictReader((NEWLOOK / spec["master"]).open(encoding="utf-8-sig")))
    return float(sum(mod.calcular(rows, spec["tier"]).values()))


def _csv_sum(spec: dict) -> float:
    total = 0.0
    with (NEWLOOK / spec["arquivo"]).resolve().open(encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            if all(row.get(k) == v for k, v in spec.get("filtro", {}).items()):
                total += float(row[spec["coluna"]] or 0)
    return total


READERS = {"python_const": _python_const, "json": _json, "script": _script, "csv_sum": _csv_sum}


def check(registry: dict) -> list[str]:
    errors: list[str] = []
    figs = registry["figuras"]
    ids = {f["id"] for f in figs}
    if len(ids) != len(figs):
        errors.append("duplicate id in registry")

    vigentes: dict[str, str] = {}
    for f in figs:
        if f["status"] == "vigente":
            other = vigentes.setdefault(f["rotulo_publico"], f["id"])
            if other != f["id"]:
                errors.append(f"rotulo_publico '{f['rotulo_publico']}' used by {other} and {f['id']}")
        if f["status"] == "substituido" and f.get("substituido_por") not in ids:
            errors.append(f"{f['id']}: substituido_por missing or unknown")
        if f["status"] == "pendente" and not f.get("decisao"):
            errors.append(f"{f['id']}: pendente without decisao")

        spec = f["verificar"]
        try:
            got = READERS[spec["tipo"]](spec)
        except Exception as exc:  # report every broken source, not just the first
            errors.append(f"{f['id']}: cannot read source ({type(exc).__name__}: {exc})")
            continue
        want = float(f["valor"])
        if abs(got - want) > RTOL * max(1.0, abs(want)) + 0.5:
            errors.append(f"{f['id']}: registry {want:,.3f} != source {got:,.3f}")
    return errors


def main() -> int:
    registry = yaml.safe_load(REGISTRY.read_text(encoding="utf-8"))
    errors = check(registry)
    figs = registry["figuras"]
    for f in figs:
        mark = "FAIL" if any(e.startswith(f["id"] + ":") for e in errors) else "ok"
        print(f"  [{mark:>4}] {f['status']:<11} {f['id']:<52} {float(f['valor']):>20,.0f} {f['unidade']}")
    if errors:
        print("\n".join(["", "Errors:"] + [f"  - {e}" for e in errors]))
        return 1
    print(f"\n{len(figs)} figures match their sources.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
