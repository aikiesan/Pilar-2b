"""
IBGE reference constants used by the validation gates.

Municipality counts follow the official IBGE Malha Municipal Digital 2025
(5,571 municipalities). If IBGE creates/merges municipalities in a future
territorial revision, update BOTH tables here and the test that asserts the
total — the coverage gate depends on them.

TERRITORIAL REVISION 2022 -> 2025: MT went 141 -> 142 with the creation of
**Boa Esperança do Norte** (ibge_code 5101837, RGint 5103/Sinop), split from
Nova Ubiratã. It is the only delta between DTB 2022 (5,570) and MMD 2025
(5,571); no municipality was merged or removed. These counts are kept in sync
with `states.municipality_count` in app/migrations/021_national_spine_staging.sql.

CONSEQUENCE FOR INGESTS: sources keyed to an older territorial division —
notably the whole ABIOVE deliverable, which uses the IBGE 2017 composition —
have NO row for 5101837, because its territory was still part of Nova Ubiratã.
That is a legitimate, documented gap: put 5101837 in the source's
`missing_allowlist`, never a silent hole. RGint-level aggregates are unaffected
(parent and child are both in RGint 5103).
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

# Official municipality count per UF (IBGE MMD 2025). Sums to 5,571.
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
    "MT": 142,  # 141 in DTB 2022; +1 = Boa Esperança do Norte (5101837), MMD 2025
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

TOTAL_MUNICIPALITIES = 5571

# Non-municipal polygons IBGE ships inside the municipal mesh as "Área
# Operacional" — large lagoons that belong to no municipality. They carry
# pseudo-codes and a blank CD_RGINT, and MUST be excluded when seeding
# `municipalities` (they also surface as phantom "municipalities" in MapBiomas'
# municipal exports, e.g. Lagoa dos Patos ~1.02 Mha).
NON_MUNICIPAL_MESH_CODES: dict[str, str] = {
    "4300001": 'Área Operacional "Lagoa Mirim"',  # RS, 2,884.34 km²
    "4300002": 'Área Operacional "Lagoa dos Patos"',  # RS, 10,199.39 km²
}

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
