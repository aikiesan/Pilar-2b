"""
SNIS — Sistema Nacional de Informações sobre Saneamento (Consolidado Município).

Supplies the urban-waste and sewage inputs the platform has never had: before
this, `rsu_/rpo_/urban_biogas_m3_year` were FDE *outputs* with no measured
source behind them anywhere in the schema.

Raw snapshots (one CSV per year, exported from the SNIS série histórica):

    data/raw/snis/<year>_SNIS_ConsolidadoMunicipio.csv     2008-2022

    python -m ingest.runner run snis --year 2022

WHAT SNIS IS, AND WHAT IT IS NOT
--------------------------------
SNIS is a municipal *management and billing* survey, filled in voluntarily by
service providers. It is not a gravimetric or laboratory characterisation. Two
consequences drive this module's design:

  * It measures **collected tonnage** (RDO/RPU), not composition. There is no
    "organic" column, and SNIS's own selective-collection indicators
    (IN031_RS/IN033_RS) explicitly exclude organic matter.
  * It contains **no sludge ("lodo") column at all** — verified by scanning all
    658 headers.

Organic mass and sewage sludge are therefore modelled downstream from these
measured inputs (CO119 and ES006) and stored with quality='estimated'. This
module promotes ONLY what SNIS actually measured. See
backend/scripts/derive_snis_estimates.py.

REPORTING IS VOLUNTARY AND SPARSE — BLANK IS NOT ZERO
-----------------------------------------------------
Measured 2026-07-16: only **1,320 of 5,570 municipalities (24%)** report CO111
in 2022, and just 225 (4%) in 2008. Those reporters do cover ~72% of the
population — the big cities report, the small ones do not.

A blank cell therefore means "did not report", NOT "generates no waste". Every
municipality generates household waste; writing 0 for the missing 76% would
assert that three quarters of Brazil produces none, and that claim would flow
straight into the biogas potential as a national map of false zeros. Blanks are
loaded as NULL and simply absent from municipality_timeseries. National coverage
for urban waste has to come from a population-based model (calibrated against
the 24% that DO report), not from filling blanks with zero.

THE TRAPS

1. UTF-16-LE, ';'-delimited, Brazilian number format ('8.000,00' -> 8000.0).
   A naive utf-8/latin-1 read yields NUL-interleaved mojibake.

2. A `TOTAL da AMOSTRA:` SUMMARY ROW sits in every file, carrying the national
   aggregate (POP_TOT = 203,080,756 in 2022 — Brazil's whole population in one
   row). Ingesting it would double every national sum. It is excluded by
   requiring a numeric municipality code; _sample_total_gate then USES it as
   SNIS's own published total to validate our parse against.

3. THE KEY COLUMN CHANGES MID-SERIES. `Código do IBGE` (7-digit) is EMPTY for
   2008-2018 and only appears from ~2019. `Código do Município` (6-digit) is
   populated in every year. So the 6-digit code is the key, resolved to the
   7-digit ibge_code via IBGE's check-digit rule plus a 9-entry exception table
   (see _to_ibge_code) — verified to key 100% of rows in every year with zero
   unmatched.

4. THREE-LEVEL AGGREGATION. CO108+CO109+CO110 = CO111; CO112+CO113+CO114 =
   CO115; CO116+CO117+CO118 = CO119 = CO111 + CO115. Only the totals are
   promoted; _aggregation_identity_gate asserts CO119 = CO111 + CO115 so the
   relationship is proven rather than assumed.

5. SCHEMA DRIFT IS BENIGN: 2008-2021 are identical at 583 columns; 2022 adds 75
   and removes none. Indicators are selected BY CODE, so new columns are ignored
   and absent ones are tolerated.
"""

from __future__ import annotations

import csv
import io
from pathlib import Path

import pandas as pd

from ingest.contract import IngestContext, SourceSpec
from ingest.gates import GateResult, run_standard_battery

RAW_SUBDIR = "snis"
FILENAME = "{year}_SNIS_ConsolidadoMunicipio.csv"
ENCODING = "utf-16-le"
DELIMITER = ";"

