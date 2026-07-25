"""
PILAR-2b V3 - Shapefile Loader
Load geospatial shapefiles into PostGIS database

This script uses GDAL/OGR to import shapefiles with proper spatial transformations
"""

import subprocess
import sys
from pathlib import Path
from typing import Dict

# Configuration
V2_SHAPEFILE_DIR = Path(__file__).parent.parent.parent.parent.parent / "v2-data" / "data" / "shapefile"

# Shapefile mappings: (source_file, target_table, geometry_type, key_columns)
SHAPEFILE_MAPPINGS = [
    {
        "source": "SP_Municipios_2024.shp",
        "table": "municipalities",
        "description": "645 São Paulo municipalities",
        "mode": "update",  # Update existing records with geometry
        "geometry_column": "geometry",
        "geometry_type": "MultiPolygon",
        "srid": 4326
    },
    {
        "source": "Plantas_Biogas_SP.shp",
        "table": "biogas_plants",
        "description": "Existing biogas plants",
        "mode": "insert",
        "geometry_column": "location",
        "geometry_type": "Point",
        "srid": 4326
    },
    {
        "source": "Gasodutos_Distribuicao_SP.shp",
        "table": "gas_pipelines",
        "description": "Gas distribution pipelines",
        "mode": "insert",
        "geometry_column": "geometry",
        "geometry_type": "MultiLineString",
        "srid": 4326,
        "sql_where": "1=1",  # Filter if needed
        "sql_statement": "SELECT *, 'Distribution' as pipeline_type FROM %s"
    },
    {
        "source": "Gasodutos_Transporte_SP.shp",
        "table": "gas_pipelines",
        "description": "Gas transport pipelines",
        "mode": "append",
        "geometry_column": "geometry",
        "geometry_type": "MultiLineString",
        "srid": 4326,
        "sql_statement": "SELECT *, 'Transport' as pipeline_type FROM %s"
    },
    {
        "source": "Linhas_De_Transmissao_Energia.shp",
        "table": "power_transmission_lines",
        "description": "Power transmission lines",
        "mode": "insert",
        "geometry_column": "geometry",
        "geometry_type": "MultiLineString",
        "srid": 4326
    },
    {
        "source": "Subestacoes_Energia.shp",
        "table": "power_substations",
        "description": "Power substations",
        "mode": "insert",
        "geometry_column": "location",
        "geometry_type": "Point",
        "srid": 4326
    },
    {
        "source": "ETEs_2019_SP.shp",
        "table": "wastewater_treatment_plants",
        "description": "Wastewater treatment plants",
        "mode": "insert",
        "geometry_column": "location",
        "geometry_type": "Point",
        "srid": 4326
    },
    {
        "source": "Limite_SP.shp",
        "table": "sao_paulo_boundary",
        "description": "São Paulo state boundary",
        "mode": "insert",
        "geometry_column": "geometry",
        "geometry_type": "MultiPolygon",
        "srid": 4326,
        "create_table": True  # Create new table
    },
    {
        "source": "Areas_Urbanas_SP.shp",
        "table": "urban_areas",
        "description": "Urban areas",
        "mode": "insert",
        "geometry_column": "geometry",
        "geometry_type": "MultiPolygon",
        "srid": 4326,
        "create_table": True
    },
    {
        "source": "Rodovias_Estaduais_SP.shp",
        "table": "state_highways",
        "description": "State highways",
        "mode": "insert",
        "geometry_column": "geometry",
        "geometry_type": "MultiLineString",
        "srid": 4326,
        "create_table": True
    }
]


