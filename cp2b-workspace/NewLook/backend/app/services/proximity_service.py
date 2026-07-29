"""
PILAR-2b V3 - Proximity Analysis Service
PostGIS-based spatial analysis for biogas potential assessment
"""

import json
import logging
import re
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Tuple

import geopandas as gpd
import pyproj
from shapely.geometry import Point
from shapely.ops import transform

from app.services.map_metrics import (
    compute_published_municipality_metrics,
    load_activity_counts,
)

logger = logging.getLogger(__name__)


def normalize_municipality_name(name: str) -> str:
    """
    Normalize municipality name for matching.

    Removes accents, converts to lowercase, removes extra spaces.
    Example: "São José dos Campos" -> "sao jose dos campos"

    Args:
        name: Original municipality name

    Returns:
        Normalized name for matching
    """
    if not name:
        return ""

    # Convert to string if not already
    name = str(name)

    # Normalize unicode characters (NFD = decompose accents)
    name = unicodedata.normalize("NFD", name)

    # Remove accent marks
    name = "".join(char for char in name if unicodedata.category(char) != "Mn")

    # Convert to lowercase
    name = name.lower()

    # Remove extra spaces and trim
    name = re.sub(r"\s+", " ", name).strip()

    return name


# MapBiomas Class to Residuos Mapping
# Maps MapBiomas land use classes to corresponding residue types in the database
MAPBIOMAS_RESIDUOS_MAPPING = {
    # Agricultural Classes
    20: {  # Cana-de-açúcar (Sugarcane)
        "residuos": ["Bagaço de cana", "Palha de cana", "Vinhaça"],
        "subsector_codigo": "AG_CANA",
        "production_factor": 0.14,  # tons residue per hectare
        "description": "Resíduos da produção de cana-de-açúcar",
    },
    39: {  # Soja (Soybean)
        "residuos": ["Palha de soja"],
        "subsector_codigo": "AG_CULTURAS",
        "production_factor": 0.08,
        "description": "Resíduos da colheita de soja",
    },
    15: {  # Pastagem (Pasture)
        "residuos": ["Dejetos bovinos", "Dejetos equinos"],
        "subsector_codigo": "PC_BOVINOS",
        "production_factor": None,  # Based on animal count
        "description": "Dejetos de animais em pastagens",
    },
    46: {  # Café (Coffee)
        "residuos": ["Palha de café", "Casca de café"],
        "subsector_codigo": "AG_CULTURAS",
        "production_factor": 0.05,
        "description": "Resíduos do processamento de café",
    },
    47: {  # Citros (Citrus)
        "residuos": ["Bagaço de laranja"],
        "subsector_codigo": "AG_CULTURAS",
        "production_factor": 0.06,
        "description": "Resíduos do processamento de citros",
    },
    41: {  # Outras Temporárias (Other Annual Crops)
        "residuos": ["Palha de milho", "Sabugo de milho", "Palha de arroz"],
        "subsector_codigo": "AG_CULTURAS",
        "production_factor": 0.10,
        "description": "Resíduos de culturas temporárias diversas",
    },
    9: {  # Silvicultura (Forestry)
        "residuos": ["Resíduos florestais"],
        "subsector_codigo": "AG_CULTURAS",
        "production_factor": 0.15,
        "description": "Resíduos da silvicultura",
    },
    21: {  # Mosaico Agricultura-Pastagem
        "residuos": ["Dejetos bovinos", "Palha de milho"],
        "subsector_codigo": "AG_CULTURAS",
        "production_factor": 0.07,
        "description": "Resíduos de áreas mistas agricultura-pastagem",
    },
}

# Coordinate Reference Systems
WGS84 = "EPSG:4326"  # Input/output
UTM_23S = "EPSG:31983"  # SIRGAS 2000 / UTM zone 23S - for accurate buffer in meters

# Shapefile directory paths - check Railway deployment first, then local development
# Railway downloads to: backend/data/shapefiles/
# Local development uses: project_map/data/shapefile/
_RAILWAY_SHAPEFILE_DIR = Path(__file__).parent.parent.parent / "data" / "shapefiles"
_LOCAL_SHAPEFILE_DIR = (
    Path(__file__).parent.parent.parent.parent.parent / "project_map" / "data" / "shapefile"
)

# Use Railway path if it exists, otherwise fall back to local
SHAPEFILE_DIR = _RAILWAY_SHAPEFILE_DIR if _RAILWAY_SHAPEFILE_DIR.exists() else _LOCAL_SHAPEFILE_DIR