# SNIS indicator code -> (variable, unit). Curated: 12 of 658 columns.
# UNITS ARE AS PUBLISHED IN THE SNIS GLOSSARY — do not guess. Quantities of
# solid waste are toneladas/ano; sewage volumes are 1.000 m³/ano.
INDICATORS: dict[str, tuple[str, str]] = {
    # Solid waste actually collected (the measured biogas input).
    "CO111": ("rdo_coletado", "t"),  # total household waste, all agents
    "CO115": ("rpu_coletado", "t"),  # total public waste, all agents
    "CO119": ("rdo_rpu_coletado", "t"),  # total of both — CO111 + CO115
    # Selective collection and recovered dry recyclables. NOT biogas feedstock
    # (they are the non-organic fraction), but they bound what is left in RDO.
    "CS026": ("coleta_seletiva", "t"),
    "CS009": ("reciclaveis_total", "t"),
    "CS010": ("reciclaveis_papel", "t"),
    "CS011": ("reciclaveis_plastico", "t"),
    "CS012": ("reciclaveis_metal", "t"),
    "CS013": ("reciclaveis_vidro", "t"),
    # Sewage — ES006 is the input the sludge model needs.
    "ES005": ("esgoto_coletado", "mil_m3"),
    "ES006": ("esgoto_tratado", "mil_m3"),
    # Population as SNIS records it (IBGE-sourced). The platform's authoritative
    # population should come from IBGE directly; this is kept for the per-capita
    # rate that calibrates the waste model, and to derive `porte`.
    "POP_TOT": ("populacao_total", "inhabitants"),
    "POP_URB": ("populacao_urbana", "inhabitants"),
}

UNIT_BY_VARIABLE: dict[str, str] = {v: u for v, u in INDICATORS.values()}

# Municipality codes whose 7th digit is NOT the computed check digit. Verified
# against the national spine 2026-07-16: the rule reproduces 5,562 of 5,571
# codes; these nine are IBGE's own exceptions. Without them the mapping would
# silently mis-key nine municipalities — the exact class of quiet error this
# codebase keeps getting bitten by.
CHECK_DIGIT_EXCEPTIONS: dict[str, str] = {
    "220191": "2201919",  # Bom Princípio do Piauí/PI
    "220198": "2201988",  # Brejo do Piauí/PI
    "220225": "2202251",  # Canavieira/PI
    "261153": "2611533",  # Quixaba/PE
    "311783": "3117836",  # Cônego Marinho/MG
    "315213": "3152131",  # Ponto Chique/MG
    "430587": "4305871",  # Coronel Barros/RS
    "520393": "5203939",  # Buriti de Goiás/GO
    "520396": "5203962",  # Buritinópolis/GO
}

# (year, ibge_code) pairs where SNIS itself publishes CO119 != CO111 + CO115.
# A full sweep of 2008-2022 (2026-07-16) found exactly 15 across ~15,000
# reporting municipality-years (0.1%) — the identity otherwise holds perfectly,
# which is what proves we read the aggregation correctly.
#
# These are data-entry errors in SNIS, and some are severe: Presidente
# Prudente/SP 2009 reports CO111=1,416 against CO119=72,468; Araguapaz/GO 2010
# reports CO119=1,000 against parts summing to 4,000. We cannot know which
# figure the municipality meant, so all three are stored AS PUBLISHED and the
# disagreement is preserved rather than silently reconciled — inventing the
# "right" one would put a number in the database that SNIS never said.
KNOWN_IDENTITY_ANOMALIES: set[tuple[int, str]] = {
    (2008, "3126406"),  # Fortuna de Minas/MG — CO119 200 vs parts 180
    (2008, "2408003"),  # Mossoró/RN — CO119 72,090 vs parts 34,958
    (2008, "4208203"),  # Itajaí/SC — CO119 54,078 vs parts 3,983
    (2009, "2110005"),  # Santa Luzia/MA — CO119 6,740 vs parts 0
    (2009, "3151800"),  # Poços de Caldas/MG — CO119 45,816 vs parts 46,536
    (2009, "3304201"),  # Resende/RJ — CO119 42,277 vs parts 42,856
    (2009, "3541406"),  # Presidente Prudente/SP — CO119 72,468 vs parts 1,416
    (2009, "3548906"),  # São Carlos/SP — CO119 61,786 vs parts 63,030
    (2009, "3555307"),  # Turmalina/SP — CO119 1,657 vs parts 492
    (2010, "3201902"),  # Domingos Martins/ES — CO119 4,778 vs parts 4,838
    (2010, "5202155"),  # Araguapaz/GO — CO119 1,000 vs parts 4,000
    (2010, "2404853"),  # Itajá/RN — CO119 643 vs parts 816
    (2014, "4322541"),  # Vale Real/RS — CO119 250 vs parts 6,000
    (2021, "5006606"),  # Ponta Porã/MS — CO119 30,259 vs parts 31,336
    (2021, "3531902"),  # Morro Agudo/SP — CO119 8,884 vs parts 8,666
}

