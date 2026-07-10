#!/usr/bin/env python3
"""
Run OGC CITE conformance suites against the PILAR-2b GeoServer via TEAM Engine.

TEAM Engine (ogccite/teamengine-production) hosts the official OGC Executable
Test Suites (ETS). This script submits a headless run through its REST API for
each configured suite (WMS 1.3.0, WFS 2.0), saves the EARL report, parses the
pass/fail tally, and compares it against a per-suite regression baseline.

Some assertions can never pass against our own data (they require the official
CITE reference dataset and WFS-T), so demanding zero failures would make the
gate permanently red and therefore useless. Instead the script fails when a
suite gets WORSE than its baseline, or when a suite does not run at all — which
is the thing a PR can actually break. See SUITES[*]["max_failures"].

Usage:
    python run_cite.py                 # fail on regressions vs. the baseline
    python run_cite.py --strict        # require ZERO failures (full certification)
    python run_cite.py --soft          # report but always exit 0
    python run_cite.py --suite wms13   # one suite only
    python run_cite.py --list          # list suites TEAM Engine actually offers

Env:
    TEAMENGINE_URL   default http://localhost:8088/teamengine
    TEAMENGINE_USER  default teamengine
    TEAMENGINE_PASS  default teamengine
    # The IUT (capabilities) URL must be reachable FROM the TEAM Engine container.
    # In docker-compose that's the service name, not localhost:
    GEOSERVER_INTERNAL_URL  default http://geoserver:8080/geoserver
    GEOSERVER_WORKSPACE     default cp2b
    CITE_REPORT_DIR         default ./reports

⚠️ The ETS *version* segment and the IUT *parameter name* in the REST path are
   version-sensitive and vary per suite. Defaults below reflect common values;
   confirm against `--list` (GET /rest/suites) and the ETS docs on first run,
   then pin them here. This is the one piece that must be validated live.
"""
from __future__ import annotations

import argparse
import os
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import requests

TEAMENGINE_URL = os.getenv("TEAMENGINE_URL", "http://localhost:8088/teamengine").rstrip("/")
AUTH = (os.getenv("TEAMENGINE_USER", "teamengine"), os.getenv("TEAMENGINE_PASS", "teamengine"))
GS_INTERNAL = os.getenv("GEOSERVER_INTERNAL_URL", "http://geoserver:8080/geoserver").rstrip("/")
WORKSPACE = os.getenv("GEOSERVER_WORKSPACE", "cp2b")
REPORT_DIR = Path(os.getenv("CITE_REPORT_DIR", "reports"))

EARL = "{http://www.w3.org/ns/earl#}"


# Per-suite REST config. `iut_param` is the query key the ETS expects for the
# capabilities URL; `version` is the ETS version segment in the REST path.
# Validated live 2026-07-09 against ogccite/teamengine-production: this build
# uses versionless run paths (/rest/suites/<name>/run), so `version` defaults
# to empty. Set ETS_*_VERSION if a future image reintroduces the segment.
#
# `max_failures` is a REGRESSION BASELINE, not a target. Full CITE certification
# needs the official OGC reference dataset (fixtures such as
# gml:name = "Pellentesque Arcu Lorem") and WFS-T transactions, which our
# read-only layers do not serve — so a fixed number of assertions can never pass
# against our own data. The baselines below are the counts observed on the first
# green live run (2026-07-09 locally, reproduced exactly in CI run 29092826578).
# The gate therefore asks the only useful question: "did this change make
# conformance WORSE?" Lower the numbers whenever a run beats them; drop the
# mechanism entirely once the reference dataset is loaded.
SUITES = {
    "wms13": {
        "version": os.getenv("ETS_WMS13_VERSION", ""),
        "iut_param": os.getenv("ETS_WMS13_IUT_PARAM", "capabilities-url"),
        "iut": f"{GS_INTERNAL}/{WORKSPACE}/wms?service=WMS&version=1.3.0&request=GetCapabilities",
        "extra": {},
        "max_failures": int(os.getenv("CITE_MAX_FAILURES_WMS13", "17")),
    },
    "wfs20": {
        "version": os.getenv("ETS_WFS20_VERSION", ""),
        "iut_param": os.getenv("ETS_WFS20_IUT_PARAM", "iut"),
        "iut": f"{GS_INTERNAL}/{WORKSPACE}/wfs?service=WFS&version=2.0.0&request=GetCapabilities",
        "extra": {},
        "max_failures": int(os.getenv("CITE_MAX_FAILURES_WFS20", "102")),
    },
}


