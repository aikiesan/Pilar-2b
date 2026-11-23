#!/usr/bin/env python3
"""
Truck reach, computed once: for every biogas and biomethane site in São Paulo,
the shortest truck routes from each town centre within 90 minutes to the site,
and from the site to the nearest gas pipeline. Writes one gzipped JSON file
that scripts/load_truck_reach.py loads into the truck_* tables (migration 042).
Nothing is routed at request time: the map reads one stored row per site.

Runs on the host, not in the container: the road graph (about 100 MB) is not
mounted there. Needs numpy, scipy, pandas, pyarrow, shapely and pyogrio.

Usage:
    python scripts/build_truck_reach.py \\
        --graph      A:/essencial-geo/dados-brutos/osm/sp \\
        --sites      A:/Data_Biogas/apps/usinas/data/unidades.geojson \\
        --localities <folder>/BR_localidades_2022.gpkg \\
        --pipelines  <folder>/gas_pipeline_transport.geojson \\
                     <folder>/gas_pipeline_distribution.geojson \\
        --positions  A:/Data_Biogas-integra/data/derivados/usinas_coordenadas_proposta.csv \\
                     A:/Data_Biogas-aterros/data/derivados/aterros_coordenadas_proposta.csv \\
        --out        <folder>/truck_reach.json.gz

    --graph       nos.parquet (id, lon, lat) and arestas.parquet
                  (u, v, classe, comp_m, min, mao_unica): the OSM road graph of SP
    --sites       Data_Biogas unidades.geojson; only position, name, type and town
                  are read (no per-site methane, capacity or pipeline distance)
    --localities  IBGE Localidades 2022; the municipal seats of SP are the towns
    --pipelines   the platform's pipeline layers as GeoJSON, from
                  /api/v1/infrastructure/features/<layer>/geojson
    --positions   Data_Biogas proposals of each plant's own position (ANEEL, EPE,
                  OpenStreetMap, documents, hand checks): plant_id, lat_proposta,
                  lon_proposta. Most sources give only the town, so without these a
                  site sits on its town's seat. Every proposed point is used, as
                  Data_Biogas's own build does.
    --only        plant_id[,plant_id...]: build these sites only (a quick check)

Method
------
Truck minutes per edge: the larger of the graph's own minutes and the length
at the class's truck speed cap (TRUCK_CAPS). One-way roads (mao_unica = 1) are
one-way. Where two edges join the same nodes, the faster one counts.

Direction: residues travel to the site, so town routes run on the transposed
graph (town -> site); biomethane travels from the site, so the pipeline route
runs on the forward graph (site -> pipeline).

Snapping: sites, town centres and pipeline samples snap to the nearest node on
a road a truck can enter (SNAP_CLASSES), within the largest strongly connected
part of the graph, so no point lands on a fragment it cannot leave. A site
or town centre more than 2 km from such a road is left out, and listed in
the build's meta (snap_over_2km).

Route tree: the union of the shortest paths, each edge with the minutes at its
end nearer the site and at its far end, so the map can grow every route from
the site on one clock. For the web the tree is rounded to a GRID_M metre grid
and deduplicated; the town minutes and kilometres come from the full graph.
"""

from __future__ import annotations

import argparse
import gzip
import json
import math
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

TRUCK_CAPS = {  # km/h by OSM highway class
    "motorway": 80,
    "motorway_link": 50,
    "trunk": 70,
    "trunk_link": 45,
    "primary": 60,
    "primary_link": 40,
    "secondary": 50,
    "secondary_link": 35,
    "tertiary": 40,
    "tertiary_link": 30,
    "unclassified": 35,
    "road": 30,
    "track": 20,
    "residential": 25,
    "living_street": 15,
}
OTHER_CAP = 30
# A site or town centre joins the network on a road a truck can drive and stop
# on: not a motorway (no frontage), not residential streets or tracks.
SNAP_CLASSES = {
    "trunk",
    "primary",
    "secondary",
    "tertiary",
    "unclassified",
    "primary_link",
    "secondary_link",
    "tertiary_link",
    "trunk_link",
}
TOWN_LIMIT_MIN = 90.0
PIPELINE_LIMIT_MIN = 180.0
PIPELINE_SAMPLE_KM = 1.0
PIPELINE_SNAP_MAX_M = 2000.0  # a sample farther than this from a road is off the graph
SNAP_FLAG_M = 2000.0
# Most sources give no plant position, and those sites sit on their town's
# seat. Within this distance of it, a site is marked at_town_centre: its
# routes start from the town, not from the plant.
TOWN_CENTRE_M = 300.0
GRID_M = 250.0
M_PER_DEG = 111_320.0
CLOSED_LANDFILL = {"encerrado", "encerrado_ou_sem_aterro_em_uso"}
# Data_Biogas names each site's type in Portuguese; the platform's tables and
# API speak English.
KIND_OF_TIPO = {
    "aterro": "landfill",
    "etanol": "ethanol",
    "biometano": "biomethane",
    "biogas": "biogas",
}
GRAPH_SOURCE = (
    "OpenStreetMap contributors, Geofabrik Sudeste extract of 2026-10-21, "
    "road graph of São Paulo (essencial-geo osm/sp)"
)