SPEC = SourceSpec(
    source_id="snis",
    name="SNIS — solid waste and sewage indicators by municipality",
    key_column="ibge_code",
    required_columns={
        "ibge_code": "str",
        "populacao_total": "float",
    },
    value_bounds={
        # Largest municipality (São Paulo) is ~11.5M; headroom for growth.
        "populacao_total": (0, 25_000_000),
        "populacao_urbana": (0, 25_000_000),
        # São Paulo collects ~4M t/yr of RDO; 20M is generous headroom and still
        # catches a unit slip (e.g. kg reported as t).
        "rdo_coletado": (0, 20_000_000),
        "rpu_coletado": (0, 20_000_000),
        "rdo_rpu_coletado": (0, 30_000_000),
        "esgoto_tratado": (0, 5_000_000),
        "esgoto_coletado": (0, 5_000_000),
    },
    # SNIS reporting is voluntary: the coverage gate (row count per UF ==
    # official municipality count) cannot apply. scope_ufs=() with the gate
    # skipped via a non-municipal key would lose the ibge_code validation, so
    # coverage is instead reported by _reporting_coverage_gate below, which
    # measures participation rather than demanding completeness.
    aggregation_tolerance_pct=1.0,
)


def _check_digit(six: str) -> str:
    """IBGE's 7th-digit rule: weights 1,2,1,2,1,2 over the first six digits,
    summing the DIGITS of each product, then (10 - sum mod 10) mod 10."""
    total = 0
    for digit, weight in zip(six, (1, 2, 1, 2, 1, 2)):
        product = int(digit) * weight
        total += product // 10 + product % 10
    return str((10 - total % 10) % 10)


def _to_ibge_code(six: str) -> str | None:
    """6-digit SNIS municipality code -> 7-digit IBGE code.

    SNIS ships the 6-digit form in every year, and the 7-digit `Código do IBGE`
    column only from ~2019 — so this is the only key that spans 2008-2022.
    """
    six = (six or "").strip()
    if len(six) != 6 or not six.isdigit():
        return None
    if six in CHECK_DIGIT_EXCEPTIONS:
        return CHECK_DIGIT_EXCEPTIONS[six]
    return six + _check_digit(six)


def _parse_number(raw: str | None) -> float | None:
    """Brazilian format -> float. '' is NOT reported (None), never zero."""
    if raw is None:
        return None
    text = raw.strip()
    if not text:
        return None
    text = text.replace(".", "").replace(",", ".")
    try:
        return float(text)
    except ValueError:
        return None


def _code_of(header: str) -> str:
    """'CO111 - Quantidade total de RDO...' -> 'CO111'. Selecting by code (not
    by label) is what makes the 583/658-column drift a non-event."""
    return header.split(" - ")[0].strip()


def fetch(year: int, raw_dir: Path) -> Path:
    snapshot = Path(raw_dir) / RAW_SUBDIR / FILENAME.format(year=year)
    if not snapshot.exists():
        raise FileNotFoundError(
            f"SNIS snapshot missing: {snapshot}\n"
            "Export 'Consolidado por Município' for this year from "
            "http://app4.mdr.gov.br/serieHistorica/ , save it as the filename above, "
            "and record the retrieval date in docs/data/METADATA.json."
        )
    return snapshot


def _read_rows(snapshot: Path) -> tuple[list[str], list[list[str]]]:
    with io.open(snapshot, encoding=ENCODING, newline="") as fh:
        reader = csv.reader(fh, delimiter=DELIMITER)
        header = [h.strip() for h in next(reader)]
        return header, [row for row in reader]