def list_suites() -> int:
    url = f"{TEAMENGINE_URL}/rest/suites"
    r = requests.get(url, auth=AUTH, timeout=30)
    print(f"GET {url} -> HTTP {r.status_code}\n")
    print(r.text[:4000])
    return 0 if r.status_code == 200 else 1


def run_suite(name: str, cfg: dict) -> tuple[int, int, int] | None:
    """Run one ETS; return (passed, failed, other), or None if it could not be
    executed/parsed at all. The None case must stay distinct from (0, 0, 0):
    a suite that never ran reports zero failures, which would otherwise sail
    through the baseline check below."""
    seg = f"{cfg['version']}/" if cfg["version"] else ""
    url = f"{TEAMENGINE_URL}/rest/suites/{name}/{seg}run"
    params = {cfg["iut_param"]: cfg["iut"], **cfg["extra"]}
    print(f"▶ {name}: GET {url}")
    print(f"    IUT: {cfg['iut']}")
    try:
        r = requests.get(
            url, params=params, auth=AUTH,
            headers={"Accept": "application/rdf+xml"}, timeout=1800,
        )
    except requests.RequestException as exc:
        # A dead/slow TEAM Engine is an error, not a clean run with 0 failures.
        print(f"    ✗ could not reach TEAM Engine: {exc}")
        return None
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    report = REPORT_DIR / f"earl-{name}.xml"
    report.write_bytes(r.content)
    print(f"    HTTP {r.status_code} · report saved to {report}")
    if r.status_code != 200:
        print(f"    ✗ TEAM Engine returned HTTP {r.status_code}\n{r.text[:500]}")
        return None
    passed, failed, other = parse_earl(r.content)
    if passed == failed == other == 0:
        print("    ✗ EARL report contained no assertions — the suite did not run")
        return None
    return (passed, failed, other)


def parse_earl(content: bytes) -> tuple[int, int, int]:
    """Count EARL outcomes (passed / failed / other) from an RDF/XML report."""
    passed = failed = other = 0
    try:
        root = ET.fromstring(content)
    except ET.ParseError:
        print("    ⚠ could not parse EARL XML (is rdf+xml supported by this ETS?)")
        return (0, 0, 0)
    # earl:outcome carries an rdf:resource like ".../earl#passed|failed|...".
    for el in root.iter():
        if el.tag != f"{EARL}outcome":
            continue
        res = next((v for k, v in el.attrib.items() if k.endswith("resource")), "")
        tail = res.rsplit("#", 1)[-1].lower()
        if tail == "passed":
            passed += 1
        elif tail == "failed":
            failed += 1
        else:  # cantTell / inapplicable / untested
            other += 1
    return (passed, failed, other)


def main() -> int:
    ap = argparse.ArgumentParser(description="Run OGC CITE suites via TEAM Engine.")
    ap.add_argument("--suite", choices=sorted(SUITES), help="run a single suite")
    ap.add_argument("--list", action="store_true", help="list suites TEAM Engine offers")
    ap.add_argument("--soft", action="store_true", help="report but always exit 0")
    ap.add_argument(
        "--strict",
        action="store_true",
        help="require ZERO failures (full certification; needs the OGC reference dataset)",
    )
    args = ap.parse_args()

    if args.list:
        return list_suites()

    targets = {args.suite: SUITES[args.suite]} if args.suite else SUITES
    regressions: list[str] = []
    errors: list[str] = []
    improvements: list[str] = []
    print(f"TEAM Engine: {TEAMENGINE_URL}\n")

    for name, cfg in targets.items():
        result = run_suite(name, cfg)
        if result is None:
            errors.append(name)
            print(f"    = {name}: DID NOT RUN\n")
            continue
        passed, failed, other = result
        budget = 0 if args.strict else cfg["max_failures"]
        print(f"    = {name}: {passed} passed, {failed} failed, {other} other "
              f"(baseline allows {budget})")
        if failed > budget:
            regressions.append(f"{name}: {failed} failed > baseline {budget}")
        elif failed < budget:
            improvements.append(f"{name}: {failed} failed < baseline {budget}")
        print()

    for line in improvements:
        print(f"↓ improved — {line}. Lower CITE_MAX_FAILURES_* to lock this in.")

    if errors:
        print(f"✗ CITE ERROR: suite(s) did not run: {', '.join(errors)}")
    for line in regressions:
        print(f"✗ CITE REGRESSION — {line}")

    if args.soft:
        print("⚠ issues present, but --soft was requested")
        return 0
    if errors or regressions:
        return 1
    print("✓ CITE conformance within baseline")
    return 0


if __name__ == "__main__":
    sys.exit(main())
