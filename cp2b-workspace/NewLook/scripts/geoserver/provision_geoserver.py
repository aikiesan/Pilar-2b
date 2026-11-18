#!/usr/bin/env python3
"""
Provision GeoServer 3.0 against the PILAR-2b PostGIS database — reproducibly.

Creates (idempotently, safe to re-run):
  1. a workspace            (default: cp2b)
  2. a PostGIS datastore    (default: cp2b_postgis) pointed at cp2b_maps
  3. feature-type layers    for the project's spatial tables

Why a script instead of the GeoServer UI: it is repeatable across dev / staging /
production and lives in version control. It talks to GeoServer's REST config API
(/geoserver/rest/**), which is unchanged between 2.x and 3.0.

Usage:
    # 1. bring GeoServer + PostGIS up (see docker-compose.geoserver.yml)
    # 2. load env (copy .env.geoserver.example -> .env.geoserver and edit)
    set -a; source ../../.env.geoserver; set +a
    python provision_geoserver.py
    # add --dry-run to print intended actions without calling GeoServer

Reads configuration from environment variables (see .env.geoserver.example):
    GEOSERVER_REST_URL, GEOSERVER_ADMIN_USER, GEOSERVER_ADMIN_PASSWORD,
    GEOSERVER_WORKSPACE, GEOSERVER_DATASTORE,
    GEOSERVER_DB_HOST/PORT/NAME/SCHEMA/USER/PASSWORD
"""
from __future__ import annotations

import argparse
import os
import sys
from typing import Optional

try:
    import requests
except ImportError:  # pragma: no cover
    sys.exit("This script needs `requests`:  pip install requests")


# --- Layers to publish: (table/native name, EPSG, human title) ----------------
# Every table below has a PostGIS geometry column registered in
# backend/app/migrations/001_initial_schema.sql, all in EPSG:4326.
# NOTE: `municipalities` has TWO geometry columns (polygon `geometry` and point
# `centroid`); GeoServer auto-selects the polygon as the default geometry here.
# To publish the centroid as its own layer, register a SQL view — see
# docs/GEOSERVER_INTEGRATION.md ("Publishing a second geometry / SQL views").
LAYERS = [
    ("municipalities",             "EPSG:4326", "Municipalities — biogas potential (polygons)"),
    ("biogas_plants",              "EPSG:4326", "Biogas plants"),
    ("gas_pipelines",              "EPSG:4326", "Gas pipelines"),
    ("power_transmission_lines",   "EPSG:4326", "Power transmission lines"),
    ("power_substations",          "EPSG:4326", "Power substations"),
    ("wastewater_treatment_plants","EPSG:4326", "Wastewater treatment plants (ETEs)"),
]


def env(name: str, default: Optional[str] = None, required: bool = False) -> str:
    val = os.getenv(name, default)
    if required and not val:
        sys.exit(f"Missing required env var: {name}")
    return val or ""


