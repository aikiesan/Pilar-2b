"""Render a municipality dossier as a workbook or a PDF report.

Both renderers take what `municipality_dossier.collect()` returns and nothing
else, so the CLI export, the XLSX download and the PDF report always describe
the same municipality the same way.

The PDF's locator map is drawn from PostGIS geometry as vector paths — no tile
server, no API key, no network at render time, and it stays sharp at any zoom.
"""

from __future__ import annotations

import json
import unicodedata
from datetime import datetime, timezone
from io import BytesIO
from typing import Any, Iterable, Sequence

import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

SHEET_NAME_LIMIT = 31  # Excel's hard cap on sheet names.

# The workbook is a deliverable for Brazilian planners and researchers, so it is
# written in pt-BR. Each residue maps to the column prefix the municipalities
# table uses; not every residue carries every column (sewage has no biogas total,
# forestry has no biomass tonnage), and a missing column reads as "—", never 0.
RESIDUOS: tuple[tuple[str, str, str], ...] = (
    ("sugarcane", "Cana-de-açúcar", "Agrícola"),
    ("soybean", "Soja", "Agrícola"),
    ("corn", "Milho", "Agrícola"),
    ("coffee", "Café", "Agrícola"),
    ("citrus", "Citros", "Agrícola"),
    ("cattle", "Bovinos", "Pecuária"),
    ("swine", "Suínos", "Pecuária"),
    ("poultry", "Aves", "Pecuária"),
    ("aquaculture", "Aquicultura", "Pecuária"),
    ("rsu", "RSU — resíduos sólidos urbanos", "Urbano"),
    ("rpo", "RPO — resíduos de poda", "Urbano"),
    ("sewage", "Esgoto", "Urbano"),
    ("forestry", "Florestal", "Florestal"),
)

SETORES: tuple[tuple[str, str], ...] = (
    ("agricultural", "Agrícola"),
    ("livestock", "Pecuária"),
    ("urban", "Urbano"),
    ("forestry", "Florestal"),
)

HEADER_FILL = "FF1F7A4D"
HEADER_FONT = "FFFFFFFF"
BAND_FILL = "FFF2F7F4"

BRAND_GREEN = colors.HexColor("#1f7a4d")
BRAND_LIME = colors.HexColor("#8bc34a")
INK = colors.HexColor("#1a1a1a")
MUTED = colors.HexColor("#6b7280")
HAIRLINE = colors.HexColor("#d1d5db")

# The locator map box, in points.
MAP_W, MAP_H = 165 * mm, 110 * mm


def ascii_slug(name: str) -> str:
    """"Lençóis Paulista" -> "lencois_paulista", for filenames and headers.

    Content-Disposition is ASCII by default, so an accented filename either gets
    mangled or needs RFC 5987 encoding that older clients mishandle.
    """
    decomposed = unicodedata.normalize("NFKD", str(name))
    stripped = "".join(c for c in decomposed if not unicodedata.combining(c))
    return "".join(c if c.isalnum() else "_" for c in stripped.lower()).strip("_")


def _naive(value: Any) -> Any:
    """Excel has no timezone-aware datetime and openpyxl refuses one outright."""
    if isinstance(value, datetime) and value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def _num(value: Any) -> float | None:
    """A number, or None. Never 0 as a stand-in for absent — the two differ."""
    if value is None:
        return None
    try:
        out = float(value)
    except (TypeError, ValueError):
        return None
    return None if pd.isna(out) else out