class ProximityService:
    """Service for proximity analysis using PostGIS"""

    def __init__(self):
        """Initialize coordinate transformers"""
        self.wgs84_to_utm = pyproj.Transformer.from_crs(WGS84, UTM_23S, always_xy=True).transform
        self.utm_to_wgs84 = pyproj.Transformer.from_crs(UTM_23S, WGS84, always_xy=True).transform

    def create_buffer_geojson(self, lat: float, lng: float, radius_km: float) -> Dict[str, Any]:
        """
        Create a circular buffer around a point.

        Args:
            lat: Latitude in WGS84
            lng: Longitude in WGS84
            radius_km: Radius in kilometers

        Returns:
            GeoJSON Polygon of the buffer
        """
        # Create point in WGS84
        point_wgs84 = Point(lng, lat)

        # Transform to UTM for accurate buffer
        point_utm = transform(self.wgs84_to_utm, point_wgs84)

        # Create buffer in meters
        buffer_utm = point_utm.buffer(radius_km * 1000)

        # Transform back to WGS84
        buffer_wgs84 = transform(self.utm_to_wgs84, buffer_utm)

        # Convert to GeoJSON
        return json.loads(gpd.GeoSeries([buffer_wgs84]).to_json())["features"][0]["geometry"]

    def get_municipalities_in_radius(
        self, lat: float, lng: float, radius_km: float
    ) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
        """
        Find all municipalities within a radius of a point.

        Uses shapefile for geometry and database for biogas data.

        Args:
            lat: Latitude of analysis point
            lng: Longitude of analysis point
            radius_km: Search radius in kilometers

        Returns:
            Tuple of (buffer_geojson, list of municipalities)
        """
        buffer_geojson = self.create_buffer_geojson(lat, lng, radius_km)

        # Create buffer polygon for intersection test
        point = Point(lng, lat)
        point_utm = transform(self.wgs84_to_utm, point)
        buffer_utm = point_utm.buffer(radius_km * 1000)
        buffer_wgs84 = transform(self.utm_to_wgs84, buffer_utm)

        municipalities = []

        try:
            # Load municipalities shapefile
            shapefile_path = SHAPEFILE_DIR / "SP_Municipios_2024.shp"
            if not shapefile_path.exists():
                logger.warning(f"Municipalities shapefile not found: {shapefile_path}")
                return buffer_geojson, municipalities

            gdf = gpd.read_file(shapefile_path)

            # Ensure WGS84
            if gdf.crs != WGS84:
                gdf = gdf.to_crs(WGS84)

            # Get biogas data from Supabase REST with multiple lookup keys
            biogas_data = {}
            biogas_data_by_normalized = {}
            biogas_data_by_ibge = {}

            try:
                from app.core.database import get_db

                with get_db() as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        "SELECT municipality_name, ibge_code, population, area_km2, "
                        "total_biogas_m3_year FROM municipalities"
                    )
                    for row in cursor.fetchall():
                        r = dict(row)
                        biogas_data[r["municipality_name"]] = r
                        normalized = normalize_municipality_name(r["municipality_name"])
                        biogas_data_by_normalized[normalized] = r
                        if r.get("ibge_code"):
                            biogas_data_by_ibge[str(r["ibge_code"])] = r
                    cursor.close()
                logger.info(f"Loaded biogas data for {len(biogas_data)} municipalities")
            except Exception as e:
                logger.warning(f"Could not load biogas data from database: {e}")

            # Find intersecting municipalities
            muni_id = 0
            for idx, row in gdf.iterrows():
                geom = row.geometry
                if geom is None:
                    continue

                # Check if municipality intersects buffer
                if geom.intersects(buffer_wgs84):
                    # Calculate distance from point to municipality centroid
                    centroid = geom.centroid
                    centroid_utm = transform(self.wgs84_to_utm, centroid)
                    distance_km = point_utm.distance(centroid_utm) / 1000

                    # Get municipality name from shapefile
                    muni_name = row.get("NM_MUN", row.get("nome", f"Municipality_{idx}"))
                    muni_ibge = str(row.get("CD_MUN", ""))

                    # Try multiple matching strategies to find biogas data
                    muni_biogas = {}

                    # Strategy 1: Direct name match
                    if muni_name in biogas_data:
                        muni_biogas = biogas_data[muni_name]

                    # Strategy 2: Normalized name match (handles accents, case)
                    elif not muni_biogas:
                        normalized_name = normalize_municipality_name(muni_name)
                        muni_biogas = biogas_data_by_normalized.get(normalized_name, {})

                    # Strategy 3: IBGE code match
                    if not muni_biogas and muni_ibge:
                        muni_biogas = biogas_data_by_ibge.get(muni_ibge, {})

                    # Log if we still couldn't find data
                    if not muni_biogas:
                        logger.debug(
                            f"No biogas data found for municipality: {muni_name} "
                            f"(IBGE: {muni_ibge})"
                        )

                    muni_id += 1
                    municipalities.append(
                        {
                            "id": muni_id,
                            "name": muni_name,
                            "ibge_code": muni_biogas.get("ibge_code") or muni_ibge,
                            "distance_km": round(distance_km, 2),
                            "intersection_percent": 100,  # Simplified for now
                            "population": muni_biogas.get("population", 0) or 0,
                            "area_km2": muni_biogas.get("area_km2") or row.get("AREA_KM2"),
                            "biogas_m3_year": muni_biogas.get("total_biogas_m3_year", 0) or 0,
                        }
                    )

            # Sort by distance
            municipalities.sort(key=lambda x: x["distance_km"])

            logger.info(
                "Found %s municipalities within %s km", len(municipalities), float(radius_km)
            )

        except Exception as e:
            logger.error(f"Error finding municipalities: {e}")
            raise

        return buffer_geojson, municipalities

    def aggregate_biogas_potential(
        self, lat: float, lng: float, radius_km: float
    ) -> Dict[str, Any]:
        """
        Aggregate biogas potential for all municipalities in radius.

        First finds municipalities via shapefile, then aggregates their biogas data.

        Args:
            lat: Latitude of analysis point
            lng: Longitude of analysis point
            radius_km: Search radius in kilometers

        Returns:
            Dictionary with aggregated biogas potential data
        """
        # First get the municipality names in radius
        _, municipalities = self.get_municipalities_in_radius(lat, lng, radius_km)

        if not municipalities:
            return self._empty_biogas_result()

        # Get the municipality names
        muni_names = [m["name"] for m in municipalities]

        if not muni_names:
            return self._empty_biogas_result()

        try:
            from app.core.database import get_db

            with get_db() as conn:
                cursor = conn.cursor()
                placeholders = ", ".join(["%s"] * len(muni_names))
                query = f"""
                    SELECT *
                    FROM municipalities
                    WHERE municipality_name IN ({placeholders})
                """
                cursor.execute(query, muni_names)
                rows = [dict(r) for r in cursor.fetchall()]
                activity_by_ibge = load_activity_counts(
                    cursor, [str(row["ibge_code"]) for row in rows]
                )
                cursor.close()

            if not rows:
                return self._empty_biogas_result()

            canonical_rows = [
                compute_published_municipality_metrics(
                    row,
                    activity=activity_by_ibge.get(str(row["ibge_code"]), {}),
                ).to_published_biogas_dict()
                for row in rows
            ]

            def _sum(key):
                return sum(float(r.get(key) or 0) for r in canonical_rows)

            total_energy = _sum("energy_potential_mwh_year")
            homes_powered = int(total_energy * 1000 / (150 * 12)) if total_energy > 0 else 0

            return {
                "total_m3_year": _sum("total_biogas_m3_year"),
                "by_category": {
                    "urban": _sum("urban_biogas_m3_year"),
                    "agricultural": _sum("agricultural_biogas_m3_year"),
                    "livestock": _sum("livestock_biogas_m3_year"),
                },
                "by_residue": {
                    "RSU (Resíduos Sólidos Urbanos)": _sum("rsu_biogas_m3_year"),
                    "Cana-de-açúcar": _sum("sugarcane_biogas_m3_year"),
                    "Soja": _sum("soybean_biogas_m3_year"),
                    "Milho": _sum("corn_biogas_m3_year"),
                    "Café": _sum("coffee_biogas_m3_year"),
                    "Citros": _sum("citrus_biogas_m3_year"),
                    "Bovinos": _sum("cattle_biogas_m3_year"),
                    "Suínos": _sum("swine_biogas_m3_year"),
                    "Aves": _sum("poultry_biogas_m3_year"),
                },
                "energy_potential_mwh_year": total_energy,
                "co2_reduction_tons_year": _sum("co2_reduction_tons_year"),
                "homes_powered_equivalent": homes_powered,
            }

        except Exception as e:
            logger.error(f"Error aggregating biogas potential: {e}")
            return self._empty_biogas_result()

    def _empty_biogas_result(self) -> Dict[str, Any]:
        """Return empty biogas result structure"""
        return {
            "total_m3_year": 0,
            "by_category": {"urban": 0, "agricultural": 0, "livestock": 0},
            "by_residue": {},
            "energy_potential_mwh_year": 0,
            "co2_reduction_tons_year": 0,
            "homes_powered_equivalent": 0,
        }

    def get_residuos_for_municipalities(self, municipality_names: List[str]) -> Dict[str, Any]:
        """
        Get detailed residuos data for municipalities.

        Retrieves residue types with their chemical parameters (BMP, TS, VS)
        for biogas calculation refinement.

        Args:
            municipality_names: List of municipality names to query

        Returns:
            Dictionary with residuos organized by sector and subsector
        """
        if not municipality_names:
            return self._empty_residuos_result()

        try:
            from app.core.database import get_db

            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, codigo, nome, nome_en, sector_codigo, subsector_codigo,
                    categoria_nome,
                    bmp_min, bmp_medio, bmp_max, bmp_unidade,
                    ts_min, ts_medio, ts_max, vs_min, vs_medio, vs_max,
                    chemical_cn_ratio, chemical_ch4_content, fator_realista, icon
                    FROM residuos
                """)
                residuos_data = [dict(r) for r in cursor.fetchall()]

                cursor.execute("SELECT codigo, nome, emoji, ordem FROM sectors")
                sectors_data = [dict(r) for r in cursor.fetchall()]
                sector_map = {s["codigo"]: s for s in sectors_data}

                cursor.execute("SELECT codigo, nome FROM subsectors")
                subsectors_data = [dict(r) for r in cursor.fetchall()]
                subsector_map = {ss["codigo"]: ss["nome"] for ss in subsectors_data}
                cursor.close()

            residuos_list = []
            for r in sorted(
                residuos_data,
                key=lambda x: (
                    sector_map.get(x.get("sector_codigo", ""), {}).get("ordem") or 999,
                    x.get("nome") or "",
                ),
            ):
                item = {k: (float(v) if hasattr(v, "__float__") else v) for k, v in r.items()}
                sc = r.get("sector_codigo", "")
                sector = sector_map.get(sc, {})
                item["sector_nome"] = sector.get("nome", "")
                item["sector_emoji"] = sector.get("emoji", "")
                item["subsector_nome"] = subsector_map.get(r.get("subsector_codigo", ""), "")
                residuos_list.append(item)

            by_sector: Dict[str, Any] = {}
            for residuo in residuos_list:
                sc = residuo["sector_codigo"]
                if sc not in by_sector:
                    by_sector[sc] = {
                        "nome": residuo["sector_nome"],
                        "emoji": residuo["sector_emoji"],
                        "residuos": [],
                    }
                by_sector[sc]["residuos"].append(residuo)

            total_residuos = len(residuos_list)
            avg_bmp = (
                sum(float(r.get("bmp_medio") or 0) for r in residuos_list) / total_residuos
                if total_residuos > 0
                else 0
            )

            return {
                "total_residuos": total_residuos,
                "by_sector": by_sector,
                "residuos": residuos_list,
                "summary": {"avg_bmp_medio": round(avg_bmp, 2), "sectors_count": len(by_sector)},
            }

        except Exception as e:
            logger.error(f"Error fetching residuos for municipalities: {e}")
            return self._empty_residuos_result()

    def correlate_mapbiomas_residuos(self, land_use_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Correlate MapBiomas land use classes with residuos database.

        Creates a mapping between detected land use and potential biogas sources.

        Args:
            land_use_data: MapBiomas analysis results with by_class data

        Returns:
            Dictionary with correlated residuos for each land use class
        """
        if not land_use_data or "by_class" not in land_use_data:
            return {"correlations": [], "total_potential_sources": 0}

        correlations = []
        by_class = land_use_data.get("by_class", {})

        # Resolve every mapped class up front so all residue rows can be
        # fetched in a single query (was one query per class — N+1).
        class_entries = []
        all_residuo_names: set = set()
        for class_id_str, class_data in by_class.items():
            try:
                class_id = int(class_id_str)
            except (TypeError, ValueError):
                continue

            mapping_entry = MAPBIOMAS_RESIDUOS_MAPPING.get(class_id)
            if not mapping_entry:
                continue

            class_entries.append((class_id, class_data, mapping_entry))
            all_residuo_names.update(mapping_entry["residuos"])

        try:
            from app.core.database import get_db

            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT codigo, nome FROM sectors")
                sector_nome_map = {row["codigo"]: row["nome"] for row in cursor.fetchall()}

                residuos_by_name: Dict[str, Dict[str, Any]] = {}
                if all_residuo_names:
                    placeholders = ", ".join(["%s"] * len(all_residuo_names))
                    cursor.execute(
                        f"""
                        SELECT id, nome, bmp_medio, ts_medio, vs_medio, chemical_cn_ratio,
                        chemical_ch4_content, bmp_unidade, sector_codigo
                        FROM residuos
                        WHERE nome IN ({placeholders})
                    """,
                        sorted(all_residuo_names),
                    )
                    residuos_by_name = {row["nome"]: dict(row) for row in cursor.fetchall()}
        except Exception as e:
            # Correlation is supplementary to the proximity analysis — degrade
            # to an EXPLICITLY empty result rather than failing the whole call,
            # but never return silently partial data (the DB work above is
            # all-or-nothing; the loop below is pure Python).
            logger.error(f"Error correlating MapBiomas with residuos: {e}")
            return {
                "correlations": [],
                "total_potential_sources": 0,
                "total_estimated_biogas_m3_year": 0.0,
                "error": "Residue correlation unavailable (database error)",
                "note": (
                    "Estimates based on MapBiomas land use areas and residue " "production factors"
                ),
            }

        for class_id, class_data, mapping_entry in class_entries:
            matched_residuos = []
            for residuo_name in mapping_entry["residuos"]:
                residuo = residuos_by_name.get(residuo_name)
                if residuo is None:
                    continue
                item = {k: (float(v) if hasattr(v, "__float__") else v) for k, v in residuo.items()}
                item["sector_nome"] = sector_nome_map.get(residuo.get("sector_codigo", ""), "")
                matched_residuos.append(item)

            area_km2 = class_data.get("area_km2", 0)
            area_ha = area_km2 * 100
            production_factor = mapping_entry.get("production_factor")
            estimated_residue_tons = None
            estimated_biogas_m3 = None

            if production_factor and matched_residuos:
                estimated_residue_tons = area_ha * production_factor
                avg_bmp = sum(float(res.get("bmp_medio") or 0) for res in matched_residuos) / len(
                    matched_residuos
                )
                avg_ts = sum(float(res.get("ts_medio") or 0) for res in matched_residuos) / len(
                    matched_residuos
                )
                avg_vs = sum(float(res.get("vs_medio") or 0) for res in matched_residuos) / len(
                    matched_residuos
                )
                if avg_ts > 0 and avg_vs > 0:
                    vs_tons = estimated_residue_tons * (avg_ts / 100) * (avg_vs / 100)
                    estimated_biogas_m3 = vs_tons * avg_bmp

            correlations.append(
                {
                    "mapbiomas_class_id": class_id,
                    "mapbiomas_class_name": class_data.get("name", f"Classe {class_id}"),
                    "area_km2": round(area_km2, 4),
                    "area_ha": round(area_ha, 2),
                    "percent_of_buffer": class_data.get("percent", 0),
                    "color": class_data.get("color", "#808080"),
                    "description": mapping_entry.get("description", ""),
                    "subsector_codigo": mapping_entry.get("subsector_codigo"),
                    "matched_residuos": matched_residuos,
                    "production_factor": production_factor,
                    "estimated_residue_tons": (
                        round(estimated_residue_tons, 2) if estimated_residue_tons else None
                    ),
                    "estimated_biogas_m3_year": (
                        round(estimated_biogas_m3, 2) if estimated_biogas_m3 else None
                    ),
                }
            )

        # Sort by area (largest first)
        correlations.sort(key=lambda x: x.get("area_km2", 0), reverse=True)

        # Calculate totals
        total_estimated_biogas = sum(
            c.get("estimated_biogas_m3_year", 0) or 0 for c in correlations
        )

        return {
            "correlations": correlations,
            "total_potential_sources": len(correlations),
            "total_estimated_biogas_m3_year": round(total_estimated_biogas, 2),
            "note": "Estimates based on MapBiomas land use areas and residue production factors",
        }

    def _empty_residuos_result(self) -> Dict[str, Any]:
        """Return empty residuos result structure"""
        return {
            "total_residuos": 0,
            "by_sector": {},
            "residuos": [],
            "summary": {"avg_bmp_medio": 0, "sectors_count": 0},
        }

    def find_nearest_infrastructure(self, lat: float, lng: float) -> List[Dict[str, Any]]:
        """
        Find nearest infrastructure of each type.

        Uses shapefiles loaded via geopandas for infrastructure that
        may not be in the database.

        Args:
            lat: Latitude of analysis point
            lng: Longitude of analysis point

        Returns:
            List of nearest infrastructure items
        """
        analysis_point = Point(lng, lat)
        results = []

        # Infrastructure configurations
        infrastructure_configs = [
            {
                "type": "gas_pipeline",
                "name": "Gasoduto",
                "files": ["Gasodutos_Distribuicao_SP", "Gasodutos_Transporte_SP"],
                "max_distance_km": 100,
            },
            {
                "type": "substation",
                "name": "Subestação",
                "files": ["Subestacoes_Energia"],
                "max_distance_km": 50,
            },
            {
                "type": "railway",
                "name": "Rodovia",
                "files": ["Rodovias_Estaduais_SP"],
                "max_distance_km": 50,
            },
            {
                "type": "transmission_line",
                "name": "Linha de Transmissão",
                "files": ["Linhas_De_Transmissao_Energia"],
                "max_distance_km": 50,
            },
            {"type": "ete", "name": "ETE", "files": ["ETEs_2019_SP"], "max_distance_km": 30},
        ]

        for config in infrastructure_configs:
            result = self._find_nearest_from_shapefiles(
                analysis_point,
                config["files"],
                config["type"],
                config["name"],
                config["max_distance_km"],
            )
            results.append(result)

        return results

    def _find_nearest_from_shapefiles(
        self,
        point: Point,
        shapefile_names: List[str],
        infra_type: str,
        infra_name: str,
        max_distance_km: float,
    ) -> Dict[str, Any]:
        """
        Find nearest feature from shapefile(s).

        Args:
            point: Analysis point (WGS84)
            shapefile_names: List of shapefile names to search
            infra_type: Infrastructure type ID
            infra_name: Human-readable name
            max_distance_km: Maximum search distance

        Returns:
            Dict with nearest feature info
        """
        nearest_distance = float("inf")
        nearest_feature = None

        for shapefile_name in shapefile_names:
            shapefile_path = SHAPEFILE_DIR / f"{shapefile_name}.shp"

            if not shapefile_path.exists():
                logger.warning(f"Shapefile not found: {shapefile_path}")
                continue

            try:
                gdf = gpd.read_file(shapefile_path)

                # Ensure WGS84
                if gdf.crs != WGS84:
                    gdf = gdf.to_crs(WGS84)

                # Transform point to UTM for accurate distance
                point_utm = transform(self.wgs84_to_utm, point)

                # Calculate distance for each feature
                for idx, row in gdf.iterrows():
                    geom = row.geometry
                    if geom is None:
                        continue

                    # Transform geometry to UTM
                    geom_utm = transform(self.wgs84_to_utm, geom)

                    # Calculate distance in km
                    distance_km = point_utm.distance(geom_utm) / 1000

                    if distance_km < nearest_distance:
                        nearest_distance = distance_km
                        nearest_feature = {
                            "name": row.get(
                                "nome", row.get("NOME", row.get("name", shapefile_name))
                            ),
                            "properties": {
                                k: str(v) if v is not None else None
                                for k, v in row.items()
                                if k != "geometry" and not str(k).startswith("_")
                            },
                        }

            except Exception as e:
                logger.error(f"Error reading shapefile {shapefile_name}: {e}")
                continue

        # Check if within max distance
        if nearest_distance <= max_distance_km and nearest_feature:
            return {
                "type": infra_type,
                "name": nearest_feature.get("name", infra_name),
                "distance_km": round(nearest_distance, 2),
                "found": True,
                "properties": nearest_feature.get("properties", {}),
            }
        else:
            return {
                "type": infra_type,
                "name": None,
                "distance_km": (
                    round(nearest_distance, 2) if nearest_distance != float("inf") else None
                ),
                "found": False,
                "properties": None,
                "note": f"Nenhum(a) {infra_name} encontrado(a) em {max_distance_km}km",
            }
