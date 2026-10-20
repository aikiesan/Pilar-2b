"""
Fill municipalities.co2_reduction_tons_year from the GHG module.

The column used to be energy x 0.4 tCO2/MWh (sync_db_canonical.py), a factor
with no baseline, no project emissions and no leakage. It now holds the same
net reduction as the municipality page's Climate card: CP2b N4 methane,
reference scenario, each substrate with its default baseline from ghg.yaml,
route `biometano_veicular` (the /ghg/municipalities defaults). A potential
reduction, not a credit.

Runs after load_cp2b_potential. Without municipality_cp2b_potential it
declines and the column keeps what it held.

    python -m scripts.sync_co2_from_ghg
"""

from __future__ import annotations

import os
import sys
from collections import defaultdict
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.services.canonical_loader import load_ghg_params  # noqa: E402
from app.services.ghg_service import GhgInput, estimate_substrates  # noqa: E402

LEVEL = "n4"
SCENARIO = "med"

_SQL = f"""
    SELECT ibge_code, substrate, {LEVEL}_ch4_nm3_year
    FROM municipality_cp2b_potential
    WHERE scenario = %s
"""


def net_reduction_by_municipality(params: dict, rows: list[tuple]) -> dict[str, float]:
    """(ibge_code, substrate, CH4 Nm³/yr) rows → net reduction in tCO2e/yr per 7-digit code."""
    by_muni: dict[str, dict[str, float]] = defaultdict(dict)
    for ibge, substrate, ch4 in rows:
        by_muni[str(ibge)][substrate] = float(ch4 or 0)
    template = GhgInput(0.0)
    return {
        ibge: sum(r.er_net_t for r in estimate_substrates(params, ch4, template).values())
        for ibge, ch4 in by_muni.items()
    }


def main() -> int:
    import psycopg2
    from psycopg2.extras import execute_values

    dsn = os.environ.get("DATABASE_URL", "postgresql://postgres:password@localhost:5432/cp2b_maps")
    conn = psycopg2.connect(dsn)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT to_regclass('municipality_cp2b_potential') IS NOT NULL")
            if not cur.fetchone()[0]:
                raise SystemExit(
                    "municipality_cp2b_potential missing (run load_cp2b_potential); "
                    "co2_reduction_tons_year left as it was"
                )
            cur.execute(_SQL, (SCENARIO,))
            rows = cur.fetchall()
            if not rows:
                raise SystemExit("municipality_cp2b_potential is empty; co2 column left as it was")
            net = net_reduction_by_municipality(load_ghg_params(), rows)
            execute_values(
                cur,
                """
                UPDATE municipalities AS m SET co2_reduction_tons_year = v.co2, updated_at = NOW()
                FROM (VALUES %s) AS v (ibge_code, co2)
                WHERE m.ibge_code = v.ibge_code
                """,
                [(ibge, round(t, 2)) for ibge, t in net.items()],
                page_size=len(net),  # one statement, so rowcount covers every row
            )
            updated = cur.rowcount
        conn.commit()
    finally:
        conn.close()
    print(
        f"co2_reduction_tons_year from the GHG module ({LEVEL.upper()} {SCENARIO}): "
        f"{updated} municipalities, {sum(net.values()) / 1e6:.2f} Mt CO2e/yr in total"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
