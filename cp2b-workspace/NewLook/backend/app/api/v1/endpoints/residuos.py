"""
API endpoints for residuos (residues) data.

Provides access to:
- Residue types with chemical parameters (BMP, TS, VS, C:N, CH4)
- Scientific references linked to parameters
- Sector and subsector organization
- Conversion factors with literature backing

All queries use Supabase REST (supabase-py) — no direct psycopg2 connection.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging
import traceback
from collections import defaultdict

from app.services.supabase_client import get_supabase_client

router = APIRouter()
logger = logging.getLogger(__name__)


def _to_float(val) -> Optional[float]:
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


@router.get("/sectors")
async def get_sectors():
    """
    Get all biogas sectors with summary statistics.
    """
    try:
        supabase = get_supabase_client()

        sectors_res = supabase.table("sectors").select("*").order("ordem").execute()
        sectors = sectors_res.data or []

        residuos_res = supabase.table("residuos").select(
            "sector_codigo, bmp_medio, ts_medio, vs_medio, chemical_cn_ratio, chemical_ch4_content"
        ).execute()

        by_sector: dict = defaultdict(list)
        for r in (residuos_res.data or []):
            by_sector[r["sector_codigo"]].append(r)

        result = []
        for s in sectors:
            grupo = by_sector.get(s["codigo"], [])
            n = len(grupo)

            def _avg(key):
                vals = [float(r[key]) for r in grupo if r.get(key) is not None]
                return round(sum(vals) / len(vals), 2) if vals else None

            s_out = dict(s)
            s_out["num_residuos"] = n
            s_out["avg_bmp"] = _avg("bmp_medio")
            s_out["avg_ts"] = _avg("ts_medio")
            s_out["avg_vs"] = _avg("vs_medio")
            s_out["avg_cn_ratio"] = _avg("chemical_cn_ratio")
            s_out["avg_ch4_content"] = _avg("chemical_ch4_content")
            result.append(s_out)

        return {"success": True, "count": len(result), "sectors": result}

    except Exception as e:
        logger.error(f"Error fetching sectors: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/subsectors")
async def get_subsectors(sector_codigo: Optional[str] = None):
    """
    Get subsectors, optionally filtered by sector.
    """
    try:
        supabase = get_supabase_client()

        q = supabase.table("subsectors").select("*")
        if sector_codigo:
            q = q.eq("sector_codigo", sector_codigo)
        subsectors_res = q.execute()
        subsectors = subsectors_res.data or []

        sectors_res = supabase.table("sectors").select("codigo, nome").execute()
        sector_map = {s["codigo"]: s["nome"] for s in (sectors_res.data or [])}

        residuos_res = supabase.table("residuos").select("subsector_codigo").execute()
        subsector_count: dict = defaultdict(int)
        for r in (residuos_res.data or []):
            if r.get("subsector_codigo"):
                subsector_count[r["subsector_codigo"]] += 1

        result = []
        for ss in sorted(subsectors, key=lambda x: (x.get("ordem") or 0)):
            ss_out = dict(ss)
            ss_out["sector_nome"] = sector_map.get(ss["sector_codigo"], "")
            ss_out["num_residuos"] = subsector_count.get(ss["codigo"], 0)
            result.append(ss_out)

        return {"success": True, "count": len(result), "subsectors": result}

    except Exception as e:
        logger.error(f"Error fetching subsectors: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
async def get_residuos(
    sector_codigo: Optional[str] = None,
    subsector_codigo: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0)
):
    """
    Get all residuos with chemical parameters.
    """
    try:
        logger.info(f"Fetching residuos: sector={sector_codigo}, subsector={subsector_codigo}, search={search}")
        supabase = get_supabase_client()

        # Fetch residuos with filters
        q = supabase.table("residuos").select("*")
        if sector_codigo:
            q = q.eq("sector_codigo", sector_codigo)
        if subsector_codigo:
            q = q.eq("subsector_codigo", subsector_codigo)
        if search:
            q = q.ilike("nome", f"%{search}%")
        residuos_res = q.execute()
        all_residuos = residuos_res.data or []

        # Fetch lookup tables
        sectors_res = supabase.table("sectors").select("codigo, nome, emoji, ordem").execute()
        sector_map = {s["codigo"]: s for s in (sectors_res.data or [])}

        subsectors_res = supabase.table("subsectors").select("codigo, nome").execute()
        subsector_map = {ss["codigo"]: ss["nome"] for ss in (subsectors_res.data or [])}

        refs_res = supabase.table("scientific_references").select(
            "primary_residue, authors, year, publication_year, has_validated_params"
        ).execute()

        ref_count: dict = defaultdict(int)
        ref_main: dict = {}
        for ref in (refs_res.data or []):
            rc = ref.get("primary_residue")
            if not rc:
                continue
            ref_count[rc] += 1
            year = ref.get("year") or ref.get("publication_year")
            authors = ref.get("authors", "")
            citation = f"{authors} ({year})" if authors and year else ""
            validated = bool(ref.get("has_validated_params"))
            # Keep most validated / most recent
            if rc not in ref_main or (validated and not ref_main[rc]["validated"]):
                ref_main[rc] = {"citation": citation, "validated": validated}

        # Sort by sector.ordem then residuo.nome (mirrors original SQL ORDER BY)
        all_residuos.sort(key=lambda r: (
            sector_map.get(r.get("sector_codigo", ""), {}).get("ordem") or 999,
            r.get("nome") or ""
        ))

        total = len(all_residuos)
        page = all_residuos[offset: offset + limit]

        residuos_out = []
        for r in page:
            item = {k: (_to_float(v) if hasattr(v, "__float__") else v) for k, v in r.items()}
            sc = r.get("sector_codigo", "")
            sector = sector_map.get(sc, {})
            item["sector_nome"] = sector.get("nome", "")
            item["sector_emoji"] = sector.get("emoji", "")
            item["subsector_nome"] = subsector_map.get(r.get("subsector_codigo", ""), "")
            item["reference_count"] = ref_count.get(r.get("codigo", ""), 0)
            item["main_reference"] = ref_main.get(r.get("codigo", ""), {}).get("citation")
            residuos_out.append(item)

        return {
            "success": True,
            "count": len(residuos_out),
            "total": total,
            "limit": limit,
            "offset": offset,
            "residuos": residuos_out,
        }

    except Exception as e:
        logger.error(f"Error fetching residuos: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/references/all")
async def get_all_references(
    limit: int = Query(default=1000, le=5000),
    offset: int = Query(default=0, ge=0)
):
    """
    Get all scientific references across all residues.
    """
    try:
        supabase = get_supabase_client()

        refs_res = supabase.table("scientific_references").select("*").execute()
        all_refs = refs_res.data or []

        residuos_res = supabase.table("residuos").select("id, codigo, nome, sector_codigo").execute()
        residuo_by_codigo = {r["codigo"]: r for r in (residuos_res.data or [])}

        sectors_res = supabase.table("sectors").select("codigo, nome").execute()
        sector_map = {s["codigo"]: s["nome"] for s in (sectors_res.data or [])}

        # Sort by year DESC, authors
        all_refs.sort(key=lambda r: (
            -(r.get("year") or r.get("publication_year") or 0),
            r.get("authors") or ""
        ))

        total = len(all_refs)
        page = all_refs[offset: offset + limit]

        result = []
        for ref in page:
            residuo = residuo_by_codigo.get(ref.get("primary_residue", ""), {})
            sc = residuo.get("sector_codigo", "")
            year = ref.get("year") or ref.get("publication_year")
            authors = ref.get("authors") or "Unknown"
            citation = f"{authors} - {ref.get('title', '')}" if ref.get("title") else authors

            val = ref.get("reported_value")
            try:
                val = float(val) if val is not None and val != "" else None
            except (ValueError, TypeError):
                val = None

            result.append({
                "id": ref.get("id"),
                "residuo_codigo": ref.get("primary_residue"),
                "residuo_id": residuo.get("id"),
                "residuo_nome": residuo.get("nome"),
                "sector_codigo": sc,
                "sector_nome": sector_map.get(sc, ""),
                "parameter_type": None,
                "citation": citation,
                "authors": ref.get("authors"),
                "title": ref.get("title"),
                "journal": ref.get("journal"),
                "year": year,
                "volume": None,
                "pages": None,
                "doi": ref.get("doi"),
                "url": ref.get("url"),
                "reported_value": val,
                "reported_unit": ref.get("reported_unit"),
                "is_primary": bool(ref.get("has_validated_params")),
                "validation_status": ref.get("validation_status"),
            })

        return {
            "success": True,
            "count": len(result),
            "total": total,
            "limit": limit,
            "offset": offset,
            "references": result,
        }

    except Exception as e:
        logger.error(f"Error fetching all references: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversion-factors/")
async def get_conversion_factors(category: Optional[str] = None):
    """
    Get biogas conversion factors with literature backing.
    """
    try:
        logger.info(f"Fetching conversion factors, category filter: {category}")
        supabase = get_supabase_client()

        q = supabase.table("conversion_factors").select(
            "id, category, subcategory, factor_value, unit, literature_reference, "
            "reference_url, real_data_validation, safety_margin_percent, final_factor, notes"
        )
        if category:
            q = q.eq("category", category)
        q = q.order("category").order("subcategory")

        result = q.execute()
        factors = []
        for row in (result.data or []):
            item = dict(row)
            for key in ["factor_value", "safety_margin_percent", "final_factor"]:
                item[key] = _to_float(item.get(key))
            factors.append(item)

        logger.info(f"Found {len(factors)} conversion factors")
        return {"success": True, "count": len(factors), "factors": factors}

    except Exception as e:
        logger.error(f"Error fetching conversion factors: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/summary/by-sector")
async def get_summary_by_sector():
    """
    Get summary statistics grouped by sector.
    """
    try:
        logger.info("Fetching sector summary...")
        supabase = get_supabase_client()

        sectors_res = supabase.table("sectors").select("codigo, nome, emoji, ordem").order("ordem").execute()
        sectors = sectors_res.data or []

        residuos_res = supabase.table("residuos").select(
            "sector_codigo, bmp_medio, ts_medio, vs_medio, chemical_cn_ratio, chemical_ch4_content, codigo"
        ).execute()

        refs_res = supabase.table("scientific_references").select("primary_residue").execute()
        ref_count_by_residuo: dict = defaultdict(int)
        for ref in (refs_res.data or []):
            if ref.get("primary_residue"):
                ref_count_by_residuo[ref["primary_residue"]] += 1

        by_sector: dict = defaultdict(list)
        ref_count_by_sector: dict = defaultdict(int)
        for r in (residuos_res.data or []):
            sc = r.get("sector_codigo", "")
            by_sector[sc].append(r)
            ref_count_by_sector[sc] += ref_count_by_residuo.get(r.get("codigo", ""), 0)

        summary = []
        for s in sectors:
            grupo = by_sector.get(s["codigo"], [])
            n = len(grupo)

            def _avg(key):
                vals = [float(r[key]) for r in grupo if r.get(key) is not None]
                return round(sum(vals) / len(vals), 2) if vals else None

            def _min(key):
                vals = [float(r[key]) for r in grupo if r.get(key) is not None]
                return round(min(vals), 2) if vals else None

            def _max(key):
                vals = [float(r[key]) for r in grupo if r.get(key) is not None]
                return round(max(vals), 2) if vals else None

            summary.append({
                "codigo": s["codigo"],
                "nome": s["nome"],
                "emoji": s.get("emoji"),
                "ordem": s.get("ordem"),
                "num_residuos": n,
                "avg_bmp": _avg("bmp_medio"),
                "min_bmp": _min("bmp_medio"),
                "max_bmp": _max("bmp_medio"),
                "avg_ts": _avg("ts_medio"),
                "avg_vs": _avg("vs_medio"),
                "avg_cn_ratio": _avg("chemical_cn_ratio"),
                "avg_ch4_content": _avg("chemical_ch4_content"),
                "total_references": ref_count_by_sector.get(s["codigo"], 0),
            })

        logger.info(f"Found {len(summary)} sectors")
        return {"success": True, "count": len(summary), "summary": summary}

    except Exception as e:
        logger.error(f"Error fetching sector summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/compare")
async def compare_residuos(
    ids: str = Query(..., description="Comma-separated residue IDs to compare")
):
    """
    Compare multiple residues side by side.
    """
    try:
        id_list = [int(i.strip()) for i in ids.split(",")]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    if len(id_list) < 2:
        raise HTTPException(status_code=400, detail="At least 2 residue IDs required for comparison")
    if len(id_list) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 residues can be compared at once")

    try:
        supabase = get_supabase_client()

        residuos_res = supabase.table("residuos").select(
            "id, nome, sector_codigo, codigo, bmp_medio, ts_medio, vs_medio, "
            "chemical_cn_ratio, chemical_ch4_content, fator_realista"
        ).in_("id", id_list).execute()

        sectors_res = supabase.table("sectors").select("codigo, nome, emoji").execute()
        sector_map = {s["codigo"]: s for s in (sectors_res.data or [])}

        refs_res = supabase.table("scientific_references").select("primary_residue").execute()
        ref_count: dict = defaultdict(int)
        for ref in (refs_res.data or []):
            if ref.get("primary_residue"):
                ref_count[ref["primary_residue"]] += 1

        if len(residuos_res.data or []) != len(id_list):
            raise HTTPException(status_code=404, detail="One or more residue IDs not found")

        residuos_out = []
        for r in sorted(residuos_res.data, key=lambda x: float(x.get("bmp_medio") or 0), reverse=True):
            sc = r.get("sector_codigo", "")
            sector = sector_map.get(sc, {})
            item = {k: (_to_float(v) if hasattr(v, "__float__") else v) for k, v in r.items()}
            item["sector_nome"] = sector.get("nome", "")
            item["sector_emoji"] = sector.get("emoji", "")
            item["reference_count"] = ref_count.get(r.get("codigo", ""), 0)
            residuos_out.append(item)

        return {"success": True, "count": len(residuos_out), "comparison": residuos_out}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error comparing residuos: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{residuo_id}/references")
async def get_residuo_references(
    residuo_id: int,
    parameter_type: Optional[str] = None
):
    """
    Get scientific references for a specific residue.
    """
    try:
        supabase = get_supabase_client()

        residuo_res = supabase.table("residuos").select("nome, codigo").eq("id", residuo_id).execute()
        if not residuo_res.data:
            raise HTTPException(status_code=404, detail="Residue not found")

        residuo = residuo_res.data[0]
        codigo = residuo["codigo"]

        refs_res = supabase.table("scientific_references").select("*").eq("primary_residue", codigo).execute()
        refs_sorted = sorted(
            refs_res.data or [],
            key=lambda r: -(r.get("year") or r.get("publication_year") or 0)
        )

        references = []
        for ref in refs_sorted:
            year = ref.get("year") or ref.get("publication_year")
            authors = ref.get("authors") or "Unknown"
            title = ref.get("title") or ""
            citation = f"{title} - {authors}" if title else authors
            val = ref.get("reported_value")
            try:
                val = float(val) if val is not None and val != "" else None
            except (ValueError, TypeError):
                val = None
            references.append({
                "id": ref.get("id"),
                "parameter_type": None,
                "citation": citation,
                "authors": ref.get("authors"),
                "title": title,
                "journal": ref.get("journal"),
                "year": year,
                "volume": None,
                "pages": None,
                "doi": ref.get("doi"),
                "url": ref.get("url"),
                "reported_value": val,
                "reported_unit": ref.get("reported_unit"),
                "is_primary": bool(ref.get("has_validated_params")),
                "validation_status": ref.get("validation_status"),
            })

        return {
            "success": True,
            "residuo_name": residuo["nome"],
            "count": len(references),
            "references": references,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching references for residuo {residuo_id}: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{residuo_id}")
async def get_residuo(residuo_id: int):
    """
    Get a specific residue by ID with all details and references.
    """
    try:
        supabase = get_supabase_client()

        residuo_res = supabase.table("residuos").select("*").eq("id", residuo_id).execute()
        if not residuo_res.data:
            raise HTTPException(status_code=404, detail="Residue not found")

        r = residuo_res.data[0]
        residuo = {k: (_to_float(v) if hasattr(v, "__float__") else v) for k, v in r.items()}

        sectors_res = supabase.table("sectors").select("codigo, nome, nome_en, emoji").eq("codigo", r.get("sector_codigo", "")).execute()
        if sectors_res.data:
            s = sectors_res.data[0]
            residuo["sector_nome"] = s.get("nome", "")
            residuo["sector_nome_en"] = s.get("nome_en", "")
            residuo["sector_emoji"] = s.get("emoji", "")
        else:
            residuo["sector_nome"] = ""
            residuo["sector_nome_en"] = ""
            residuo["sector_emoji"] = ""

        if r.get("subsector_codigo"):
            ss_res = supabase.table("subsectors").select("nome").eq("codigo", r["subsector_codigo"]).execute()
            residuo["subsector_nome"] = ss_res.data[0]["nome"] if ss_res.data else ""
        else:
            residuo["subsector_nome"] = ""

        refs_res = supabase.table("scientific_references").select("*").eq("primary_residue", r.get("codigo", "")).execute()
        refs_sorted = sorted(
            refs_res.data or [],
            key=lambda ref: -(ref.get("year") or ref.get("publication_year") or 0)
        )

        references = []
        references_by_type: dict = {}
        for ref in refs_sorted:
            year = ref.get("year") or ref.get("publication_year")
            authors = ref.get("authors") or "Unknown"
            title = ref.get("title") or ""
            citation = f"{title} - {authors}" if title else authors
            val = ref.get("reported_value")
            try:
                val = float(val) if val is not None and val != "" else None
            except (ValueError, TypeError):
                val = None
            ref_out = {
                "id": ref.get("id"),
                "parameter_type": None,
                "citation": citation,
                "authors": ref.get("authors"),
                "title": title,
                "journal": ref.get("journal"),
                "year": year,
                "volume": None,
                "pages": None,
                "doi": ref.get("doi"),
                "url": ref.get("url"),
                "reported_value": val,
                "reported_unit": ref.get("reported_unit"),
                "is_primary": bool(ref.get("has_validated_params")),
                "validation_status": ref.get("validation_status"),
            }
            references.append(ref_out)
            pt = ref_out["parameter_type"]
            if pt not in references_by_type:
                references_by_type[pt] = []
            references_by_type[pt].append(ref_out)

        residuo["references"] = references
        residuo["references_by_type"] = references_by_type
        residuo["total_references"] = len(references)

        return {"success": True, "residuo": residuo}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching residuo {residuo_id}: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
