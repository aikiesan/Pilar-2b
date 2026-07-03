"""
Ingest report writer — every validate/promote run leaves a written trace in
docs/data/ingest_reports/<source_id>_<year>.md so reviewers (and the papers)
can see exactly what was checked and what the outcome was.
"""

from __future__ import annotations

from datetime import date
from pathlib import Path

from ingest.contract import IngestContext
from ingest.gates import GateResult, all_passed


def render_report(results: list[GateResult], ctx: IngestContext) -> str:
    verdict = "PROMOTED" if all_passed(results) else "BLOCKED"
    lines = [
        f"# Ingest report — {ctx.spec.source_id} ({ctx.year})",
        "",
        f"- **Source:** {ctx.spec.name}",
        f"- **Run date:** {date.today().isoformat()}",
        f"- **Verdict:** {verdict}",
        "",
        "## Gate results",
        "",
        "| Gate | Result | Details |",
        "|------|--------|---------|",
    ]
    for r in results:
        status = "✅ pass" if r.passed else "❌ FAIL"
        lines.append(f"| {r.gate} | {status} | {r.details} |")
    if ctx.regression_explanations:
        lines += ["", "## Explained metric changes", ""]
        for metric, why in ctx.regression_explanations.items():
            lines.append(f"- **{metric}**: {why}")
    lines.append("")
    return "\n".join(lines)


def write_report(results: list[GateResult], ctx: IngestContext, reports_dir: str | Path) -> Path:
    reports_dir = Path(reports_dir)
    reports_dir.mkdir(parents=True, exist_ok=True)
    path = reports_dir / f"{ctx.spec.source_id}_{ctx.year}.md"
    path.write_text(render_report(results, ctx), encoding="utf-8")
    return path
