#!/usr/bin/env python3
"""
validate_fde_traceability.py
============================
Reproducibility guard for the canonical FDE dataset.

Checks, for every feedstock in data/canonical_parameters/feedstocks.yaml:
  1. the four components fc / fco_available / fs / fl are present
  2. min ≤ medio ≤ max for every component and for the derived availability
  3. every referenced id exists in references.yaml AND carries a non-empty url
  4. each fde block cites ≥2 references
  5. each fde block declares a confidence tier in {HIGH, MEDIUM, LOW}
  6. each component declares `reference:` — an id in references.yaml, or an
     explicit null. There is no fallback: a factor with no source that reports
     it prints "—" in the matrix instead of borrowing the block's first ref.

Check 1 used to be `availability == FC×FCo×FS×FL`. It is gone because
`availability` is no longer stored: the loader derives it from the components on
read (Lote 2, 2026-07-26), so the identity holds by construction and cannot be
violated. What replaced it is check 6 — the traceability the matrix claims.

Also emits docs/data/FDE_TRACEABILITY_MATRIX.md (per-factor source + URL table)
when called with --emit, so the published matrix is always regenerated from the
single source of truth (never hand-edited).

Exit code 0 = all checks pass; 1 = at least one failure (CI-friendly).
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import yaml

# Locate the canonical data by walking up, not by counting parents.
#
# parents[2] assumed the checkout layout. docker-compose bind-mounts ./backend to
# /app, so in the container parents[2] is "/" and this looked for
# /data/canonical_parameters/feedstocks.yaml. canonical_loader already solved
# exactly this in #147 (resolve_feedstocks_path, with a CP2B_FEEDSTOCKS_PATH
# override); this mirrors that rather than inventing a third convention.
_RELATIVE = Path("data") / "canonical_parameters"


def _find_dir(relative: Path) -> Path:
    """Nearest ancestor whose data/canonical_parameters actually holds the YAML.

    Probing for the FILE, not the directory: backend/data/canonical_parameters
    exists in the checkout but is empty, so an is_dir() check matches it and then
    fails to open feedstocks.yaml.
    """
    override = os.environ.get("CP2B_FEEDSTOCKS_PATH")
    if override:  # points at the yaml itself; its parent is the directory
        return Path(override).resolve().parent
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / relative / "feedstocks.yaml").is_file():
            return parent / relative
    # Fall back to the checkout layout so the error names what a developer expects.
    return here.parents[2] / relative


_CANONICAL = _find_dir(_RELATIVE)
_FEEDSTOCKS = _CANONICAL / "feedstocks.yaml"
_REFERENCES = _CANONICAL / "references.yaml"
_MATRIX = _CANONICAL.parent.parent / "docs" / "data" / "FDE_TRACEABILITY_MATRIX.md"

SCEN = ("min", "medio", "max")
FACTORS = ("fc", "fco_available", "fs", "fl")
TIERS = {"HIGH", "MEDIUM", "LOW"}


def load():
    fs = yaml.safe_load(_FEEDSTOCKS.read_text(encoding="utf-8"))["feedstocks"]
    refs = yaml.safe_load(_REFERENCES.read_text(encoding="utf-8"))["references"]
    return fs, refs


def availability(blk: dict) -> dict:
    """FC × FCo_available × FS × FL, derived. Mirrors canonical_loader."""
    c = blk["components"]
    return {sc: c["fc"][sc] * c["fco_available"][sc] * c["fs"][sc] * c["fl"][sc] for sc in SCEN}


def validate(fs: dict, refs: dict) -> list[str]:
    errors: list[str] = []
    for code, e in fs.items():
        blk = e.get("fde")
        if not isinstance(blk, dict):
            errors.append(f"{code}: missing fde block")
            continue
        comps = blk.get("components")
        if not comps or any(fk not in comps for fk in FACTORS):
            errors.append(f"{code}: fde components missing one of {FACTORS}")
            continue
        if "availability" in blk:
            errors.append(
                f"{code}: `availability` is persisted — it must be derived from the "
                "components, never written to the YAML"
            )
        # ordering
        av = availability(blk)
        if not (av["min"] <= av["medio"] <= av["max"]):
            errors.append(f"{code}: derived availability not ordered min≤medio≤max")
        for fk in FACTORS:
            c = comps[fk]
            if not (c["min"] <= c["medio"] <= c["max"]):
                errors.append(f"{code}.{fk}: not ordered min≤medio≤max")
            if "reference" not in c:
                errors.append(f"{code}.{fk}: no `reference` key (use null if unsourced)")
                continue
            rid = c["reference"]
            if rid is not None and rid not in refs:
                errors.append(f"{code}.{fk}: reference '{rid}' not in references.yaml")
            elif rid is not None and not (refs[rid].get("url") or "").strip():
                errors.append(f"{code}.{fk}: reference '{rid}' has no url")
        # references
        rl = [r["id"] for r in blk.get("refs", [])]
        if len(rl) < 2:
            errors.append(f"{code}: fewer than 2 references in fde block")
        for rid in rl:
            if rid not in refs:
                errors.append(f"{code}: ref '{rid}' not in references.yaml")
            elif not (refs[rid].get("url") or "").strip():
                errors.append(f"{code}: ref '{rid}' has no url")
        # confidence
        if blk.get("confidence") not in TIERS:
            errors.append(f"{code}: confidence '{blk.get('confidence')}' not in {sorted(TIERS)}")
    return errors


def emit_matrix(fs: dict, refs: dict) -> None:
    def url(rid: str) -> str:
        return (refs.get(rid, {}) or {}).get("url", "")

    rows = []
    for code, e in sorted(fs.items()):
        blk = e["fde"]
        c = blk["components"]
        eta = blk.get("eta")
        av = availability(blk)
        fde_med = av["medio"] * (eta if isinstance(eta, (int, float)) else eta.get("medio", 1.0))

        # Source per factor is declared, not guessed. `reference: null` prints "—":
        # the matrix reports the gap rather than borrowing the block's first ref.
        def src_for(fk: str) -> str:
            return c[fk].get("reference") or "—"

        fc_s, fco_s, fs_s, fl_s = (src_for(fk) for fk in FACTORS)
        rows.append(
            (
                code,
                e.get("pt_name", ""),
                blk.get("confidence", "?"),
                c["fc"]["medio"],
                fc_s,
                c["fco_available"]["medio"],
                fco_s,
                c["fs"]["medio"],
                fs_s,
                c["fl"]["medio"],
                fl_s,
                eta,
                av["medio"],
                fde_med,
                blk["refs"],
            )
        )

    lines = [
        "# FDE Traceability Matrix — PILAR-2b Canonical Feedstock Database",
        "",
        "**AUTO-GENERATED** by `backend/scripts/validate_fde_traceability.py --emit`.",
        "Do NOT edit by hand — edit `feedstocks.yaml`/`references.yaml` and regenerate.",
        "",
        "`FDE = availability × η` where `availability = FC × FCo_available × FS × FL`.",
        "`availability` is **derived on read** — it is not a field of `feedstocks.yaml`.",
        "`FCo_available` is the AVAILABLE share, by the convention",
        "`fco_available == 1 - fcp_committed`.",
        "",
        "All values are the **medio** scenario. The source column is the `reference:`",
        "declared on that factor in `feedstocks.yaml` (full citation + URL in",
        "`references.yaml`). **`—` means no versioned reference reports that factor** —",
        "until 2026-07-26 these cells silently borrowed the block's first reference, so",
        "the matrix appeared fully sourced when it was not. Confidence tiers: HIGH =",
        "regulatory/measured per-factor sources; MEDIUM = regional studies/proxy; LOW =",
        "generic or no-direct-study proxy.",
        "",
        "| Feedstock | Conf. | FC (src) | FCo_av (src) | FS (src) | FL (src) | η | avail | FDE |",
        "|---|---|---|---|---|---|---:|---:|---:|",
    ]
    for code, pt, conf, fc, fcs, fco, fcos, fsv, fss, fl, fls, eta, avm, fdem, _r in rows:
        etas = eta if isinstance(eta, (int, float)) else eta.get("medio")
        lines.append(
            f"| **{code}** | {conf} | {fc:.2f} ({fcs}) | {fco:.2f} ({fcos}) | "
            f"{fsv:.2f} ({fss}) | {fl:.2f} ({fls}) | {etas} | {avm:.4f} | {fdem:.4f} |"
        )

    # reference URL appendix (only refs actually cited by an fde block)
    cited = sorted({r["id"] for e in fs.values() for r in e["fde"]["refs"]})
    lines += ["", "## Cited reference URLs", ""]
    for rid in cited:
        r = refs.get(rid, {})
        v = " ✓verified" if r.get("verified") else " (unverified — see note)"
        lines.append(f"- `{rid}` — [{r.get('url','NO URL')}]({r.get('url','')}){v}")

    _MATRIX.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(
        # _NEWLOOK was never defined — --emit wrote the matrix and then died on this
        # line, so it always exited non-zero and could not be a CI step (Lote 2).
        f"Wrote {_MATRIX} ({len(rows)} feedstocks, {len(cited)} cited refs)"
    )


def main() -> int:
    fs, refs = load()
    errors = validate(fs, refs)
    if "--emit" in sys.argv and not errors:
        emit_matrix(fs, refs)
    if errors:
        print(f"FDE traceability: {len(errors)} FAILURE(S)")
        for e in errors:
            print("  ✗", e)
        return 1
    print(f"FDE traceability: all checks pass for {len(fs)} feedstocks ✅")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
