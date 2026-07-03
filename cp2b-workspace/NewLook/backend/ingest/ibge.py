"""
IBGE reference constants used by the validation gates.

Municipality counts are the official IBGE Divisão Territorial (5,570
municipalities, DTB 2022). If IBGE creates/merges municipalities in a future
territorial revision, update BOTH tables here and the test that asserts the
5,570 total — the coverage gate depends on them.
"""

from __future__ import annotations

# ibge_code prefix (first 2 digits) -> UF sigla
UF_BY_CODE_PREFIX: dict[str, str] = {
    "11": "RO",
    "12": "AC",
    "13": "AM",
    "14": "RR",
    "15": "PA",
    "16": "AP",
    "17": "TO",
    "21": "MA",
    "22": "PI",
    "23": "CE",
    "24": "RN",
    "25": "PB",
    "26": "PE",
    "27": "AL",
    "28": "SE",
    "29": "BA",
    "31": "MG",
    "32": "ES",
    "33": "RJ",
    "35": "SP",
    "41": "PR",
    "42": "SC",
    "43": "RS",
    "50": "MS",
    "51": "MT",
    "52": "GO",
    "53": "DF",
}

CODE_PREFIX_BY_UF: dict[str, str] = {uf: code for code, uf in UF_BY_CODE_PREFIX.items()}

# Official municipality count per UF (IBGE DTB 2022). Sums to 5,570.
MUNICIPALITY_COUNT_BY_UF: dict[str, int] = {
    "AC": 22,
    "AL": 102,
    "AM": 62,
    "AP": 16,
    "BA": 417,
    "CE": 184,
    "DF": 1,
    "ES": 78,
    "GO": 246,
    "MA": 217,
    "MG": 853,
    "MS": 79,
    "MT": 141,
    "PA": 144,
    "PB": 223,
    "PE": 185,
    "PI": 224,
    "PR": 399,
    "RJ": 92,
    "RN": 167,
    "RO": 52,
    "RR": 15,
    "RS": 497,
    "SC": 295,
    "SE": 75,
    "SP": 645,
    "TO": 139,
}

TOTAL_MUNICIPALITIES = 5570

# IBGE Divisão Regional 2017 — intermediate geographic regions (RGint).
TOTAL_INTERMEDIATE_REGIONS = 133


def is_valid_ibge_code(code: object) -> bool:
    """True when `code` is a 7-digit IBGE municipality code with a known UF prefix."""
    s = str(code).strip()
    return len(s) == 7 and s.isdigit() and s[:2] in UF_BY_CODE_PREFIX


def uf_of(code: object) -> str | None:
    """UF sigla for a 7-digit ibge_code, or None when the code is invalid."""
    s = str(code).strip()
    if not is_valid_ibge_code(s):
        return None
    return UF_BY_CODE_PREFIX[s[:2]]
