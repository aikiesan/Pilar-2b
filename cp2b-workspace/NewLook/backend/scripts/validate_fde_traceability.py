#!/usr/bin/env python3
"""
validate_fde_traceability.py
============================
Reproducibility guard for the canonical FDE dataset.

Checks, for every feedstock in data/canonical_parameters/feedstocks.yaml:
  1. availability_{sc} == FC_{sc} × FCo_{sc} × FS_{sc} × FL_{sc}  (coupled, ≤1.5e-3)
  2. min ≤ medio ≤ max for availability and every component
  3. every referenced id exists in references.yaml AND carries a non-empty url
  4. each fde block cites ≥2 references
  5. each fde block declares a confidence tier in {HIGH, MEDIUM, LOW}

Also emits docs/data/FDE_TRACEABILITY_MATRIX.md (per-factor source + URL table)
when called with --emit, so the published matrix is always regenerated from the
single source of truth (never hand-edited).

Exit code 0 = all checks pass; 1 = at least one failure (CI-friendly).
"""
from __future__ import annotations

import sys
from pathlib import Path

import yaml

_NEWLOOK = Path(__file__).resolve().parents[2]
_FEEDSTOCKS = _NEWLOOK / "data" / "canonical_parameters" / "feedstocks.yaml"
_REFERENCES = _NEWLOOK / "data" / "canonical_parameters" / "references.yaml"
_MATRIX = _NEWLOOK / "docs" / "data" / "FDE_TRACEABILITY_MATRIX.md"

SCEN = ("min", "medio", "max")
TIERS = {"HIGH", "MEDIUM", "LOW"}
TOL = 1.5e-3


def load():
    fs = yaml.safe_load(_FEEDSTOCKS.read_text(encoding="utf-8"))["feedstocks"]
    refs = yaml.safe_load(_REFERENCES.read_text(encoding="utf-8"))["references"]
    return fs, refs


def validate(fs: dict, refs: dict) -> list[str]:
    errors: list[str] = []
    for code, e in fs.items():
        blk = e.get("fde")
        if not isinstance(blk, dict) or "availability" in blk is False:
            errors.append(f"{code}: missing fde/availability block")
            continue
        comps = blk.get("components")
        if not comps:
            errors.append(f"{code}: fde has no components")
            continue
        for sc in SCEN:
            prod = comps["fc"][sc] * comps["fco"][sc] * comps["fs"][sc] * comps["fl"][sc]
            stored = blk["availability"][sc]
            if abs(prod - stored) > TOL:
                errors.append(f"{code}.{sc}: availability {stored} != FC×FCo×FS×FL {prod:.4f}")
        for key in ("availability", *(("components",) if comps else ())):
            pass
        # ordering
        av = blk["availability"]
        if not (av["min"] <= av["medio"] <= av["max"]):
            errors.append(f"{code}: availability not ordered min≤medio≤max")
        for fk in ("fc", "fco", "fs", "fl"):
            c = comps[fk]
            if not (c["min"] <= c["medio"] <= c["max"]):
                errors.append(f"{code}.{fk}: not ordered min≤medio≤max")
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
        av = blk["availability"]
        fde_med = av["medio"] * (eta if isinstance(eta, (int, float)) else eta.get("medio", 1.0))
        # primary source per factor = first ref whose value mentions the factor tag
        def src_for(tag: str) -> str:
            for r in blk["refs"]:
                if r["value"].upper().startswith(tag):
                    return r["id"]
            return blk["refs"][0]["id"]
        fc_s, fco_s, fs_s, fl_s = (src_for(t) for t in ("FC", "FCO", "FS", "FL"))
        rows.append((code, e.get("pt_name", ""), blk.get("confidence", "?"),
                     c["fc"]["medio"], fc_s, c["fco"]["medio"], fco_s,
                     c["fs"]["medio"], fs_s, c["fl"]["medio"], fl_s,
                     eta, av["medio"], fde_med, blk["refs"]))

    lines = [
        "# FDE Traceability Matrix — PILAR-2b Canonical Feedstock Database",
        "",
        "**AUTO-GENERATED** by `backend/scripts/validate_fde_traceability.py --emit`.",
        "Do NOT edit by hand — edit `feedstocks.yaml`/`references.yaml` and regenerate.",
        "",
        "`FDE = availability × η` where `availability = FC × FCo × FS × FL`.",
        "All values are the **medio** scenario; each factor lists the reference id that",
        "reports it (full citation + URL in `references.yaml`). Confidence tiers: HIGH =",
        "regulatory/measured per-factor sources; MEDIUM = regional studies/proxy; LOW =",
        "generic or no-direct-study proxy.",
        "",
        "| Feedstock | Conf. | FC (src) | FCo (src) | FS (src) | FL (src) | η | avail | FDE |",
        "|---|---|---|---|---|---|---:|---:|---:|",
    ]
    for (code, pt, conf, fc, fcs, fco, fcos, fsv, fss, fl, fls, eta, avm, fdem, _r) in rows:
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
    print(f"Wrote {_MATRIX.relative_to(_NEWLOOK)} ({len(rows)} feedstocks, {len(cited)} cited refs)")


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
