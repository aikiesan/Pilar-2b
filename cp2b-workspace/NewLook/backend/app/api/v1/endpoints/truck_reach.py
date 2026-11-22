"""Truck reach: stored truck routes around each biogas and biomethane site in SP.

Built offline by scripts/build_truck_reach.py and loaded into the truck_*
tables (migration 042). A request only reads rows; nothing is routed here.

    GET /truck-reach/sites      the sites, public (they are public points)
    GET /truck-reach/{site_id}  one site's towns, route tree and pipeline route,
                                signed-in only
"""

from __future__ import annotations

import hashlib
import json
import re

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse

from app.core.database import get_db
from app.core.response_cache import cached_json_response
from app.middleware.auth import require_authenticated
from app.models.auth import UserProfile

router = APIRouter()

_SITE_ID_RE = re.compile(r"^[A-Za-z0-9_]{1,40}$")
# A browser may keep a site for an hour; the ETag answers a later visit with 304.
SITE_MAX_AGE = 3600


class _TruckReachUnavailable(Exception):
    pass


def _loaded(cursor) -> bool:
    cursor.execute("SELECT to_regclass('public.truck_build') IS NOT NULL AS ok")
    if not cursor.fetchone()["ok"]:
        return False
    cursor.execute("SELECT EXISTS (SELECT 1 FROM truck_build) AS ok")
    return bool(cursor.fetchone()["ok"])


def _build_sites() -> dict:
    with get_db() as conn:
        cur = conn.cursor()
        try:
            if not _loaded(cur):
                raise _TruckReachUnavailable
            cur.execute("SELECT built_at FROM truck_build")
            built_at = cur.fetchone()["built_at"]
            cur.execute("""
                SELECT site_id, name, tipo, ibge_code, municipio, at_town_centre,
                       ST_X(geom) AS lon, ST_Y(geom) AS lat
                FROM truck_site ORDER BY site_id
                """)
            sites = [
                {
                    "site_id": r["site_id"],
                    "name": r["name"],
                    "tipo": r["tipo"],
                    "ibge_code": r["ibge_code"],
                    "municipio": r["municipio"],
                    "at_town_centre": r["at_town_centre"],
                    "lon": round(float(r["lon"]), 5),
                    "lat": round(float(r["lat"]), 5),
                }
                for r in cur.fetchall()
            ]
        finally:
            cur.close()
    return {"available": True, "built_at": built_at.isoformat(), "sites": sites}


@router.get("/sites")
def get_truck_sites(request: Request):
    """Every site Truck reach has routes for: id, name, type, town, position.

    Public: the same points the infrastructure layers already show. Cached in
    process with an ETag; an empty table answers {"available": false},
    uncached, so loading it shows up on the next request.
    """
    try:
        return cached_json_response(request, "truck-reach:sites", _build_sites, ttl=6 * 3600)
    except _TruckReachUnavailable:
        return JSONResponse({"available": False}, headers={"Cache-Control": "no-store"})


def _read_site(site_id: str) -> dict | None:
    with get_db() as conn:
        cur = conn.cursor()
        try:
            if not _loaded(cur):
                raise _TruckReachUnavailable
            cur.execute(
                """
                SELECT s.site_id, s.name, s.tipo, s.ibge_code, s.municipio, s.snap_m,
                       s.at_town_centre,
                       ST_X(s.geom) AS lon, ST_Y(s.geom) AS lat,
                       r.tree, r.pipeline, r.built_at, r.graph_source
                FROM truck_site s JOIN truck_route r USING (site_id)
                WHERE s.site_id = %s
                """,
                (site_id,),
            )
            row = cur.fetchone()
            if row is None:
                return None
            cur.execute(
                """
                SELECT t.ibge_code, m.municipality_name AS name, t.minutes, t.km
                FROM truck_reach t
                LEFT JOIN municipalities m ON m.ibge_code = t.ibge_code
                WHERE t.site_id = %s
                ORDER BY t.minutes, t.ibge_code
                """,
                (site_id,),
            )
            towns = [
                {
                    "ibge_code": t["ibge_code"],
                    "name": t["name"],
                    "minutes": round(float(t["minutes"]), 1),
                    "km": round(float(t["km"]), 1),
                }
                for t in cur.fetchall()
            ]
            cur.execute("""
                SELECT caps, other_cap, town_limit_min, pipeline_limit_min, grid_m
                FROM truck_build
                """)
            build = cur.fetchone()
        finally:
            cur.close()
    return {
        "site": {
            "site_id": row["site_id"],
            "name": row["name"],
            "tipo": row["tipo"],
            "ibge_code": row["ibge_code"],
            "municipio": row["municipio"],
            "lon": round(float(row["lon"]), 5),
            "lat": round(float(row["lat"]), 5),
            "snap_m": row["snap_m"],
            "at_town_centre": row["at_town_centre"],
        },
        "caps": build["caps"],
        "other_cap": build["other_cap"],
        "town_limit_min": build["town_limit_min"],
        "pipeline_limit_min": build["pipeline_limit_min"],
        "grid_m": build["grid_m"],
        "built_at": row["built_at"].isoformat(),
        "graph_source": row["graph_source"],
        "towns": towns,
        "tree": row["tree"],
        "pipeline": row["pipeline"],
    }


@router.get("/{site_id}")
def get_truck_reach(
    request: Request,
    site_id: str,
    _user: UserProfile = Depends(require_authenticated),
):
    """One site's truck reach: the town centres within 90 minutes (minutes and
    km to the site), the route tree that joins them, and the route to the
    nearest gas pipeline (null if none within 180 minutes).

    tree is flat [lon1, lat1, lon2, lat2, t1, t2, ...]: point 1 is the end
    nearer the site, reached at minute t1, so the map can grow every route from
    the site on one clock.

    Signed-in only. Not kept in the shared in-process cache, which holds only a
    few large payloads: this is one row by primary key. The browser may keep it
    (private) and revalidates with the ETag.
    """
    if not _SITE_ID_RE.match(site_id):
        raise HTTPException(status_code=400, detail="site_id is not a site id")
    try:
        body = _read_site(site_id)
    except _TruckReachUnavailable:
        return JSONResponse({"available": False}, headers={"Cache-Control": "no-store"})
    if body is None:
        raise HTTPException(status_code=404, detail="No truck reach for this site")

    raw = json.dumps(body, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    etag = '"' + hashlib.sha1(raw, usedforsecurity=False).hexdigest()[:20] + '"'
    headers = {"ETag": etag, "Cache-Control": f"private, max-age={SITE_MAX_AGE}"}
    if etag in request.headers.get("if-none-match", ""):
        return Response(status_code=304, headers=headers)
    return Response(content=raw, media_type="application/json", headers=headers)
