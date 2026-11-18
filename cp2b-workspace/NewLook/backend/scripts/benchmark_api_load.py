#!/usr/bin/env python3
"""Quanta gente a VM aguenta — medido, não estimado.

Roda na própria VM contra 127.0.0.1, então mede o backend e o frontend sem o
ruído da rede da Unicamp. Para cada rota que uma sessão real dispara, mede
latência sob concorrência crescente e o tamanho da resposta, e ao final traduz
isso em "sessões por hora" com uma hipótese de comportamento declarada.

    python scripts/benchmark_api_load.py
    python scripts/benchmark_api_load.py --base http://127.0.0.1:8001 --users 1,5,10,25
    python scripts/benchmark_api_load.py --duration 15 --json bench.json

NÃO é um teste de estresse até quebrar: o alvo é a carga que a caixa serve com
folga, num host que também roda cp2b-backend, abiove e postgrest. Por isso a
concorrência default para em 25 e cada nível dura poucos segundos.
"""

from __future__ import annotations

import argparse
import json
import sys
import threading
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field

# As rotas que uma sessão real dispara, com o peso relativo observado no uso:
# abrir o mapa custa o GeoJSON inteiro uma vez; o resto é navegação.
ROUTES: list[tuple[str, str, float]] = [
    # (rótulo, caminho, chamadas por sessão)
    ("geojson_map", "/api/v1/municipalities/geojson?fields=map", 1.0),
    ("statistics", "/api/v1/geospatial/statistics/summary", 1.0),
    ("residuos", "/api/v1/residuos/?limit=50", 0.4),
    ("metrics", "/api/v1/municipalities/3550308/metrics", 2.0),
    (
        "layer_gas_delivery",
        "/api/v1/infrastructure/features/gas_delivery_point/geojson?uf=SP",
        0.2,
    ),
    (
        "layer_highway_state",
        "/api/v1/infrastructure/features/highway_state/geojson" "?bbox=-53.2,-25.4,-44.1,-19.7",
        0.1,
    ),
]


@dataclass
class Result:
    latencies: list[float] = field(default_factory=list)
    throttled: int = 0  # HTTP 429 — o limitador fazendo o trabalho dele
    errors: int = 0  # 5xx, timeout, conexão recusada: falha de verdade
    bytes_first: int = 0