def load(year: int, raw_dir: Path) -> pd.DataFrame:
    """One WIDE row per reporting municipality; curated indicators as columns."""
    snapshot = fetch(year, raw_dir)
    header, rows = _read_rows(snapshot)
    index = {_code_of(h): i for i, h in enumerate(header)}

    if "Código do Município" not in index:
        raise ValueError(
            f"SNIS export schema changed — no 'Código do Município' column in {snapshot.name}; "
            f"got {header[:5]}"
        )
    key_col = index["Código do Município"]

    records: list[dict[str, object]] = []
    for row in rows:
        code = _to_ibge_code(row[key_col] if key_col < len(row) else "")
        if code is None:
            continue  # the 'TOTAL da AMOSTRA:' summary row (trap 2)
        record: dict[str, object] = {"ibge_code": code}
        for indicator, (variable, _unit) in INDICATORS.items():
            pos = index.get(indicator)
            record[variable] = (
                _parse_number(row[pos]) if pos is not None and pos < len(row) else None
            )
        records.append(record)

    df = pd.DataFrame.from_records(records)
    for variable in UNIT_BY_VARIABLE:
        if variable not in df.columns:
            df[variable] = pd.NA
        df[variable] = pd.to_numeric(df[variable], errors="coerce")
    df["ibge_code"] = df["ibge_code"].astype(str)
    return df


def _sample_total_gate(year: int, raw_dir: Path, df: pd.DataFrame) -> GateResult:
    """Reproduce SNIS's own `TOTAL da AMOSTRA:` row.

    The summary row is a statement by the source about what its municipal rows
    must add up to — the same role IBGE's published figures play for PPM. Using
    it turns the excluded trap into the validation of the parse.
    """
    header, rows = _read_rows(fetch(year, raw_dir))
    index = {_code_of(h): i for i, h in enumerate(header)}
    key_col = index["Código do Município"]
    summary = [r for r in rows if _to_ibge_code(r[key_col] if key_col < len(r) else "") is None]
    if len(summary) != 1:
        return GateResult(
            "snis-sample-total",
            False,
            f"expected exactly 1 'TOTAL da AMOSTRA:' row, found {len(summary)}",
        )

    problems, checked = [], []
    for indicator in ("POP_TOT", "CO111", "ES006"):
        pos = index.get(indicator)
        if pos is None:
            continue
        published = _parse_number(summary[0][pos]) if pos < len(summary[0]) else None
        if published is None or published == 0:
            continue
        variable = INDICATORS[indicator][0]
        got = float(pd.to_numeric(df[variable], errors="coerce").fillna(0).sum())
        drift = abs(got - published) / published
        if drift > 0.01:
            problems.append(f"{indicator}: ours {got:,.0f} vs SNIS total {published:,.0f} ({drift:.2%})")
        else:
            checked.append(f"{indicator} {drift:.2%}")
    if problems:
        return GateResult("snis-sample-total", False, "; ".join(problems))
    return GateResult(
        "snis-sample-total",
        True,
        f"matches SNIS's own TOTAL da AMOSTRA row: {', '.join(checked) or 'no comparable totals'}",
    )


def _aggregation_identity_gate(df: pd.DataFrame, year: int) -> GateResult:
    """CO119 must equal CO111 + CO115 (trap 4) wherever all three are reported.

    Passing this is what proves we read SNIS's three-level aggregation correctly
    and are not double-counting parts into totals. Documented source errors are
    tolerated (KNOWN_IDENTITY_ANOMALIES); anything new fails.
    """
    cols = ("ibge_code", "rdo_rpu_coletado", "rdo_coletado", "rpu_coletado")
    if any(c not in df.columns for c in cols):
        return GateResult("snis-aggregation-identity", True, "columns absent; skipped")
    trio = df[list(cols)].dropna()
    if trio.empty:
        return GateResult("snis-aggregation-identity", True, "no rows report all three")

    expected = trio["rdo_coletado"] + trio["rpu_coletado"]
    # SNIS values are rounded to whole tonnes, so compare relatively.
    off = trio[(expected - trio["rdo_rpu_coletado"]).abs() > 0.01 * expected.clip(lower=1)]
    unknown = [
        r for _, r in off.iterrows() if (year, str(r["ibge_code"])) not in KNOWN_IDENTITY_ANOMALIES
    ]
    known = len(off) - len(unknown)

    if unknown:
        w = unknown[0]
        return GateResult(
            "snis-aggregation-identity",
            False,
            f"{len(unknown)} UNDOCUMENTED rows where CO119 != CO111 + CO115 "
            f"(e.g. {w['ibge_code']}: {w['rdo_rpu_coletado']:,.0f} vs "
            f"{w['rdo_coletado'] + w['rpu_coletado']:,.0f}) — investigate, then add to "
            "KNOWN_IDENTITY_ANOMALIES with the observed values",
        )
    detail = f"CO119 = CO111 + CO115 holds for {len(trio) - known} of {len(trio)} reporting rows"
    if known:
        detail += f" ({known} known SNIS data-entry error tolerated)"
    return GateResult("snis-aggregation-identity", True, detail)


