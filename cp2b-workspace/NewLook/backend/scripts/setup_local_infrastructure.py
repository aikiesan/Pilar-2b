"""Bootstrap every locally supported infrastructure layer for Docker Desktop.

The large source vectors stay outside Git.  The companion Compose profile mounts
the original MapBiomas ZIP drop at ``/mnt/mapbiomas_archives``; this script also
restores the two small legacy São Paulo shapefile bundles from their documented,
pinned source when they are not already present under ``backend/data/shapefiles``.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

PROJECT_MAP_REF = os.environ.get("PROJECT_MAP_REF", "36c9c7cea4606858a6c0fab1343decd71730b9f9")
PROJECT_MAP_RAW = f"https://raw.githubusercontent.com/aikiesan/project_map/{PROJECT_MAP_REF}"
LEGACY_BUNDLES = ("ETEs_2019_SP", "Rodovias_Estaduais_SP")
LEGACY_EXTENSIONS = (".cpg", ".prj", ".dbf", ".sbn", ".shx", ".shp", ".sbx", ".shp.xml")


def download(url: str, destination: Path) -> None:
    """Download one pinned source file atomically."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    partial = destination.with_name(f"{destination.name}.part")
    request = urllib.request.Request(url, headers={"User-Agent": "PILAR-2b-local-setup"})
    try:
        with urllib.request.urlopen(request, timeout=90) as response, partial.open("wb") as output:
            shutil.copyfileobj(response, output)
        partial.replace(destination)
    finally:
        partial.unlink(missing_ok=True)


def ensure_legacy_sp(target: Path) -> int:
    """Ensure both legacy SP bundles exist and return the downloaded file count."""
    downloaded = 0
    for basename in LEGACY_BUNDLES:
        for extension in LEGACY_EXTENSIONS:
            destination = target / f"{basename}{extension}"
            if destination.is_file():
                continue
            url = f"{PROJECT_MAP_RAW}/data/shapefile/{destination.name}"
            print(f"legacy: downloading {destination.name}")
            download(url, destination)
            downloaded += 1
    return downloaded


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--archive-dir",
        type=Path,
        default=Path("/mnt/mapbiomas_archives"),
        help="directory containing original MapBiomas ZIP files",
    )
    parser.add_argument(
        "--legacy-dir",
        type=Path,
        default=Path("/app/data/shapefiles"),
        help="persistent target for the legacy SP shapefile bundles",
    )
    parser.add_argument("--skip-legacy", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not args.archive_dir.is_dir():
        parser.error(f"MapBiomas archive directory not found: {args.archive_dir}")

    if not args.skip_legacy and not args.dry_run:
        count = ensure_legacy_sp(args.legacy_dir)
        print(f"legacy: ready ({count} downloaded, source ref {PROJECT_MAP_REF})")

    loader = Path(__file__).with_name("load_infrastructure_layers.py")
    command = [sys.executable, str(loader), "--archive-dir", str(args.archive_dir)]
    if args.dry_run:
        command.append("--dry-run")
    return subprocess.run(command, check=False).returncode


if __name__ == "__main__":
    sys.exit(main())