def _sheet_resumo(who: dict, muni: dict) -> pd.DataFrame:
    """Identification and the headline figures, the one page most readers need."""
    rows = [
        ("IDENTIFICAÇÃO", None, None),
        ("Município", who.get("municipality_name"), None),
        ("Código IBGE", who.get("ibge_code"), None),
        ("UF", who.get("uf"), None),
        ("Região imediata", who.get("immediate_region"), None),
        ("Região intermediária", who.get("intermediate_region"), None),
        ("Área", _num(who.get("area_km2")), "km²"),
        ("População", _num(who.get("population")), f"hab. ({who.get('population_year') or '—'})"),
        ("Densidade demográfica", _num(muni.get("population_density")), "hab./km²"),
        (None, None, None),
        ("POTENCIAL DE BIOGÁS", None, None),
        ("Potencial total", _num(muni.get("total_biogas_m3_year")), "m³/ano"),
        ("Potencial diário", _num(muni.get("total_biogas_m3_day")), "m³/dia"),
        ("Classe de potencial", who.get("potential_category"), None),
        (None, None, None),
        ("ENERGIA E EMISSÕES", None, None),
        ("Energia potencial", _num(muni.get("energy_potential_mwh_year")), "MWh/ano"),
        ("Energia potencial", _num(muni.get("energy_potential_kwh_day")), "kWh/dia"),
        ("CO₂ evitado", _num(muni.get("co2_reduction_tons_year")), "t/ano"),
        (None, None, None),
        ("BIOMASSA", None, None),
        ("Biomassa total", _num(muni.get("total_biomass_tons_year")), "t/ano"),
        (None, None, None),
        ("METANO (CH₄)", None, None),
        ("CH₄ cenário Real", _num(muni.get("ch4_real_m3_year")), "m³/ano"),
        ("CH₄ cenário Ideal", _num(muni.get("ch4_ideal_m3_year")), "m³/ano"),
        (None, None, None),
        ("PROCEDÊNCIA", None, None),
        ("Confiança dos dados", who.get("data_confidence"), None),
        ("Extraído em (UTC)", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"), None),
        ("Fonte", "PILAR-2b", None),
    ]
    return pd.DataFrame(rows, columns=["Indicador", "Valor", "Unidade"])


def _sheet_setores(muni: dict) -> pd.DataFrame:
    """Biogas, biomass and both CH4 scenarios per sector, with each one's share."""
    rows = []
    for key, label in SETORES:
        rows.append(
            {
                "Setor": label,
                "Biomassa (t/ano)": _num(muni.get(f"{key}_biomass_tons_year")),
                "Biogás (m³/ano)": _num(muni.get(f"{key}_biogas_m3_year")),
                "CH₄ Real (m³/ano)": _num(muni.get(f"ch4_real_{key}_m3_year")),
                "CH₄ Ideal (m³/ano)": _num(muni.get(f"ch4_ideal_{key}_m3_year")),
            }
        )
    frame = pd.DataFrame(rows)
    total = frame["Biogás (m³/ano)"].sum(skipna=True)
    frame["% do biogás"] = (
        frame["Biogás (m³/ano)"] / total if total else None
    )
    total_row = {
        "Setor": "TOTAL",
        "Biomassa (t/ano)": frame["Biomassa (t/ano)"].sum(skipna=True),
        "Biogás (m³/ano)": total,
        "CH₄ Real (m³/ano)": frame["CH₄ Real (m³/ano)"].sum(skipna=True),
        "CH₄ Ideal (m³/ano)": frame["CH₄ Ideal (m³/ano)"].sum(skipna=True),
        "% do biogás": 1.0 if total else None,
    }
    return pd.concat([frame, pd.DataFrame([total_row])], ignore_index=True)


def _coalesce(*values: Any) -> float | None:
    """First value that is actually present.

    Deliberately not `a or b`: a measured zero is falsy, and 0 t/year of
    aquaculture residue is a finding, not a missing reading. Conflating the two
    is the bug this function exists to prevent.
    """
    for value in values:
        number = _num(value)
        if number is not None:
            return number
    return None


def _sheet_residuos(muni: dict, streams: list[dict]) -> pd.DataFrame:
    """One row per residue, joining the municipality columns to the SP stream table.

    The stream table carries energy and the conversion factor actually applied;
    the municipality columns carry the CH4 scenarios. Neither has both, so the
    sheet is the join — which is the whole reason this export exists.
    """
    by_stream = {str(r.get("residue_stream") or "").lower(): r for r in streams}
    rows = []
    for key, label, setor in RESIDUOS:
        stream = by_stream.get(key, {})
        rows.append(
            {
                "Resíduo": label,
                "Setor": setor,
                "Biomassa (t/ano)": _coalesce(
                    muni.get(f"{key}_biomass_tons_year"), stream.get("residue_tons_yr")
                ),
                "Biogás (m³/ano)": _coalesce(
                    muni.get(f"{key}_biogas_m3_year"), stream.get("biogas_m3_yr")
                ),
                "CH₄ Real (m³/ano)": _num(muni.get(f"ch4_real_{key}_m3_year")),
                "CH₄ Ideal (m³/ano)": _num(muni.get(f"ch4_ideal_{key}_m3_year")),
                "Energia (MWh/ano)": _num(stream.get("energy_mwh_yr")),
                "Fator de conversão": _num(stream.get("conversion_factor")),
                "Unidade do fator": stream.get("cf_unit"),
            }
        )
    frame = pd.DataFrame(rows)
    total = frame["Biogás (m³/ano)"].sum(skipna=True)
    frame["% do biogás"] = frame["Biogás (m³/ano)"] / total if total else None
    return frame.sort_values("Biogás (m³/ano)", ascending=False, na_position="last")


def _sheet_series(series: list[dict]) -> pd.DataFrame:
    """The time series, tidied and sorted — year, variable, value, unit, source."""
    if not series:
        return pd.DataFrame({"(sem séries temporais para este município)": []})
    frame = pd.DataFrame(series)
    keep = {
        "year": "Ano",
        "variable": "Variável",
        "value": "Valor",
        "unit": "Unidade",
        "quality": "Qualidade",
        "source_id": "Fonte",
    }
    frame = frame[[c for c in keep if c in frame.columns]].rename(columns=keep)
    return frame.sort_values(["Fonte", "Variável", "Ano"], na_position="last")


def _sheet_infra(features: list[dict]) -> pd.DataFrame:
    if not features:
        return pd.DataFrame({"(nenhuma infraestrutura registrada neste município)": []})
    frame = pd.DataFrame(features)
    keep = {"layer_id": "Camada", "name": "Nome", "source_id": "Fonte", "attributes": "Atributos"}
    frame = frame[[c for c in keep if c in frame.columns]].rename(columns=keep)
    if "Atributos" in frame.columns:
        frame["Atributos"] = frame["Atributos"].map(
            lambda v: json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else v
        )
    return frame


def _sheet_fontes(sections: dict[str, list[dict]], who: dict) -> pd.DataFrame:
    """Where the numbers came from, and what is missing — stated, not implied."""
    rows: list[tuple[str, Any]] = [("PROCEDÊNCIA DOS DADOS", None)]
    for record in sections.get("biomass_provenance") or []:
        label = record.get("residue") or record.get("field") or record.get("column_name") or "—"
        rows.append((str(label), record.get("source") or record.get("source_id") or "—"))

    sources = sorted({str(r.get("source_id")) for r in sections.get("timeseries") or [] if r.get("source_id")})
    if sources:
        rows += [(None, None), ("FONTES DAS SÉRIES TEMPORAIS", None)]
        rows += [(s, None) for s in sources]

    typology = (sections.get("typology") or [{}])[0]
    rows += [(None, None), ("TIPOLOGIA / RELAÇÃO C:N", None)]
    rows.append(("C:N média aritmética (cn_molar)", typology.get("cn_molar")))
    rows.append(("C:N balanço N-aditivo (cn_harm)", typology.get("cn_harm")))
    if typology.get("cn_harm") is None:
        # Say it outright. A blank cell invites the reader to assume zero.
        rows.append(
            (
                "Observação",
                "cn_harm ainda não carregado nesta base — a coluna existe "
                "(migração 031) mas o snapshot do dossiê não foi aplicado.",
            )
        )

    rows += [
        (None, None),
        ("OBSERVAÇÕES", None),
        ("Natureza dos números", "Potencial modelado, não produção medida."),
        ("Confiança dos dados", who.get("data_confidence")),
    ]
    return pd.DataFrame(rows, columns=["Item", "Detalhe"])


def _style(writer, sheet_name: str, frame: pd.DataFrame, widths: Sequence[int] | None = None) -> None:
    """Header band, frozen top row, sensible widths and thousands separators."""
    from openpyxl.styles import Alignment, Font, PatternFill

    ws = writer.sheets[sheet_name]
    fill = PatternFill("solid", fgColor=HEADER_FILL)
    for cell in ws[1]:
        cell.fill = fill
        cell.font = Font(bold=True, color=HEADER_FONT)
        cell.alignment = Alignment(vertical="center", wrap_text=True)
    ws.freeze_panes = "A2"
    ws.row_dimensions[1].height = 28

    for index, column in enumerate(frame.columns, start=1):
        letter = ws.cell(row=1, column=index).column_letter
        if widths and index <= len(widths):
            ws.column_dimensions[letter].width = widths[index - 1]
        else:
            longest = max([len(str(column))] + [len(str(v)) for v in frame[column].head(60)])
            ws.column_dimensions[letter].width = min(max(longest + 2, 12), 46)

        if "%" in str(column):
            number_format = "0.0%"
        elif frame[column].dtype.kind in "fi":
            number_format = "#,##0.00" if "Fator" in str(column) else "#,##0"
        else:
            continue
        for row in range(2, ws.max_row + 1):
            ws.cell(row=row, column=index).number_format = number_format

    # Bold the section captions and the TOTAL line — they orient the reader.
    for row in range(2, ws.max_row + 1):
        first = ws.cell(row=row, column=1).value
        if isinstance(first, str) and (first.isupper() and len(first) > 3):
            ws.cell(row=row, column=1).font = Font(bold=True, color="FF1F7A4D")


def build_workbook(sections: dict[str, list[dict]], who: dict) -> bytes:
    """The dossier as a curated pt-BR workbook: six sheets, no raw table dumps.

    Deliberately not one sheet per database table. The municipalities row alone is
    98 columns wide and means nothing to a reader; the value is in reshaping it
    into sector and residue tables and joining the SP stream data onto it.
    """
    muni = (sections.get("municipality") or [{}])[0]
    sheets: list[tuple[str, pd.DataFrame, Sequence[int] | None]] = [
        ("Resumo", _sheet_resumo(who, muni), (34, 20, 22)),
        ("Por setor", _sheet_setores(muni), (16, 20, 20, 20, 20, 14)),
        ("Por resíduo", _sheet_residuos(muni, sections.get("residue_streams") or []), None),
        ("Séries temporais", _sheet_series(sections.get("timeseries") or []), (10, 30, 16, 14, 14, 18)),
        ("Infraestrutura", _sheet_infra(sections.get("infrastructure") or []), (22, 34, 16, 50)),
        ("Fontes e notas", _sheet_fontes(sections, who), (40, 62)),
    ]

    buffer = BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        for name, frame, widths in sheets:
            safe = frame.map(_naive)
            safe.to_excel(writer, sheet_name=name[:SHEET_NAME_LIMIT], index=False)
            _style(writer, name[:SHEET_NAME_LIMIT], safe, widths)
    return buffer.getvalue()


# ── PDF ──────────────────────────────────────────────────────────────────────


def _styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "title", parent=base["Title"], fontSize=22, leading=26, textColor=BRAND_GREEN,
            alignment=0, spaceAfter=2,
        ),
        "subtitle": ParagraphStyle(
            "subtitle", parent=base["Normal"], fontSize=10.5, leading=14, textColor=MUTED,
        ),
        "h2": ParagraphStyle(
            "h2", parent=base["Heading2"], fontSize=13, leading=16, textColor=BRAND_GREEN,
            spaceBefore=12, spaceAfter=6,
        ),
        "body": ParagraphStyle("body", parent=base["Normal"], fontSize=9.5, leading=13, textColor=INK),
        "note": ParagraphStyle("note", parent=base["Normal"], fontSize=8, leading=11, textColor=MUTED),
    }


