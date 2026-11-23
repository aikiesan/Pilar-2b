"""/analyses: registry analyses, served only to who may see them.

Visibility is decided in the database by `visible_analyses_sql`; this module
never re-implements the rule. Raw values (`analysis_values`) are never read.
Nothing here is cached by a shared proxy: every response, errors included,
carries `Cache-Control: private, no-store`, because who sees what depends on
who is asking.
"""

import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from psycopg2.extras import RealDictCursor

from app.core.database import get_db
from app.middleware.auth import optional_auth
from app.models.auth import UserProfile
from app.services.analysis_access import visible_analyses_sql

router = APIRouter()

NO_STORE = {"Cache-Control": "private, no-store"}
_ID_RE = re.compile(r"[a-z0-9_]{1,40}")
_CELLS = 9


def _not_found() -> HTTPException:
    # One body for "missing", "hidden" and "malformed", so the status and the
    # JSON never tell them apart.
    return HTTPException(status_code=404, detail="Analysis not found", headers=NO_STORE)


def _pair(row: dict, key: str) -> dict:
    return {"pt": row[f"{key}_pt"], "en": row[f"{key}_en"]}


def _meta(row: dict) -> dict:
    return {
        "id": row["id"],
        "title": _pair(row, "title"),
        "question": _pair(row, "question"),
        "source": _pair(row, "source"),
        "x_label": _pair(row, "x_label"),
        "y_label": _pair(row, "y_label"),
        "answer_cell": row["answer_cell"],
        # Which axis reads "closer is stronger": the legend needs it to label the
        # rows. The methods and the values stay on the server.
        "x_invert": bool(row["x_invert"]),
        "y_invert": bool(row["y_invert"]),
        "layers": list(row["layers"]),
        "uf_prefixes": list(row["uf_prefixes"]),
    }


@router.get("")
def list_analyses(response: Response, user: Optional[UserProfile] = Depends(optional_auth)) -> dict:
    response.headers.update(NO_STORE)
    sql, params = visible_analyses_sql(user)
    with get_db() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cursor.execute(sql, params)
            rows = cursor.fetchall()
        finally:
            cursor.close()
    return {"analyses": [_meta(r) for r in rows]}


@router.get("/{analysis_id}")
def get_analysis(
    analysis_id: str,
    response: Response,
    user: Optional[UserProfile] = Depends(optional_auth),
) -> dict:
    # Checked before any query: a malformed id never reaches the database.
    if not _ID_RE.fullmatch(analysis_id):
        raise _not_found()
    response.headers.update(NO_STORE)
    sql, params = visible_analyses_sql(user, analysis_id=analysis_id)
    with get_db() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cursor.execute(sql, params)
            row = cursor.fetchone()
            if row is None:
                raise _not_found()
            prefixes = list(row["uf_prefixes"])
            cursor.execute(
                "SELECT ibge_code, cell FROM analysis_classes WHERE analysis_id = %s",
                (analysis_id,),
            )
            classes = cursor.fetchall()
            cursor.execute(
                "SELECT uf_prefix, axis, b1, b2 FROM analysis_breaks WHERE analysis_id = %s",
                (analysis_id,),
            )
            break_rows = cursor.fetchall()
        finally:
            cursor.close()

    cells = {str(c["ibge_code"]): c["cell"] for c in classes}
    counts = {uf: [0] * _CELLS for uf in prefixes}
    no_data = {uf: 0 for uf in prefixes}
    for code, cell in cells.items():
        uf = code[:2]
        if uf not in counts:
            continue
        if cell is None:
            no_data[uf] += 1
        else:
            counts[uf][cell] += 1

    breaks: dict = {uf: {"x": None, "y": None} for uf in prefixes}
    for b in break_rows:
        uf = str(b["uf_prefix"])
        if uf in breaks and b["b1"] is not None and b["b2"] is not None:
            breaks[uf][b["axis"]] = [b["b1"], b["b2"]]

    return {
        "id": row["id"],
        "cells": cells,
        "breaks": breaks,
        "counts": counts,
        "no_data": no_data,
    }