class ShapefileLoader:
    """Load shapefiles into PostGIS database using ogr2ogr"""

    def __init__(self, pg_connection_string: str, shapefile_dir: Path = V2_SHAPEFILE_DIR):
        """
        Initialize loader

        Args:
            pg_connection_string: PostgreSQL connection string
            shapefile_dir: Directory containing shapefiles
        """
        self.pg_connection_string = pg_connection_string
        self.shapefile_dir = shapefile_dir

        if not self.shapefile_dir.exists():
            raise FileNotFoundError(f"Shapefile directory not found: {self.shapefile_dir}")

        print(f"✓ Shapefile directory found: {self.shapefile_dir}")

    def check_ogr2ogr(self) -> bool:
        """Check if ogr2ogr is available"""
        try:
            result = subprocess.run(
                ["ogr2ogr", "--version"],
                capture_output=True,
                text=True
            )
            version = result.stdout.strip()
            print(f"✓ ogr2ogr found: {version}")
            return True
        except FileNotFoundError:
            print("✗ ogr2ogr not found. Please install GDAL:")
            print("  Ubuntu/Debian: sudo apt-get install gdal-bin")
            print("  macOS: brew install gdal")
            print("  Windows: https://gdal.org/download.html")
            return False

    def load_shapefile(self, mapping: Dict) -> bool:
        """
        Load single shapefile using ogr2ogr

        Args:
            mapping: Shapefile configuration dictionary

        Returns:
            True if successful, False otherwise
        """
        source_path = self.shapefile_dir / mapping["source"]

        if not source_path.exists():
            print(f"  ⚠ Shapefile not found: {source_path}")
            return False

        print(f"\n  Loading: {mapping['description']}")
        print(f"  Source: {mapping['source']}")
        print(f"  Target: {mapping['table']}")

        # Build ogr2ogr command
        cmd = [
            "ogr2ogr",
            "-f", "PostgreSQL",
            f"PG:{self.pg_connection_string}",
            str(source_path),
            "-nln", mapping["table"],  # New layer name (table name)
            "-lco", f"GEOMETRY_NAME={mapping['geometry_column']}",
            "-lco", "SPATIAL_INDEX=YES",
            "-t_srs", f"EPSG:{mapping['srid']}",  # Target SRS
            "-progress"
        ]

        # Add mode flag
        mode = mapping.get("mode", "insert")
        if mode == "update":
            cmd.append("-update")
            cmd.append("-append")
        elif mode == "append":
            cmd.append("-append")
        elif mode == "insert":
            cmd.append("-overwrite")  # Overwrite if table exists

        # Add SQL statement if specified
        if "sql_statement" in mapping:
            # Use %s as placeholder for the source layer name
            sql = mapping["sql_statement"].replace("%s", mapping["source"].replace(".shp", ""))
            cmd.extend(["-sql", sql])

        # Add SQL WHERE clause if specified
        if "sql_where" in mapping:
            cmd.extend(["-where", mapping["sql_where"]])

        # Add encoding
        cmd.extend(["-lco", "ENCODING=UTF-8"])

        try:
            print(f"  Executing: {' '.join(cmd[:5])}... (truncated)")

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout for large files
            )

            if result.returncode == 0:
                print(f"  ✓ Successfully loaded {mapping['description']}")
                return True
            else:
                print(f"  ✗ Error loading {mapping['description']}")
                print(f"  Error: {result.stderr}")
                return False

        except subprocess.TimeoutExpired:
            print(f"  ✗ Timeout loading {mapping['description']}")
            return False
        except Exception as e:
            print(f"  ✗ Exception: {e}")
            return False

    def update_municipality_geometries(self):
        """
        Update municipality table with geometries from shapefile
        Uses PostGIS to match by municipality name
        """
        print("\n📍 Updating municipality geometries...")

        # This is a special case - we need to match municipalities by name
        # and update the existing records with geometry from the shapefile

        # For now, we'll use a simpler approach and let the user run a manual SQL update
        print("  Note: Municipality geometry update requires manual SQL (see instructions)")
        return True

    def create_spatial_indexes(self):
        """Create additional spatial indexes for performance"""
        print("\n🔍 Creating additional spatial indexes...")

        # These will be created automatically by ogr2ogr with -lco SPATIAL_INDEX=YES
        print("  ✓ Spatial indexes created by ogr2ogr")
        return True

    def verify_loaded_data(self):
        """Verify shapefiles were loaded successfully"""
        print("\n🔍 Verifying loaded data...")

        try:
            import psycopg2

            conn = psycopg2.connect(self.pg_connection_string)
            cursor = conn.cursor()

            # Check each table
            for mapping in SHAPEFILE_MAPPINGS:
                try:
                    cursor.execute(f"""
                        SELECT COUNT(*)
                        FROM {mapping['table']}
                        WHERE {mapping['geometry_column']} IS NOT NULL
                    """)
                    count = cursor.fetchone()[0]
                    print(f"  {mapping['table']}: {count} features")
                except Exception as e:
                    print(f"  {mapping['table']}: Not found or error ({e})")

            cursor.close()
            conn.close()

        except Exception as e:
            print(f"  ⚠ Could not verify: {e}")

    def run_full_load(self):
        """Run complete shapefile loading process"""
        print("=" * 80)
        print("PILAR-2b V3 - Shapefile Loader")
        print("Loading geospatial data into PostGIS")
        print("=" * 80)

        # Check ogr2ogr availability
        if not self.check_ogr2ogr():
            print("\n✗ Cannot proceed without ogr2ogr")
            return False

        # Load each shapefile
        print(f"\n📦 Loading {len(SHAPEFILE_MAPPINGS)} shapefiles...")

        success_count = 0
        failed_count = 0

        for mapping in SHAPEFILE_MAPPINGS:
            if self.load_shapefile(mapping):
                success_count += 1
            else:
                failed_count += 1

        # Verify
        self.verify_loaded_data()

        # Summary
        print("\n" + "=" * 80)
        print(f"✓ Successfully loaded: {success_count}/{len(SHAPEFILE_MAPPINGS)} shapefiles")
        if failed_count > 0:
            print(f"⚠ Failed: {failed_count}/{len(SHAPEFILE_MAPPINGS)} shapefiles")
        print("=" * 80)

        return failed_count == 0


def main():
    """Main loader script"""
    print("\nPILAR-2b V3 - Shapefile Loader")
    print("-" * 80)

    # Get PostgreSQL connection string
    print("\nPlease provide your Supabase/PostgreSQL connection string")
    print("Format: postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres")
    print("\nExample: postgresql://postgres:mypassword@db.xxxxx.supabase.co:5432/postgres\n")

    conn_string = input("Connection string: ").strip()

    if not conn_string:
        print("Error: Connection string cannot be empty")
        sys.exit(1)

    # Confirm load
    print("\n" + "=" * 80)
    print("⚠ WARNING: This will load shapefiles into your PostgreSQL database")
    print("=" * 80)
    print("\nThis will load:")
    for mapping in SHAPEFILE_MAPPINGS:
        print(f"  • {mapping['description']} → {mapping['table']}")
    print("\nMake sure you have:")
    print("  1. Run 001_initial_schema.sql")
    print("  2. Run import_v2_data.py")
    print("  3. Installed GDAL/ogr2ogr")
    print("-" * 80)

    confirm = input("\nContinue with loading? (yes/no): ").strip().lower()

    if confirm != 'yes':
        print("Loading cancelled.")
        sys.exit(0)

    # Run loader
    try:
        loader = ShapefileLoader(conn_string)
        success = loader.run_full_load()

        if not success:
            print("\n⚠ Some shapefiles failed to load. Check errors above.")
            sys.exit(1)

        print("\n✓ All shapefiles loaded successfully!")

    except Exception as e:
        print(f"\nFatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