class GeoServerProvisioner:
    def __init__(self, dry_run: bool = False):
        self.base = env("GEOSERVER_REST_URL", "http://localhost:8080/geoserver").rstrip("/")
        self.rest = f"{self.base}/rest"
        self.auth = (
            env("GEOSERVER_ADMIN_USER", "admin"),
            env("GEOSERVER_ADMIN_PASSWORD", required=True),
        )
        self.workspace = env("GEOSERVER_WORKSPACE", "cp2b")
        self.datastore = env("GEOSERVER_DATASTORE", "cp2b_postgis")
        self.dry_run = dry_run
        self.session = requests.Session()
        self.session.headers.update(
            {"Accept": "application/json", "Content-Type": "application/json"}
        )

    # -- low-level helpers -----------------------------------------------------
    def _get(self, path: str) -> requests.Response:
        return self.session.get(f"{self.rest}{path}", auth=self.auth, timeout=30)

    def _post(self, path: str, json: dict) -> requests.Response:
        if self.dry_run:
            print(f"  [dry-run] POST {path}")
            return _Fake(201)
        return self.session.post(f"{self.rest}{path}", json=json, auth=self.auth, timeout=60)

    def _exists(self, path: str) -> bool:
        if self.dry_run:
            # Offline: assume nothing exists so every create step is printed.
            return False
        return self._get(path).status_code == 200

    # -- steps -----------------------------------------------------------------
    def ensure_workspace(self) -> None:
        if self._exists(f"/workspaces/{self.workspace}"):
            print(f"✓ workspace '{self.workspace}' already exists")
            return
        print(f"+ creating workspace '{self.workspace}'")
        r = self._post("/workspaces", {"workspace": {"name": self.workspace}})
        _check(r, f"create workspace {self.workspace}")

    def ensure_datastore(self) -> None:
        path = f"/workspaces/{self.workspace}/datastores/{self.datastore}"
        if self._exists(path):
            print(f"✓ datastore '{self.datastore}' already exists")
            return
        print(f"+ creating PostGIS datastore '{self.datastore}'")
        body = {
            "dataStore": {
                "name": self.datastore,
                "connectionParameters": {
                    "entry": [
                        {"@key": "dbtype",   "$": "postgis"},
                        {"@key": "host",     "$": env("GEOSERVER_DB_HOST", "db")},
                        {"@key": "port",     "$": env("GEOSERVER_DB_PORT", "5432")},
                        {"@key": "database", "$": env("GEOSERVER_DB_NAME", "cp2b_maps")},
                        {"@key": "schema",   "$": env("GEOSERVER_DB_SCHEMA", "public")},
                        {"@key": "user",     "$": env("GEOSERVER_DB_USER", "postgres")},
                        {"@key": "passwd",   "$": env("GEOSERVER_DB_PASSWORD", required=True)},
                        # Connection-pool / reliability knobs (sane defaults).
                        {"@key": "Loose bbox",            "$": "true"},
                        {"@key": "Estimated extends",     "$": "true"},
                        {"@key": "validate connections",  "$": "true"},
                        {"@key": "Connection timeout",    "$": "20"},
                        {"@key": "max connections",       "$": "10"},
                    ]
                },
            }
        }
        r = self._post(f"/workspaces/{self.workspace}/datastores", body)
        _check(r, f"create datastore {self.datastore}")

    def ensure_layer(self, native: str, srs: str, title: str) -> None:
        ft_path = (
            f"/workspaces/{self.workspace}/datastores/{self.datastore}"
            f"/featuretypes/{native}"
        )
        if self._exists(ft_path):
            print(f"  ✓ layer '{native}' already published")
            return
        print(f"  + publishing layer '{native}'")
        body = {
            "featureType": {
                "name": native,
                "nativeName": native,
                "title": title,
                "srs": srs,
                "enabled": True,
                # Let GeoServer compute the native/lat-lon bounding boxes from
                # the data so WMS/WFS advertise a correct extent.
                "projectionPolicy": "FORCE_DECLARED",
            }
        }
        r = self._post(
            f"/workspaces/{self.workspace}/datastores/{self.datastore}/featuretypes",
            body,
        )
        _check(r, f"publish layer {native}")

    def run(self) -> None:
        print(f"GeoServer REST: {self.rest}")
        print(f"Workspace: {self.workspace}  ·  Datastore: {self.datastore}")
        if self.dry_run:
            print("(dry-run — no changes will be made)\n")
        # Fail fast with a clear message if GeoServer isn't reachable / auth wrong.
        if not self.dry_run:
            probe = self._get("/about/version.json")
            if probe.status_code == 401:
                sys.exit("✗ 401 from GeoServer — check GEOSERVER_ADMIN_USER/PASSWORD")
            if probe.status_code >= 500 or probe.status_code == 0:
                sys.exit(f"✗ GeoServer not reachable at {self.rest} ({probe.status_code})")
        self.ensure_workspace()
        self.ensure_datastore()
        print("Publishing layers:")
        for native, srs, title in LAYERS:
            self.ensure_layer(native, srs, title)
        print("\nDone. Verify capabilities:")
        print(f"  WMS  {self.base}/{self.workspace}/wms?service=WMS&version=1.3.0&request=GetCapabilities")
        print(f"  WFS  {self.base}/{self.workspace}/wfs?service=WFS&version=2.0.0&request=GetCapabilities")


class _Fake:
    """Stand-in response for --dry-run."""
    def __init__(self, status_code: int):
        self.status_code = status_code
        self.text = "(dry-run)"


def _check(resp, action: str) -> None:
    if resp.status_code not in (200, 201):
        sys.exit(f"✗ Failed to {action}: HTTP {resp.status_code}\n{resp.text[:500]}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Provision GeoServer for PILAR-2b.")
    ap.add_argument("--dry-run", action="store_true",
                    help="print intended actions without calling GeoServer")
    args = ap.parse_args()
    GeoServerProvisioner(dry_run=args.dry_run).run()


if __name__ == "__main__":
    main()
