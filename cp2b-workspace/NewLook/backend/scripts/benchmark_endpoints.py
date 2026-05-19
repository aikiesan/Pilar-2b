#!/usr/bin/env python3
"""
PILAR-2b V3 — Performance Benchmark Script
===========================================
Measures real-world latency for the API endpoints referenced in Section 3.1
and Table 5 of the manuscript. Replaces hardcoded estimates (0.8s / 0.6s / 1.4s)
with verified measurements.

Usage
-----
    # Against local dev server (default):
    python scripts/benchmark_endpoints.py

    # Against production Render deployment:
    BASE_URL=https://cp2b-maps-backend.onrender.com python scripts/benchmark_endpoints.py

    # Custom number of requests:
    N_REQUESTS=200 python scripts/benchmark_endpoints.py

    # Skip cold-cache tests (faster):
    SKIP_COLD_CACHE=1 python scripts/benchmark_endpoints.py

Output
------
Results are printed as a structured table and also saved to
  scripts/benchmark_results_<timestamp>.json
so they can be pasted directly into the manuscript.

Endpoints benchmarked (Table 5 equivalents)
-------------------------------------------
  1. GET  /api/v1/geospatial/municipalities      → "GET /municipalities"
  2. POST /api/v1/proximity/analyze              → "POST /geospatial/proximity"
  3. GET  /api/v1/analysis/statistics/by-region → "GET /analysis/regional"
  4. GET  /api/v1/statistics/summary             → aggregate validation endpoint
  5. GET  /api/v1/municipalities/                → Supabase-backed list

Note: The endpoint "POST /simulation/economic" was removed during the PILAR-2b
rebrand (see CRITICAL_FIXES_CHANGELOG.md). Its closest equivalent,
POST /proximity/analyze, is tested instead.
"""

import os
import sys
import json
import time
import statistics
import threading
import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any, Optional, Tuple

try:
    import requests
except ImportError:
    print("ERROR: 'requests' not installed. Run: pip install requests")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8000").rstrip("/")
N_REQUESTS = int(os.environ.get("N_REQUESTS", "100"))
CONCURRENCY = int(os.environ.get("CONCURRENCY", "5"))   # parallel workers
TIMEOUT = float(os.environ.get("TIMEOUT", "30"))        # seconds per request
SKIP_COLD_CACHE = bool(os.environ.get("SKIP_COLD_CACHE", ""))

# ---------------------------------------------------------------------------
# Endpoint definitions
# ---------------------------------------------------------------------------