def _ring(geometry: dict | None) -> list[list[Sequence[float]]]:
    """Flatten a GeoJSON Polygon/MultiPolygon into a list of exterior rings."""
    if not geometry:
        return []
    kind, coords = geometry.get("type"), geometry.get("coordinates") or []
    if kind == "Polygon":
        return [coords[0]] if coords else []
    if kind == "MultiPolygon":
        return [poly[0] for poly in coords if poly]
    return []


def _fit(rings: Iterable[Sequence[Sequence[float]]], width: float, height: float):
    """Return a lon/lat -> canvas projector that fits `rings` into the box.

    A plain equirectangular fit with one shared scale, so the state does not come
    out stretched. São Paulo at this size does not warrant a real projection.
    """
    xs = [p[0] for r in rings for p in r]
    ys = [p[1] for r in rings for p in r]
    if not xs or not ys:
        return None
    min_x, max_x, min_y, max_y = min(xs), max(xs), min(ys), max(ys)
    span_x = (max_x - min_x) or 1e-9
    span_y = (max_y - min_y) or 1e-9
    scale = min(width / span_x, height / span_y) * 0.92
    off_x = (width - span_x * scale) / 2
    off_y = (height - span_y * scale) / 2

    def project(lon: float, lat: float) -> tuple[float, float]:
        return (off_x + (lon - min_x) * scale, off_y + (lat - min_y) * scale)

    return project


