"""
API endpoints for residuos (residues) data.

Provides access to:
- Residue types with chemical parameters (BMP, TS, VS, C:N, CH4)
- Scientific references linked to parameters
- Sector and subsector organization
- Conversion factors with literature backing
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging
import traceback
from collections import defaultdict

from app.core.database import get_db

router = APIRouter()
logger = logging.getLogger(__name__)


def _to_float(val) -> Optional[float]:
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _rows(conn, sql: str, params=None) -> list[dict]:
    cursor = conn.cursor()
    cursor.execute(sql, params or [])
    result = [dict(r) for r in (cursor.fetchall() or [])]
    cursor.close()
    return result


# ─── Sectors ──────────────────────────────────────────────────────────────────

@router.get("/sectors")
async def get_sectors():
    try:
        with get_db() as conn:
            sectors = _rows(conn, "SELECT * FROM sectors ORDER BY ordem")
            residuos = _rows(conn, """
                SELECT sector_codigo, bmp_medio, ts_medio, vs_medio, chemical_cn_ratio, chemical_ch4_content
                FROM residuos
            """)

        by_sector: dict = defaultdict(list)
        for r in residuos:
            by_sector[r["sector_codigo"]].append(r)

        result = []
        for s in sectors:
            grupo = by_sector.get(s["codigo"], [])

            def _avg(key, g=grupo):
                vals = [float(r[key]) for r in g if r.get(key) is not None]
                return round(sum(vals) / len(vals), 2) if vals else None

            s_out = dict(s)
            s_out["num_residuos"] = len(grupo)
            s_out["avg_bmp"]         = _avg("bmp_medio")
            s_out["avg_ts"]          = _avg("ts_medio")
            s_out["avg_vs"]          = _avg("vs_medio")
            s_out["avg_cn_ratio"]    = _avg("chemical_cn_ratio")
            s_out["avg_ch4_content"] = _avg("chemical_ch4_content")
            result.append(s_out)

        return {"success": True, "count": len(result), "sectors": result}

    except Exception as e:
        logger.error(f"Error fetching sectors: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Subsectors ───────────────────────────────────────────────────────────────

@router.get("/subsectors")
async def get_subsectors(sector_codigo: Optional[str] = None):
    try:
        with get_db() as conn:
            if sector_codigo:
                subsectors = _rows(conn, "SELECT * FROM subsectors WHERE sector_codigo = %s", [sector_codigo])
            else:
                subsectors = _rows(conn, "SELECT * FROM subsectors")

            sectors = _rows(conn, "SELECT codigo, nome FROM sectors")
            sector_map = {s["codigo"]: s["nome"] for s in sectors}

            residuos = _rows(conn, "SELECT subsector_codigo FROM residuos WHERE subsector_codigo IS NOT NULL")

        subsector_count: dict = defaultdict(int)
        for r in residuos:
            subsector_count[r["subsector_codigo"]] += 1

        result = []
        for ss in sorted(subsectors, key=lambda x: (x.get("ordem") or 0)):
            ss_out = dict(ss)
            ss_out["sector_nome"]  = sector_map.get(ss["sector_codigo"], "")
            ss_out["num_residuos"] = subsector_count.get(ss["codigo"], 0)
            result.append(ss_out)

        return {"success": True, "count": len(result), "subsectors": result}

    except Exception as e:
        logger.error(f"Error fetching subsectors: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Residuos list ────────────────────────────────────────────────────────────

@router.get("/")
async def get_residuos(
    sector_codigo: Optional[str] = None,
    subsector_codigo: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
):
    try:
        conditions = ["1=1"]
        params: list = []
        if sector_codigo:
            conditions.append("r.sector_codigo = %s")
            params.append(sector_codigo)
        if subsector_codigo:
            conditions.append("r.subsector_codigo = %s")
            params.append(subsector_codigo)
        if search:
            conditions.append("r.nome ILIKE %s")
            params.append(f"%{search}%")

        where = " AND ".join(conditions)

        with get_db() as conn:
            all_residuos = _rows(conn, f"SELECT r.* FROM residuos r WHERE {where}", params)
            sectors      = _rows(conn, "SELECT codigo, nome, emoji, ordem FROM sectors")
            subsectors   = _rows(conn, "SELECT codigo, nome FROM subsectors")
            refs         = _rows(conn, """
                SELECT primary_residue, authors, publication_year, has_validated_params
                FROM scientific_references
            """)

        sector_map    = {s["codigo"]: s for s in sectors}
        subsector_map = {ss["codigo"]: ss["nome"] for ss in subsectors}

        ref_count: dict = defaultdict(int)
        ref_main:  dict = {}
        for ref in refs:
            rc = ref.get("primary_residue")
            if not rc:
                continue
            ref_count[rc] += 1
            year      = ref.get("year") or ref.get("publication_year")
            authors   = ref.get("authors", "")
            citation  = f"{authors} ({year})" if authors and year else ""
            validated = bool(ref.get("has_validated_params"))
            if rc not in ref_main or (validated and not ref_main[rc]["validated"]):
                ref_main[rc] = {"citation": citation, "validated": validated}

        all_residuos.sort(key=lambda r: (
            sector_map.get(r.get("sector_codigo", ""), {}).get("ordem") or 999,
            r.get("nome") or ""
        ))

        total = len(all_residuos)
        page  = all_residuos[offset: offset + limit]

        residuos_out = []
        for r in page:
            item = {k: (_to_float(v) if isinstance(v, (int, float)) else v) for k, v in r.items()}
            sc                  = r.get("sector_codigo", "")
            sector              = sector_map.get(sc, {})
            item["sector_nome"]     = sector.get("nome", "")
            item["sector_emoji"]    = sector.get("emoji", "")
            item["subsector_nome"]  = subsector_map.get(r.get("subsector_codigo", ""), "")
            item["reference_count"] = ref_count.get(r.get("codigo", ""), 0)
            item["main_reference"]  = ref_main.get(r.get("codigo", ""), {}).get("citation")
            residuos_out.append(item)

        return {"success": True, "count": len(residuos_out), "total": total,
                "limit": limit, "offset": offset, "residuos": residuos_out}

    except Exception as e:
        logger.error(f"Error fetching residuos: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── All references ───────────────────────────────────────────────────────────

@router.get("/references/all")
async def get_all_references(
    limit: int = Query(default=1000, le=5000),
    offset: int = Query(default=0, ge=0),
):
    try:
        with get_db() as conn:
            all_refs = _rows(conn, "SELECT * FROM scientific_references")
            residuos = _rows(conn, "SELECT id, codigo, nome, sector_codigo FROM residuos")
            sectors  = _rows(conn, "SELECT codigo, nome FROM sectors")

        residuo_by_codigo = {r["codigo"]: r for r in residuos}
        sector_map        = {s["codigo"]: s["nome"] for s in sectors}

        all_refs.sort(key=lambda r: (
            -(r.get("year") or r.get("publication_year") or 0),
            r.get("authors") or ""
        ))

        total = len(all_refs)
        page  = all_refs[offset: offset + limit]

        result = []
        for ref in page:
            residuo = residuo_by_codigo.get(ref.get("primary_residue", ""), {})
            sc      = residuo.get("sector_codigo", "")
            year    = ref.get("year") or ref.get("publication_year")
            authors = ref.get("authors") or "Unknown"
            citation = f"{authors} - {ref.get('title', '')}" if ref.get("title") else authors
            val = _to_float(ref.get("reported_value"))
            result.append({
                "id": ref.get("id"),
                "residuo_codigo":  ref.get("primary_residue"),
                "residuo_id":      residuo.get("id"),
                "residuo_nome":    residuo.get("nome"),
                "sector_codigo":   sc,
                "sector_nome":     sector_map.get(sc, ""),
                "parameter_type":  None,
                "citation":        citation,
                "authors":         ref.get("authors"),
                "title":           ref.get("title"),
                "journal":         ref.get("journal"),
                "year":            year,
                "volume":          None,
                "pages":           None,
                "doi":             ref.get("doi"),
                "url":             ref.get("url"),
                "reported_value":  val,
                "reported_unit":   ref.get("reported_unit"),
                "is_primary":      bool(ref.get("has_validated_params")),
                "validation_status": ref.get("validation_status"),
            })

        return {"success": True, "count": len(result), "total": total,
                "limit": limit, "offset": offset, "references": result}

    except Exception as e:
        logger.error(f"Error fetching all references: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Conversion factors ───────────────────────────────────────────────────────

@router.get("/conversion-factors/")
async def get_conversion_factors(category: Optional[str] = None):
    try:
        with get_db() as conn:
            if category:
                rows = _rows(conn, """
                    SELECT id, category, subcategory, factor_value, unit, literature_reference,
                           reference_url, real_data_validation, safety_margin_percent, final_factor, notes
                    FROM conversion_factors WHERE category = %s ORDER BY category, subcategory
                """, [category])
            else:
                rows = _rows(conn, """
                    SELECT id, category, subcategory, factor_value, unit, literature_reference,
                           reference_url, real_data_validation, safety_margin_percent, final_factor, notes
                    FROM conversion_factors ORDER BY category, subcategory
                """)

        factors = []
        for row in rows:
            item = dict(row)
            for key in ["factor_value", "safety_margin_percent", "final_factor"]:
                item[key] = _to_float(item.get(key))
            factors.append(item)

        return {"success": True, "count": len(factors), "factors": factors}

    except Exception as e:
        logger.error(f"Error fetching conversion factors: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# ─── Summary by sector ────────────────────────────────────────────────────────

@router.get("/summary/by-sector")
async def get_summary_by_sector():
    try:
        with get_db() as conn:
            sectors  = _rows(conn, "SELECT codigo, nome, emoji, ordem FROM sectors ORDER BY ordem")
            residuos = _rows(conn, """
                SELECT sector_codigo, bmp_medio, ts_medio, vs_medio,
                       chemical_cn_ratio, chemical_ch4_content, codigo
                FROM residuos
            """)
            refs = _rows(conn, "SELECT primary_residue FROM scientific_references")

        ref_count_by_residuo: dict = defaultdict(int)
        for ref in refs:
            if ref.get("primary_residue"):
                ref_count_by_residuo[ref["primary_residue"]] += 1

        by_sector: dict         = defaultdict(list)
        ref_count_by_sector: dict = defaultdict(int)
        for r in residuos:
            sc = r.get("sector_codigo", "")
            by_sector[sc].append(r)
            ref_count_by_sector[sc] += ref_count_by_residuo.get(r.get("codigo", ""), 0)

        summary = []
        for s in sectors:
            grupo = by_sector.get(s["codigo"], [])

            def _avg(key, g=grupo):
                vals = [float(r[key]) for r in g if r.get(key) is not None]
                return round(sum(vals) / len(vals), 2) if vals else None

            def _min(key, g=grupo):
                vals = [float(r[key]) for r in g if r.get(key) is not None]
                return round(min(vals), 2) if vals else None

            def _max(key, g=grupo):
                vals = [float(r[key]) for r in g if r.get(key) is not None]
                return round(max(vals), 2) if vals else None

            summary.append({
                "codigo": s["codigo"], "nome": s["nome"], "emoji": s.get("emoji"),
                "ordem": s.get("ordem"), "num_residuos": len(grupo),
                "avg_bmp": _avg("bmp_medio"), "min_bmp": _min("bmp_medio"), "max_bmp": _max("bmp_medio"),
                "avg_ts": _avg("ts_medio"), "avg_vs": _avg("vs_medio"),
                "avg_cn_ratio": _avg("chemical_cn_ratio"), "avg_ch4_content": _avg("chemical_ch4_content"),
                "total_references": ref_count_by_sector.get(s["codigo"], 0),
            })

        return {"success": True, "count": len(summary), "summary": summary}

    except Exception as e:
        logger.error(f"Error fetching sector summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# ─── Compare ──────────────────────────────────────────────────────────────────

@router.get("/compare")
async def compare_residuos(ids: str = Query(..., description="Comma-separated residue IDs")):
    try:
        id_list = [int(i.strip()) for i in ids.split(",")]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    if len(id_list) < 2:
        raise HTTPException(status_code=400, detail="At least 2 residue IDs required")
    if len(id_list) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 residues")

    try:
        with get_db() as conn:
            residuos = _rows(conn, """
                SELECT id, nome, sector_codigo, codigo, bmp_medio, ts_medio, vs_medio,
                       chemical_cn_ratio, chemical_ch4_content, fator_realista
                FROM residuos WHERE id = ANY(%s)
            """, [id_list])
            sectors = _rows(conn, "SELECT codigo, nome, emoji FROM sectors")
            refs    = _rows(conn, "SELECT primary_residue FROM scientific_references")

        if len(residuos) != len(id_list):
            raise HTTPException(status_code=404, detail="One or more residue IDs not found")

        sector_map = {s["codigo"]: s for s in sectors}
        ref_count: dict = defaultdict(int)
        for ref in refs:
            if ref.get("primary_residue"):
                ref_count[ref["primary_residue"]] += 1

        residuos_out = []
        for r in sorted(residuos, key=lambda x: float(x.get("bmp_medio") or 0), reverse=True):
            sc     = r.get("sector_codigo", "")
            sector = sector_map.get(sc, {})
            item   = {k: (_to_float(v) if isinstance(v, (int, float)) else v) for k, v in r.items()}
            item["sector_nome"]     = sector.get("nome", "")
            item["sector_emoji"]    = sector.get("emoji", "")
            item["reference_count"] = ref_count.get(r.get("codigo", ""), 0)
            residuos_out.append(item)

        return {"success": True, "count": len(residuos_out), "comparison": residuos_out}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error comparing residuos: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── References for one residue ───────────────────────────────────────────────

@router.get("/{residuo_id}/references")
async def get_residuo_references(residuo_id: int, parameter_type: Optional[str] = None):
    try:
        with get_db() as conn:
            residuos = _rows(conn, "SELECT nome, codigo FROM residuos WHERE id = %s", [residuo_id])
            if not residuos:
                raise HTTPException(status_code=404, detail="Residue not found")
            codigo = residuos[0]["codigo"]
            refs   = _rows(conn, "SELECT * FROM scientific_references WHERE primary_residue = %s", [codigo])

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error fetching references for residuo %s: %s", str(residuo_id).replace('\n', ' ').replace('\r', ' ')[:50], e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

    refs_sorted = sorted(refs, key=lambda r: -(r.get("year") or r.get("publication_year") or 0))
    references  = []
    for ref in refs_sorted:
        year    = ref.get("year") or ref.get("publication_year")
        authors = ref.get("authors") or "Unknown"
        title   = ref.get("title") or ""
        citation = f"{title} - {authors}" if title else authors
        references.append({
            "id": ref.get("id"), "parameter_type": None, "citation": citation,
            "authors": ref.get("authors"), "title": title, "journal": ref.get("journal"),
            "year": year, "volume": None, "pages": None,
            "doi": ref.get("doi"), "url": ref.get("url"),
            "reported_value": _to_float(ref.get("reported_value")),
            "reported_unit": ref.get("reported_unit"),
            "is_primary": bool(ref.get("has_validated_params")),
            "validation_status": ref.get("validation_status"),
        })

    return {"success": True, "residuo_name": residuos[0]["nome"], "count": len(references), "references": references}


# ─── Single residue ───────────────────────────────────────────────────────────

@router.get("/{residuo_id}")
async def get_residuo(residuo_id: int):
    try:
        with get_db() as conn:
            residuos = _rows(conn, "SELECT * FROM residuos WHERE id = %s", [residuo_id])
            if not residuos:
                raise HTTPException(status_code=404, detail="Residue not found")
            r = residuos[0]

            sectors = _rows(conn, "SELECT codigo, nome, nome_en, emoji FROM sectors WHERE codigo = %s",
                            [r.get("sector_codigo", "")])
            subsectors = _rows(conn, "SELECT nome FROM subsectors WHERE codigo = %s",
                               [r.get("subsector_codigo")]) if r.get("subsector_codigo") else []
            refs = _rows(conn, "SELECT * FROM scientific_references WHERE primary_residue = %s",
                         [r.get("codigo", "")])

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error fetching residuo %s: %s", str(residuo_id).replace('\n', ' ').replace('\r', ' ')[:50], e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

    residuo = {k: (_to_float(v) if isinstance(v, (int, float)) else v) for k, v in r.items()}
    if sectors:
        s = sectors[0]
        residuo["sector_nome"]    = s.get("nome", "")
        residuo["sector_nome_en"] = s.get("nome_en", "")
        residuo["sector_emoji"]   = s.get("emoji", "")
    else:
        residuo["sector_nome"] = residuo["sector_nome_en"] = residuo["sector_emoji"] = ""

    residuo["subsector_nome"] = subsectors[0]["nome"] if subsectors else ""

    refs_sorted = sorted(refs, key=lambda ref: -(ref.get("year") or ref.get("publication_year") or 0))
    references  = []
    refs_by_type: dict = {}
    for ref in refs_sorted:
        year    = ref.get("year") or ref.get("publication_year")
        authors = ref.get("authors") or "Unknown"
        title   = ref.get("title") or ""
        citation = f"{title} - {authors}" if title else authors
        ref_out = {
            "id": ref.get("id"), "parameter_type": None, "citation": citation,
            "authors": ref.get("authors"), "title": title, "journal": ref.get("journal"),
            "year": year, "volume": None, "pages": None,
            "doi": ref.get("doi"), "url": ref.get("url"),
            "reported_value": _to_float(ref.get("reported_value")),
            "reported_unit": ref.get("reported_unit"),
            "is_primary": bool(ref.get("has_validated_params")),
            "validation_status": ref.get("validation_status"),
        }
        references.append(ref_out)
        pt = ref_out["parameter_type"]
        refs_by_type.setdefault(pt, []).append(ref_out)

    residuo["references"]         = references
    residuo["references_by_type"] = refs_by_type
    residuo["total_references"]   = len(references)

    return {"success": True, "residuo": residuo}