ENDPOINTS: List[Dict[str, Any]] = [
    {
        "label": "GET /municipalities",
        "method": "GET",
        "path": "/api/v1/geospatial/municipalities",
        "params": {"limit": 100, "sort_by": "biogas", "order": "desc"},
        "body": None,
        "manuscript_estimate_s": 0.8,
    },
    {
        "label": "POST /geospatial/proximity",
        "method": "POST",
        "path": "/api/v1/proximity/analyze",
        "params": {},
        "body": {
            "latitude": -22.5,
            "longitude": -47.3,
            "radius_km": 20,
            "options": {
                "include_mapbiomas": True,
                "include_biogas_potential": True,
                "include_infrastructure": True,
            },
        },
        "manuscript_estimate_s": 1.4,
    },
    {
        "label": "GET /analysis/regional",
        "method": "GET",
        "path": "/api/v1/analysis/statistics/by-region",
        "params": {},
        "body": None,
        "manuscript_estimate_s": None,   # not explicitly stated
    },
    {
        "label": "GET /statistics/summary",
        "method": "GET",
        "path": "/api/v1/statistics/summary",
        "params": {},
        "body": None,
        "manuscript_estimate_s": None,
    },
    {
        "label": "GET /municipalities (Supabase)",
        "method": "GET",
        "path": "/api/v1/municipalities/",
        "params": {"limit": 100},
        "body": None,
        "manuscript_estimate_s": None,
    },
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _percentile(data: List[float], p: float) -> float:
    """Compute p-th percentile (0-100) via linear interpolation."""
    if not data:
        return float("nan")
    sorted_data = sorted(data)
    n = len(sorted_data)
    if n == 1:
        return sorted_data[0]
    index = (p / 100) * (n - 1)
    lower = int(index)
    upper = lower + 1
    if upper >= n:
        return sorted_data[-1]
    frac = index - lower
    return sorted_data[lower] + frac * (sorted_data[upper] - sorted_data[lower])


def _make_request(session: requests.Session, ep: Dict[str, Any]) -> Tuple[float, int, str]:
    """
    Fire a single request and return (elapsed_seconds, status_code, error_msg).
    elapsed_seconds is -1 on connection/timeout errors.
    """
    url = BASE_URL + ep["path"]
    method = ep["method"].upper()
    params = ep.get("params") or {}
    body = ep.get("body")

    t0 = time.perf_counter()
    try:
        if method == "GET":
            resp = session.get(url, params=params, timeout=TIMEOUT)
        elif method == "POST":
            resp = session.post(url, json=body, params=params, timeout=TIMEOUT)
        else:
            return -1.0, 0, f"Unsupported method: {method}"

        elapsed = time.perf_counter() - t0
        return elapsed, resp.status_code, ""

    except requests.exceptions.ConnectionError as exc:
        return -1.0, 0, f"ConnectionError: {exc}"
    except requests.exceptions.Timeout:
        return -1.0, 0, f"Timeout (>{TIMEOUT}s)"
    except Exception as exc:  # noqa: BLE001
        return -1.0, 0, f"{type(exc).__name__}: {exc}"


def _run_batch(
    ep: Dict[str, Any],
    n: int,
    concurrency: int,
    label_suffix: str = "",
) -> Dict[str, Any]:
    """
    Run n requests against ep, using a thread pool of size concurrency.
    Returns a dict with latency stats.
    """
    latencies: List[float] = []
    errors: List[str] = []
    status_counts: Dict[int, int] = {}

    # Shared session (connection pooling)
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})

    with ThreadPoolExecutor(max_workers=concurrency) as pool:
        futures = [pool.submit(_make_request, session, ep) for _ in range(n)]
        for fut in as_completed(futures):
            elapsed, status, err = fut.result()
            if elapsed < 0:
                errors.append(err)
            else:
                latencies.append(elapsed)
                status_counts[status] = status_counts.get(status, 0) + 1

    session.close()

    if not latencies:
        return {
            "label": ep["label"] + label_suffix,
            "n_requests": n,
            "n_success": 0,
            "n_errors": len(errors),
            "error_sample": errors[:3],
            "mean_s": None,
            "median_s": None,
            "p95_s": None,
            "p99_s": None,
            "min_s": None,
            "max_s": None,
            "stddev_s": None,
            "status_counts": status_counts,
        }

    return {
        "label": ep["label"] + label_suffix,
        "n_requests": n,
        "n_success": len(latencies),
        "n_errors": len(errors),
        "error_sample": errors[:3],
        "mean_s": round(statistics.mean(latencies), 4),
        "median_s": round(statistics.median(latencies), 4),
        "p95_s": round(_percentile(latencies, 95), 4),
        "p99_s": round(_percentile(latencies, 99), 4),
        "min_s": round(min(latencies), 4),
        "max_s": round(max(latencies), 4),
        "stddev_s": round(statistics.stdev(latencies) if len(latencies) > 1 else 0, 4),
        "status_counts": status_counts,
        "raw_latencies_s": [round(x, 4) for x in latencies],
    }


# ---------------------------------------------------------------------------
# Cold-cache test: clear server cache then measure first-hit latency
# ---------------------------------------------------------------------------