# ── Graph ────────────────────────────────────────────────────────────────────


def truck_minutes(minutes, length_m, classes):
    """Minutes a truck takes on each edge: never faster than its class cap."""
    caps = np.array([TRUCK_CAPS.get(c, OTHER_CAP) for c in classes], dtype=float)
    return np.maximum(np.asarray(minutes, dtype=float), np.asarray(length_m) / 1000 / caps * 60)


def directed_arcs(u, v, minutes, length_m, one_way):
    """Every arc a truck may drive, the faster of parallel arcs only.

    A two-way edge gives two arcs. scipy's sparse matrices add duplicate
    entries, so two edges joining the same nodes would otherwise count as one
    arc as slow as both together.
    """
    two = ~np.asarray(one_way, dtype=bool)
    a = np.concatenate([u, v[two]])
    b = np.concatenate([v, u[two]])
    t = np.concatenate([minutes, minutes[two]])
    m = np.concatenate([length_m, length_m[two]])
    keep = a != b
    a, b, t, m = a[keep], b[keep], t[keep], m[keep]
    order = np.lexsort((t, b, a))  # by arc, fastest first
    a, b, t, m = a[order], b[order], t[order], m[order]
    first = np.ones(len(a), dtype=bool)
    first[1:] = (a[1:] != a[:-1]) | (b[1:] != b[:-1])
    return a[first], b[first], t[first], m[first]


class Graph:
    def __init__(self, lon, lat, a, b, minutes, length_m, snap_mask):
        from scipy.sparse import csr_matrix
        from scipy.sparse.csgraph import connected_components
        from scipy.spatial import cKDTree

        n = len(lon)
        self.lon, self.lat = np.asarray(lon), np.asarray(lat)
        self.forward = csr_matrix((minutes, (a, b)), shape=(n, n))
        self.backward = self.forward.T.tocsr()
        # Arc lengths, found by key a * n + b (sorted, so searchsorted works).
        self._n = n
        keys = a.astype(np.int64) * n + b
        order = np.argsort(keys)
        self._keys, self._len = keys[order], np.asarray(length_m)[order]

        _, label = connected_components(self.forward, directed=True, connection="strong")
        main = label == np.bincount(label).argmax()
        self.snap_nodes = np.flatnonzero(snap_mask & main)
        self.k = math.cos(math.radians(float(np.median(self.lat))))
        self._tree = cKDTree(np.c_[self.lon[self.snap_nodes] * self.k, self.lat[self.snap_nodes]])

    def snap(self, lon, lat):
        """Nearest snappable node for each point, and the distance in metres."""
        lon, lat = np.atleast_1d(lon), np.atleast_1d(lat)
        dist, i = self._tree.query(np.c_[lon * self.k, lat])
        return self.snap_nodes[i], dist * M_PER_DEG

    def arc_length(self, a, b):
        """Length in metres of the arcs a -> b."""
        keys = np.asarray(a, dtype=np.int64) * self._n + np.asarray(b)
        i = np.searchsorted(self._keys, keys)
        assert np.all(self._keys[i] == keys), "walked an arc that is not in the graph"
        return self._len[i]


def load_graph(folder: Path) -> Graph:
    import pandas as pd
    import pyarrow.parquet as pq

    nodes = pq.read_table(folder / "nos.parquet").to_pandas()
    edges = pq.read_table(folder / "arestas.parquet").to_pandas()
    classes = edges["classe"].astype(str).to_numpy()
    index = pd.Series(np.arange(len(nodes)), index=nodes["id"].to_numpy())
    u = index.reindex(edges["u"].to_numpy()).to_numpy()
    v = index.reindex(edges["v"].to_numpy()).to_numpy()
    ok = ~(np.isnan(u) | np.isnan(v))
    u, v, classes = u[ok].astype(np.int64), v[ok].astype(np.int64), classes[ok]
    edges = edges[ok]
    length = edges["comp_m"].to_numpy(dtype=float)
    minutes = truck_minutes(edges["min"].to_numpy(), length, classes)
    a, b, t, m = directed_arcs(u, v, minutes, length, edges["mao_unica"].to_numpy() == 1)

    snap_mask = np.zeros(len(nodes), dtype=bool)
    on_snap_road = np.isin(classes, list(SNAP_CLASSES))
    snap_mask[u[on_snap_road]] = True
    snap_mask[v[on_snap_road]] = True
    return Graph(nodes["lon"].to_numpy(), nodes["lat"].to_numpy(), a, b, t, m, snap_mask)