def _key_resolution_gate(df: pd.DataFrame) -> GateResult:
    """Every retained row must carry a well-formed 7-digit IBGE code.

    This is the integrity question the standard coverage gate cannot ask of a
    voluntary survey: not "is everyone here?" but "is everyone here real?". It is
    what guards the 6-digit -> 7-digit mapping (check-digit rule + the nine
    documented exceptions) — a silent mis-key would surface as an FK violation at
    promote time, far from its cause.
    """
    from ingest import ibge

    codes = df["ibge_code"].astype(str)
    bad = [c for c in codes if not ibge.is_valid_ibge_code(c)]
    dupes = int(codes.duplicated().sum())
    if bad or dupes:
        return GateResult(
            "snis-key-resolution",
            False,
            f"{len(bad)} unresolvable codes (e.g. {bad[:3]}), {dupes} duplicates",
        )
    return GateResult(
        "snis-key-resolution",
        True,
        f"all {len(codes)} rows resolved 6-digit -> 7-digit ibge_code, no duplicates",
    )


def _reporting_coverage_gate(df: pd.DataFrame) -> GateResult:
    """Report participation instead of demanding completeness.

    The standard coverage gate expects every municipality present. SNIS is
    voluntary, so that is the wrong question — this records who reported so the
    sparsity is visible in every ingest report rather than discovered later.
    """
    total = len(df)
    reported = int(pd.to_numeric(df.get("rdo_coletado"), errors="coerce").notna().sum())
    pop = pd.to_numeric(df.get("populacao_total"), errors="coerce")
    mask = pd.to_numeric(df.get("rdo_coletado"), errors="coerce").notna()
    pop_share = float(pop[mask].sum()) / float(pop.sum()) if pop.sum() else 0.0
    return GateResult(
        "snis-reporting-coverage",
        True,
        f"{reported}/{total} municipalities reported RDO tonnage "
        f"({reported / total:.0%} of municipalities, {pop_share:.0%} of population). "
        "Non-reporters are NULL, never zero.",
    )


def validate(
    df: pd.DataFrame,
    ctx: IngestContext | None = None,
    raw_dir: Path | None = None,
) -> tuple[list[GateResult], IngestContext]:
    if ctx is None:
        ctx = IngestContext(spec=SPEC, year=0)

    # SNIS publishes its own national total in-file; feed it to the standard
    # aggregation gate so the gate tests something real.
    if not ctx.published_totals and raw_dir is not None:
        header, rows = _read_rows(fetch(ctx.year, raw_dir))
        index = {_code_of(h): i for i, h in enumerate(header)}
        key_col = index["Código do Município"]
        summary = [r for r in rows if _to_ibge_code(r[key_col] if key_col < len(r) else "") is None]
        if summary and (published := _parse_number(summary[0][index["POP_TOT"]])):
            ctx.published_totals = {"BR": published}
            ctx.totals_column = "populacao_total"

    results = run_standard_battery(df, ctx)

    # The standard coverage gate asks "does every municipality have a row?" —
    # the wrong question for SNIS. Its universe is whoever the survey covered
    # that year and legitimately varies (2008 predates municipalities that exist
    # now; Boa Esperança do Norte/MT was created after every year in the series).
    # Demanding completeness would fail on facts about Brazil rather than on
    # anything wrong with the parse. It is replaced, not silently dropped, by two
    # gates that ask the questions that DO matter here: does every row we keep
    # resolve to a real municipality, and how sparse is participation.
    results = [r for r in results if r.gate != "coverage"]
    results.append(_key_resolution_gate(df))
    results.append(_reporting_coverage_gate(df))

    results.append(_aggregation_identity_gate(df, ctx.year))
    if raw_dir is not None:
        results.append(_sample_total_gate(ctx.year, raw_dir, df))
    return results, ctx


def promote(df: pd.DataFrame, conn) -> None:
    raise NotImplementedError(
        "Promotion runs via backend/scripts/promote_snis.py against the real DB — "
        "database writes stay a reviewed, manual step (ingest/README.md)."
    )