def _cold_cache_probe(ep: Dict[str, Any], session: requests.Session) -> Optional[float]:
    """
    Attempt to hit the cache-clear endpoint (if available), then time the
    first request to ep. Returns elapsed_s or None on error.

    The server exposes GET /api/v1/cache/clear only in dev mode.
    If absent, we simply probe once without a prior warm-up.
    """
    # Try clearing the cache
    clear_url = BASE_URL + "/api/v1/cache/clear"
    try:
        r = session.get(clear_url, timeout=5)
        if r.status_code == 200:
            pass  # cache cleared
    except Exception:  # noqa: BLE001
        pass  # endpoint may not exist; proceed anyway

    elapsed, status, err = _make_request(session, ep)
    return elapsed if elapsed >= 0 else None


# ---------------------------------------------------------------------------
# Main benchmark runner
# ---------------------------------------------------------------------------

def run_benchmarks() -> Dict[str, Any]:
    results = []
    timestamp = datetime.datetime.utcnow().isoformat() + "Z"

    print(f"\n{'='*70}")
    print(f"  PILAR-2b V3 — Endpoint Latency Benchmark")
    print(f"  Base URL    : {BASE_URL}")
    print(f"  N requests  : {N_REQUESTS} per endpoint")
    print(f"  Concurrency : {CONCURRENCY} workers")
    print(f"  Timestamp   : {timestamp}")
    print(f"{'='*70}\n")

    # -----------------------------------------------------------------------
    # 1. Warm-cache benchmarks (most relevant for the manuscript)
    # -----------------------------------------------------------------------
    print("Phase 1 — Warm-cache benchmarks (n={})".format(N_REQUESTS))
    print("-" * 70)

    for ep in ENDPOINTS:
        # Prime the cache with 3 throwaway requests
        warmup_session = requests.Session()
        warmup_session.headers.update({"Content-Type": "application/json"})
        for _ in range(3):
            _make_request(warmup_session, ep)
        warmup_session.close()

        print(f"  Benchmarking: {ep['label']} ...", flush=True)
        stat = _run_batch(ep, N_REQUESTS, CONCURRENCY, label_suffix=" [warm]")
        results.append(stat)

        _print_stat_row(stat, ep.get("manuscript_estimate_s"))

    # -----------------------------------------------------------------------
    # 2. Cold-cache probes (first-hit latency per endpoint)
    # -----------------------------------------------------------------------
    cold_results = []
    if not SKIP_COLD_CACHE:
        print(f"\nPhase 2 — Cold-cache probes (single first-hit per endpoint)")
        print("-" * 70)

        cold_session = requests.Session()
        cold_session.headers.update({"Content-Type": "application/json"})

        for ep in ENDPOINTS:
            elapsed = _cold_cache_probe(ep, cold_session)
            label = ep["label"] + " [cold]"
            if elapsed is not None:
                cold_results.append({"label": label, "cold_hit_s": round(elapsed, 4)})
                print(f"  {label:<50} {elapsed*1000:>8.1f} ms")
            else:
                cold_results.append({"label": label, "cold_hit_s": None, "error": "request failed"})
                print(f"  {label:<50} {'ERROR':>8}")

        cold_session.close()

    # -----------------------------------------------------------------------
    # 3. Cache overhead analysis
    # -----------------------------------------------------------------------
    overhead = []
    for warm in results:
        ep_base_label = warm["label"].replace(" [warm]", "")
        cold = next(
            (c for c in cold_results if c["label"] == ep_base_label + " [cold]"),
            None,
        )
        if cold and cold.get("cold_hit_s") and warm.get("mean_s"):
            overhead.append({
                "endpoint": ep_base_label,
                "cold_hit_s": cold["cold_hit_s"],
                "warm_mean_s": warm["mean_s"],
                "speedup_factor": round(cold["cold_hit_s"] / warm["mean_s"], 2),
            })

    # -----------------------------------------------------------------------
    # Summary table
    # -----------------------------------------------------------------------
    print(f"\n{'='*70}")
    print("  SUMMARY TABLE  (for manuscript Table 5 / Section 3.1)")
    print(f"{'='*70}")
    print(f"  {'Endpoint':<45} {'Mean':>7} {'p50':>7} {'p95':>7} {'p99':>7} {'N_ok':>5}")
    print(f"  {'-'*45} {'-'*7} {'-'*7} {'-'*7} {'-'*7} {'-'*5}")

    for stat in results:
        label = stat["label"].replace(" [warm]", "")
        if stat.get("mean_s") is not None:
            print(
                f"  {label:<45} "
                f"{stat['mean_s']*1000:>6.0f}ms "
                f"{stat['median_s']*1000:>6.0f}ms "
                f"{stat['p95_s']*1000:>6.0f}ms "
                f"{stat['p99_s']*1000:>6.0f}ms "
                f"{stat['n_success']:>5}"
            )
        else:
            print(f"  {label:<45} {'N/A':>7} {'N/A':>7} {'N/A':>7} {'N/A':>7} {'0':>5}")

    if overhead:
        print(f"\n  Cache speedup analysis:")
        for o in overhead:
            print(
                f"  {o['endpoint']:<45} "
                f"cold={o['cold_hit_s']*1000:.0f}ms  "
                f"warm={o['warm_mean_s']*1000:.0f}ms  "
                f"speedup={o['speedup_factor']}×"
            )

    print(f"{'='*70}\n")

    # -----------------------------------------------------------------------
    # Persist results to JSON
    # -----------------------------------------------------------------------
    out = {
        "timestamp": timestamp,
        "configuration": {
            "base_url": BASE_URL,
            "n_requests": N_REQUESTS,
            "concurrency": CONCURRENCY,
            "timeout_s": TIMEOUT,
        },
        "warm_cache_results": results,
        "cold_cache_probes": cold_results,
        "cache_overhead": overhead,
        "manuscript_note": (
            "Values in 'warm_cache_results' replace the hardcoded estimates in "
            "Section 3.1 / Table 5. Use 'p95_s' as the 95th-percentile latency. "
            "The 'cold_hit_s' values reflect first-request (uncached) behaviour."
        ),
    }

    # Strip raw latencies from JSON to keep it concise (keep if needed)
    if not os.environ.get("KEEP_RAW"):
        for r in out["warm_cache_results"]:
            r.pop("raw_latencies_s", None)

    fname = (
        "scripts/benchmark_results_"
        + datetime.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        + ".json"
    )
    try:
        os.makedirs(os.path.dirname(fname), exist_ok=True)
        with open(fname, "w", encoding="utf-8") as fh:
            json.dump(out, fh, indent=2, ensure_ascii=False)
        print(f"Results saved → {fname}\n")
    except OSError as exc:
        print(f"Warning: could not save JSON results: {exc}\n")

    return out