# ── Inputs ───────────────────────────────────────────────────────────────────


def read_sites(path: Path, only: set[str] | None = None):
    """Open sites: position, name, type and town. Closed landfills are left out."""
    features = json.loads(path.read_text(encoding="utf-8"))["features"]
    sites, closed = [], []
    for f in features:
        p = f["properties"]
        if only and p["plant_id"] not in only:
            continue
        if (p.get("aterro") or {}).get("situacao") in CLOSED_LANDFILL:
            closed.append(p["plant_id"])
            continue
        lon, lat = f["geometry"]["coordinates"][:2]
        if p["tipo"] not in KIND_OF_TIPO:
            raise SystemExit(f"{p['plant_id']}: unknown tipo {p['tipo']!r}")
        sites.append(
            {
                "site_id": p["plant_id"],
                "name": p["nome_curto"],
                "kind": KIND_OF_TIPO[p["tipo"]],
                "ibge_code": str(p["cod_ibge"]),
                "municipality": p["municipio"],
                "lon": float(lon),
                "lat": float(lat),
            }
        )
    return sites, closed


def read_towns(gpkg: Path):
    """São Paulo's municipal seats: {ibge_code: (name, lon, lat)}."""
    import shapely
    from pyogrio.raw import read as read_raw

    _, _, wkb, fields = read_raw(
        gpkg,
        where="SIGLA_UF = 'SP' AND SCT_LOCALIDADE = 'Sede Municipal'",
        columns=["CD_MUN", "NM_MUN"],
    )
    points = shapely.from_wkb(wkb)
    return {
        str(code): (str(name), float(p.x), float(p.y))
        for code, name, p in zip(fields[0], fields[1], points)
    }


def sample_lines(geometry: dict, step_km: float):
    """Points every step_km along a (Multi)LineString GeoJSON geometry."""
    from shapely.geometry import shape

    g = shape(geometry)
    out = []
    for line in getattr(g, "geoms", [g]):
        coords = np.asarray(line.coords)[:, :2]
        if len(coords) < 2:
            continue
        k = math.cos(math.radians(float(coords[:, 1].mean())))
        seg_km = np.hypot(np.diff(coords[:, 0]) * k, np.diff(coords[:, 1])) * M_PER_DEG / 1000
        total = float(seg_km.sum())
        at = np.linspace(0, total, max(2, int(math.ceil(total / step_km)) + 1))
        cum = np.concatenate([[0], np.cumsum(seg_km)])
        out += list(zip(np.interp(at, cum, coords[:, 0]), np.interp(at, cum, coords[:, 1])))
    return out


def read_pipelines(paths: list[Path]):
    """Pipeline samples every PIPELINE_SAMPLE_KM: [(lon, lat, kind)]."""
    samples = []
    for path in paths:
        kind = "transport" if "transport" in path.name else "distribution"
        for f in json.loads(path.read_text(encoding="utf-8"))["features"]:
            if f.get("geometry"):
                samples += [
                    (x, y, kind) for x, y in sample_lines(f["geometry"], PIPELINE_SAMPLE_KM)
                ]
    return samples


def at_town_centre(site: dict, towns: dict) -> bool:
    """Whether the site sits on its own town's seat (no position of its own)."""
    town = towns.get(site["ibge_code"])
    if town is None:
        return False
    k = math.cos(math.radians(site["lat"]))
    metres = math.hypot((site["lon"] - town[1]) * k, site["lat"] - town[2]) * M_PER_DEG
    return metres <= TOWN_CENTRE_M


def off_network(sites: list[dict], nodes, snap_m):
    """Split sites by their distance to the road network.

    A site farther than SNAP_FLAG_M from a snappable road is not on the
    network (a wrong proposed position, an island): its routes would start
    from an unrelated node, so it is left out, as such town seats are.
    Returns the kept sites with their nodes and distances, and [site_id, m]
    for each site left out.
    """
    keep = np.asarray(snap_m) <= SNAP_FLAG_M
    kept = [s for s, ok in zip(sites, keep) if ok]
    dropped = [[s["site_id"], round(float(m))] for s, m, ok in zip(sites, snap_m, keep) if not ok]
    return kept, np.asarray(nodes)[keep], np.asarray(snap_m)[keep], dropped