def _locator_map(state_geojson: str | None, muni_geojson: str | None, uf: str):
    """The municipality picked out inside its state outline, as vector paths."""
    from reportlab.graphics.shapes import Drawing, Polygon, String

    drawing = Drawing(MAP_W, MAP_H)
    state = json.loads(state_geojson) if state_geojson else None
    muni = json.loads(muni_geojson) if muni_geojson else None

    state_rings = _ring(state)
    muni_rings = _ring(muni)
    project = _fit(state_rings or muni_rings, MAP_W, MAP_H)
    if project is None:
        drawing.add(String(8, MAP_H / 2, "Geometry unavailable", fontSize=9, fillColor=MUTED))
        return drawing

    for ring in state_rings:
        drawing.add(
            Polygon(
                [c for p in ring for c in project(p[0], p[1])],
                fillColor=colors.HexColor("#eef2f0"),
                strokeColor=HAIRLINE,
                strokeWidth=0.6,
            )
        )
    for ring in muni_rings:
        drawing.add(
            Polygon(
                [c for p in ring for c in project(p[0], p[1])],
                fillColor=BRAND_LIME,
                strokeColor=BRAND_GREEN,
                strokeWidth=1.1,
            )
        )
    drawing.add(String(4, 4, f"Location within {uf}", fontSize=7.5, fillColor=MUTED))
    return drawing