def _print_stat_row(stat: Dict[str, Any], manuscript_estimate: Optional[float]) -> None:
    label = stat["label"]
    if stat.get("mean_s") is not None:
        line = (
            f"    mean={stat['mean_s']*1000:.0f}ms  "
            f"p50={stat['median_s']*1000:.0f}ms  "
            f"p95={stat['p95_s']*1000:.0f}ms  "
            f"p99={stat['p99_s']*1000:.0f}ms  "
            f"ok={stat['n_success']}/{stat['n_requests']}"
        )
        if manuscript_estimate is not None:
            diff = stat["mean_s"] - manuscript_estimate
            sign = "+" if diff >= 0 else ""
            line += f"  [estimate was {manuscript_estimate*1000:.0f}ms, Δ={sign}{diff*1000:.0f}ms]"
        print(line)
    else:
        print(f"    ERROR — {stat['error_sample']}")
    print()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # Quick connectivity check
    health_url = BASE_URL + "/"
    print(f"Checking connectivity to {health_url} ...")
    try:
        r = requests.get(health_url, timeout=10)
        print(f"  OK — {r.status_code} ({r.elapsed.total_seconds()*1000:.0f}ms)\n")
    except Exception as exc:  # noqa: BLE001
        print(f"  WARNING: Could not reach {health_url}: {exc}")
        print("  Proceeding anyway — individual endpoint errors will be reported.\n")

    run_benchmarks()