def read_positions(paths: list[Path]) -> dict[str, tuple[float, float]]:
    """Proposed plant positions: {plant_id: (lon, lat)}. Only the position is read."""
    import csv

    out: dict[str, tuple[float, float]] = {}
    for path in paths:
        with open(path, encoding="utf-8", newline="") as fh:
            for row in csv.DictReader(fh):
                if row["plant_id"] in out:
                    raise SystemExit(f"{path.name}: {row['plant_id']} has two proposed positions")
                out[row["plant_id"]] = (float(row["lon_proposta"]), float(row["lat_proposta"]))
    return out


def apply_positions(sites: list[dict], positions: dict) -> int:
    """Move sites to their proposed plant position; returns how many moved."""
    moved = 0
    for site in sites:
        if site["site_id"] in positions:
            site["lon"], site["lat"] = positions[site["site_id"]]
            moved += 1
    return moved


# ── Routes ───────────────────────────────────────────────────────────────────


def walk(pred, node: int, src: int):
    """Arcs from node back to src along the predecessor tree: [(nearer, farther)]."""
    arcs = []
    while node != src:
        p = int(pred[node])
        if p < 0:
            raise ValueError(f"node {node} is not on the tree of {src}")
        arcs.append((p, node))
        node = p
    return arcs


def path_km(graph: Graph, arcs, travel_from_far: bool) -> float:
    """Kilometres along arcs given as (nearer the site, farther)."""
    if not arcs:
        return 0.0
    near, far = np.array(arcs).T
    a, b = (far, near) if travel_from_far else (near, far)
    return float(graph.arc_length(a, b).sum()) / 1000


def web_tree(graph: Graph, arcs, dist, grid_m: float = GRID_M):
    """Tree arcs as flat [lon1, lat1, lon2, lat2, t1, t2, ...] for the map.

    Point 1 is the end nearer the site (minute t1), point 2 the far end (t2).
    Ends are rounded to a grid_m grid, so short arcs collapse and the tree
    keeps its shape at a fraction of the size; duplicates keep the earliest.
    """
    if not arcs:
        return []
    near, far = np.array(sorted(set(arcs))).T
    dy = grid_m / M_PER_DEG
    dx = dy / graph.k

    def snap(i, step, values):
        return np.round(values[i] / step) * step

    seg = np.c_[
        snap(near, dx, graph.lon),
        snap(near, dy, graph.lat),
        snap(far, dx, graph.lon),
        snap(far, dy, graph.lat),
        dist[near],
        dist[far],
    ]
    seg = seg[(seg[:, 0] != seg[:, 2]) | (seg[:, 1] != seg[:, 3])]
    seg = seg[np.argsort(seg[:, 4], kind="stable")]
    _, first = np.unique(np.round(seg[:, :4], 6), axis=0, return_index=True)
    seg = seg[np.sort(first)]
    out = []
    for x1, y1, x2, y2, t1, t2 in seg:
        out += [round(x1, 5), round(y1, 5), round(x2, 5), round(y2, 5)]
        out += [round(float(t1), 1), round(float(t2), 1)]
    return out


