"""The dossier's two catalogs must say the same things, in the same shape."""

import re

import pytest

from app.services.dossier_text import (
    LANGS,
    POTENTIAL_CATEGORIES,
    RESIDUE_NAMES,
    RESIDUE_SECTORS,
    SECTOR_NAMES,
    SECTORS,
    TEXT,
    text,
)

PLACEHOLDER = re.compile(r"\{(\w+)\}")


@pytest.mark.parametrize(
    "catalog", [TEXT, RESIDUE_NAMES, SECTOR_NAMES, POTENTIAL_CATEGORIES], ids=lambda c: str(len(c))
)
def test_every_language_defines_the_same_keys(catalog):
    keys = {lang: set(catalog[lang]) for lang in LANGS}
    assert keys["pt-BR"] == keys["en"]


def test_placeholders_match_across_languages():
    for key, pt in TEXT["pt-BR"].items():
        assert set(PLACEHOLDER.findall(pt)) == set(PLACEHOLDER.findall(TEXT["en"][key])), key


def test_every_residue_and_sector_is_named_in_every_language():
    for lang in LANGS:
        for residue, sector in RESIDUE_SECTORS:
            assert RESIDUE_NAMES[lang][residue]
            assert sector in SECTORS
        for sector in SECTORS:
            assert SECTOR_NAMES[lang][sector]


def test_sheet_names_fit_excel_limit():
    for lang in LANGS:
        for key, value in TEXT[lang].items():
            if key.startswith("sheet_"):
                assert len(value) <= 31, (lang, key)


def test_the_english_catalog_is_english():
    accents = re.compile(r"[ãõçáéíóúâêô]", re.IGNORECASE)
    leaks = [k for k, v in TEXT["en"].items() if accents.search(v)]
    assert leaks == []


def test_an_unknown_language_falls_back_to_portuguese():
    assert text("fr") is TEXT["pt-BR"]  # type: ignore[arg-type]