def _fmt(value: Any, digits: int = 0) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return "—"
    if isinstance(value, (int, float)):
        return f"{float(value):,.{digits}f}".replace(",", " ")
    return str(value)


def _kv_table(rows: list[tuple[str, str]], widths=(58 * mm, 42 * mm)) -> Table:
    table = Table(rows, colWidths=list(widths), hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("TEXTCOLOR", (0, 0), (0, -1), MUTED),
                ("TEXTCOLOR", (1, 0), (1, -1), INK),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("LINEBELOW", (0, 0), (-1, -2), 0.25, HAIRLINE),
            ]
        )
    )
    return table


def _data_table(header: Sequence[str], body: Sequence[Sequence[Any]], widths) -> Table:
    table = Table([list(header)] + [list(r) for r in body], colWidths=list(widths), hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BRAND_GREEN),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7faf8")]),
                ("GRID", (0, 0), (-1, -1), 0.25, HAIRLINE),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def build_pdf(
    sections: dict[str, list[dict]],
    who: dict,
    muni_geojson: str | None = None,
    state_geojson: str | None = None,
) -> bytes:
    """A two-page municipal report: headline figures, locator map, residue detail."""
    style = _styles()
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title=f"PILAR-2b — {who.get('municipality_name')}",
        author="PILAR-2b",
    )

    muni = (sections.get("municipality") or [{}])[0]
    story: list[Any] = []

    story.append(Paragraph(str(who.get("municipality_name", "—")), style["title"]))
    story.append(
        Paragraph(
            f"{who.get('uf')} · IBGE {who.get('ibge_code')} · "
            f"{who.get('immediate_region')} / {who.get('intermediate_region')}",
            style["subtitle"],
        )
    )
    story.append(Spacer(1, 10))

    headline = [
        ("Total biogas potential", f"{_fmt(muni.get('total_biogas_m3_year'))} m³/year"),
        ("Energy potential", f"{_fmt(muni.get('energy_potential_mwh_year'))} MWh/year"),
        ("CO₂ avoided", f"{_fmt(muni.get('co2_reduction_tons_year'))} t/year"),
        ("Total biomass", f"{_fmt(muni.get('total_biomass_tons_year'))} t/year"),
        ("Potential category", str(who.get("potential_category") or "—")),
        ("Population", f"{_fmt(who.get('population'))} ({_fmt(who.get('population_year'))})"),
        ("Area", f"{_fmt(who.get('area_km2'), 1)} km²"),
        ("Data confidence", str(who.get("data_confidence") or "—")),
    ]
    story.append(_kv_table(headline))
    story.append(Spacer(1, 12))

    story.append(Paragraph("Location", style["h2"]))
    story.append(_locator_map(state_geojson, muni_geojson, str(who.get("uf") or "")))

    # ── Sector breakdown ─────────────────────────────────────────────────────
    sectors = [
        ("Agricultural", muni.get("agricultural_biogas_m3_year")),
        ("Livestock", muni.get("livestock_biogas_m3_year")),
        ("Urban", muni.get("urban_biogas_m3_year")),
        ("Forestry", muni.get("forestry_biogas_m3_year")),
    ]
    total = sum(float(v or 0) for _, v in sectors) or 1.0
    story.append(PageBreak())
    story.append(Paragraph("Biogas potential by sector", style["h2"]))
    story.append(
        _data_table(
            ["Sector", "m³/year", "share"],
            [(n, _fmt(v), f"{100 * float(v or 0) / total:.1f}%") for n, v in sectors],
            widths=(70 * mm, 55 * mm, 25 * mm),
        )
    )
    story.append(Spacer(1, 12))

    # ── Residue streams ──────────────────────────────────────────────────────
    streams = sections.get("residue_streams") or []
    if streams:
        ordered = sorted(streams, key=lambda r: float(r.get("biogas_m3_yr") or 0), reverse=True)
        story.append(Paragraph("Residue streams", style["h2"]))
        story.append(
            _data_table(
                ["Stream", "Sector", "t/year", "m³ biogas/year", "MWh/year"],
                [
                    (
                        str(r.get("residue_stream_pt") or r.get("residue_stream") or "—"),
                        str(r.get("sector_pt") or r.get("sector") or "—"),
                        _fmt(r.get("residue_tons_yr")),
                        _fmt(r.get("biogas_m3_yr")),
                        _fmt(r.get("energy_mwh_yr")),
                    )
                    for r in ordered
                ],
                widths=(38 * mm, 30 * mm, 30 * mm, 38 * mm, 28 * mm),
            )
        )
        story.append(Spacer(1, 10))

    # ── Provenance ───────────────────────────────────────────────────────────
    # A report that cannot say where its numbers came from is not much use in a
    # planning meeting, which is where these are meant to be read.
    provenance = sections.get("biomass_provenance") or []
    series = sections.get("timeseries") or []
    sources = sorted({str(r.get("source_id")) for r in series if r.get("source_id")})
    if provenance or sources:
        bits = []
        if sources:
            bits.append(f"Time series sources: {', '.join(sources)}.")
        if provenance:
            bits.append(f"{len(provenance)} biomass provenance record(s) held.")
        story.append(
            KeepTogether([Paragraph("Provenance", style["h2"]), Paragraph(" ".join(bits), style["body"])])
        )

    story.append(Spacer(1, 14))
    story.append(
        Paragraph(
            f"Generated by PILAR-2b on "
            f"{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}. "
            "Figures are modelled potential, not measured production.",
            style["note"],
        )
    )

    doc.build(story)
    return buffer.getvalue()