def hit(base: str, path: str, timeout: float) -> tuple[float, int, str]:
    """Retorna (latência, bytes, desfecho) com 'ok' | 'throttled' | 'error'.

    A distinção não é cosmética. O backend limita 300 req/min por cliente
    (app/middleware/rate_limiter.py), e um benchmark vem todo de um IP só — sem
    separar o 429, um teste bem-sucedido se parece com um servidor em colapso.
    Foi o que aconteceu na primeira execução: 2.500 "erros" que eram a defesa
    funcionando.
    """
    t0 = time.perf_counter()
    try:
        req = urllib.request.Request(base + path, headers={"Accept-Encoding": "gzip"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read()
        return time.perf_counter() - t0, len(body), "ok"
    except urllib.error.HTTPError as e:
        return time.perf_counter() - t0, 0, "throttled" if e.code == 429 else "error"
    except (urllib.error.URLError, TimeoutError, OSError):
        return time.perf_counter() - t0, 0, "error"


def run_level(base: str, path: str, users: int, duration: float, timeout: float) -> Result:
    res = Result()
    lock = threading.Lock()
    stop_at = time.perf_counter() + duration

    def worker():
        while time.perf_counter() < stop_at:
            dt, size, outcome = hit(base, path, timeout)
            with lock:
                if outcome == "ok":
                    res.latencies.append(dt)
                    if not res.bytes_first:
                        res.bytes_first = size
                elif outcome == "throttled":
                    res.throttled += 1
                else:
                    res.errors += 1

    threads = [threading.Thread(target=worker, daemon=True) for _ in range(users)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=duration + timeout + 5)
    return res


def pct(values: list[float], p: float) -> float:
    if not values:
        return float("nan")
    s = sorted(values)
    i = min(int(len(s) * p), len(s) - 1)
    return s[i]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://127.0.0.1:8001")
    ap.add_argument("--users", default="1,5,10,25", help="níveis de concorrência")
    ap.add_argument("--duration", type=float, default=8.0, help="segundos por nível")
    ap.add_argument("--timeout", type=float, default=60.0)
    ap.add_argument("--json", help="grava o resultado bruto neste arquivo")
    args = ap.parse_args()

    levels = [int(u) for u in args.users.split(",") if u.strip()]
    out: dict = {"base": args.base, "levels": levels, "routes": {}}

    print(f"alvo: {args.base}   níveis: {levels}   {args.duration:.0f}s por nível\n")
    print(
        f"{'rota':<22} {'users':>6} {'req/s':>8} {'p50':>8} {'p95':>8} "
        f"{'max':>8} {'429':>6} {'erros':>6} {'KB':>7}"
    )
    print("-" * 90)

    for label, path, _weight in ROUTES:
        out["routes"][label] = {"path": path, "levels": {}}
        for users in levels:
            r = run_level(args.base, path, users, args.duration, args.timeout)
            n = len(r.latencies)
            rps = n / args.duration if n else 0.0
            out["routes"][label]["levels"][users] = {
                "requests": n,
                "rps": round(rps, 2),
                "p50_ms": round(pct(r.latencies, 0.50) * 1000, 1) if n else None,
                "p95_ms": round(pct(r.latencies, 0.95) * 1000, 1) if n else None,
                "max_ms": round(max(r.latencies) * 1000, 1) if n else None,
                "throttled_429": r.throttled,
                "errors": r.errors,
                "bytes": r.bytes_first,
            }
            print(
                f"{label:<22} {users:>6} {rps:>8.1f} "
                f"{pct(r.latencies, 0.50)*1000 if n else 0:>7.0f}m "
                f"{pct(r.latencies, 0.95)*1000 if n else 0:>7.0f}m "
                f"{(max(r.latencies)*1000 if n else 0):>7.0f}m "
                f"{r.throttled:>6} {r.errors:>6} {r.bytes_first/1024:>7.0f}"
            )
        print()

    # ── Tradução para usuários ────────────────────────────────────────────────
    # Hipótese DECLARADA, não medida: uma sessão típica dispara as rotas acima
    # com os pesos de ROUTES e dura ~3 min, das quais o servidor trabalha só
    # durante as requisições. O número resultante é "sessões simultâneas que a
    # caixa serve mantendo p95 sob o limite", que é o que interessa para
    # publicar o site, e não o pico absoluto até quebrar.
    print("=" * 82)
    top = max(levels)
    custo_s = 0.0
    for label, _path, weight in ROUTES:
        lv = out["routes"][label]["levels"].get(top) or {}
        p50 = lv.get("p50_ms")
        if p50:
            custo_s += (p50 / 1000.0) * weight
    out["sessao_cpu_s"] = round(custo_s, 3)
    print(f"custo de servidor por sessão (soma p50 x peso, a {top} usuários): {custo_s:.2f} s")
    if custo_s > 0:
        print(f"  ~{top / custo_s * 60:,.0f} sessões/min sustentadas nesse nível de concorrência")
        print(f"  ~{top / custo_s * 3600:,.0f} sessões/hora")
    print("\nRessalvas:")
    print("  * p95 sob concorrência é o número que decide, não a média. Se p95 crescer")
    print("    mais que linearmente entre dois níveis, o gargalo já apareceu.")
    print("  * A coluna 429 é o limitador de 300 req/min por IP, NÃO falha do servidor.")
    print("    Um benchmark vem de um IP só, então ele satura antes da máquina.")
    print("  * Usuários reais não repetem a mesma rota em loop: o número de sessões")
    print("    supõe os pesos declarados em ROUTES, no topo do arquivo.")

    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
        print(f"\nbruto gravado em {args.json}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