def build_site(graph: Graph, src: int, town_nodes, pipe_nodes, pipe_info):
    from scipy.sparse.csgraph import dijkstra

    # Town -> site: shortest paths to src on the transposed graph.
    d_in, pred_in = dijkstra(
        graph.backward, directed=True, indices=src, limit=TOWN_LIMIT_MIN, return_predecessors=True
    )
    towns, tree = [], set()
    for code, node in town_nodes.items():
        if d_in[node] <= TOWN_LIMIT_MIN:
            arcs = walk(pred_in, node, src)
            tree.update(arcs)
            towns.append([code, round(float(d_in[node]), 1), round(path_km(graph, arcs, True), 1)])

    # Site -> pipeline: forward graph, the pipeline sample reached first.
    d_out, pred_out = dijkstra(
        graph.forward,
        directed=True,
        indices=src,
        limit=PIPELINE_LIMIT_MIN,
        return_predecessors=True,
    )
    pipeline = None
    reached = pipe_nodes[np.isfinite(d_out[pipe_nodes])]
    if len(reached):
        node = int(reached[np.argmin(d_out[reached])])
        arcs = walk(pred_out, node, src)
        lon, lat, kind = pipe_info[node]
        pipeline = {
            "lon": round(lon, 5),
            "lat": round(lat, 5),
            "kind": kind,
            "minutes": round(float(d_out[node]), 1),
            "km": round(path_km(graph, arcs, False), 1),
            "tree": web_tree(graph, arcs, d_out),
        }
    return sorted(towns, key=lambda t: t[1]), web_tree(graph, tree, d_in), pipeline


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--graph", required=True, type=Path)
    ap.add_argument("--sites", required=True, type=Path)
    ap.add_argument("--localities", required=True, type=Path)
    ap.add_argument("--pipelines", required=True, type=Path, nargs="+")
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--positions", type=Path, nargs="*", default=[])
    ap.add_argument("--only", default="")
    args = ap.parse_args()
    t0 = time.monotonic()

    graph = load_graph(args.graph)
    print(
        f"graph: {len(graph.lon)} nodes, {graph.forward.nnz} arcs, "
        f"{len(graph.snap_nodes)} snappable, {time.monotonic() - t0:.0f} s"
    )

    sites, closed = read_sites(args.sites, set(filter(None, args.only.split(","))) or None)
    moved = apply_positions(sites, read_positions(args.positions))
    print(f"{moved} sites moved to their proposed plant position")
    site_nodes, site_snap = graph.snap([s["lon"] for s in sites], [s["lat"] for s in sites])
    sites, site_nodes, site_snap, off_sites = off_network(sites, site_nodes, site_snap)
    if off_sites:
        print(f"{len(off_sites)} sites left out, over {SNAP_FLAG_M:.0f} m from a road: {off_sites}")
    towns = read_towns(args.localities)
    codes = sorted(towns)
    t_nodes, t_snap = graph.snap([towns[c][1] for c in codes], [towns[c][2] for c in codes])
    # A seat this far from the connected road network is not on it: Ilhabela's
    # is on an island, reached by ferry, and would snap across the water.
    town_nodes = {c: n for c, n, m in zip(codes, t_nodes.tolist(), t_snap) if m <= SNAP_FLAG_M}

    samples = read_pipelines(args.pipelines)
    p_nodes, p_snap = graph.snap([s[0] for s in samples], [s[1] for s in samples])
    near = p_snap <= PIPELINE_SNAP_MAX_M
    pipe_info = {}
    for node, sample in zip(p_nodes[near].tolist(), [s for s, ok in zip(samples, near) if ok]):
        pipe_info.setdefault(node, sample)
    pipe_nodes = np.array(sorted(pipe_info), dtype=np.int64)
    print(
        f"{len(sites)} sites ({len(closed)} closed left out), {len(codes)} town centres, "
        f"{len(pipe_nodes)} pipeline nodes from {int(near.sum())} of {len(samples)} samples"
    )

    flagged = {
        "sites": off_sites,
        "towns": [[c, round(float(m))] for c, m in zip(codes, t_snap) if m > SNAP_FLAG_M],
    }
    reach, routes = [], {}
    t1 = time.monotonic()
    for i, (site, node, snap_m) in enumerate(zip(sites, site_nodes.tolist(), site_snap)):
        site["snap_m"] = round(float(snap_m))
        site["at_town_centre"] = at_town_centre(site, towns)
        site_towns, tree, pipeline = build_site(graph, node, town_nodes, pipe_nodes, pipe_info)
        reach += [[site["site_id"], *t] for t in site_towns]
        routes[site["site_id"]] = {"tree": tree, "pipeline": pipeline}
        if (i + 1) % 25 == 0 or i + 1 == len(sites):
            print(f"  {i + 1}/{len(sites)} sites, {time.monotonic() - t1:.0f} s")

    out = {
        "meta": {
            "built_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "graph_source": GRAPH_SOURCE,
            "caps": TRUCK_CAPS,
            "other_cap": OTHER_CAP,
            "town_limit_min": TOWN_LIMIT_MIN,
            "pipeline_limit_min": PIPELINE_LIMIT_MIN,
            "grid_m": GRID_M,
            "closed_left_out": closed,
            "positions": [p.name for p in args.positions],
            "moved_to_plant_position": moved,
            "snap_over_2km": flagged,
        },
        "sites": sites,
        "towns": {c: towns[c][0] for c in codes},
        "reach": reach,
        "routes": routes,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(args.out, "wt", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
    print(
        f"wrote {args.out} ({args.out.stat().st_size / 1e6:.1f} MB) "
        f"in {time.monotonic() - t0:.0f} s"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
