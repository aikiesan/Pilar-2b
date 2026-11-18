from pathlib import Path

from scripts import promote_pam


def test_all_crop_rows_preserve_pam_reported_units(monkeypatch):
    monkeypatch.setattr(promote_pam.pam1612, "fetch", lambda year, raw: Path("pam"))
    monkeypatch.setattr(promote_pam.pam1613, "fetch", lambda year, raw: Path("pam"))
    monkeypatch.setattr(
        promote_pam._sidra,
        "select_workbook",
        lambda base, table, year: Path(f"{table}.xlsx"),
    )

    def fake_read(path, year):
        if path.name == "1612.xlsx":
            return {
                "3100104": {"Milho (em grão)": 100.0, "Abacaxi*": 12.0},
                "3500105": {"Milho (em grão)": 200.0, "Abacaxi*": 20.0},
            }
        return {
            "3100104": {"Banana (cacho)": 50.0, "Coco-da-baía*": 3.0},
            "3500105": {"Banana (cacho)": 60.0, "Coco-da-baía*": 4.0},
        }

    monkeypatch.setattr(promote_pam._sidra, "read_year", fake_read)

    rows, totals = promote_pam.build_all_crop_rows(2023, "MG")

    by_variable = {row["variable"]: row for row in rows}
    assert by_variable["pam_milho_em_grao"]["unit"] == "t"
    assert by_variable["pam_banana_cacho"]["unit"] == "t"
    assert by_variable["pam_abacaxi"]["unit"] == "mil frutos"
    assert by_variable["pam_coco_da_baia"]["unit"] == "mil frutos"
    assert totals["Milho (em grão)"] == 100.0
    assert totals["Abacaxi*"] == 12.0
    assert all(row["ibge_code"].startswith("31") for row in rows)


def test_timeseries_upsert_binds_unit():
    assert "%(unit)s" in promote_pam.TIMESERIES_SQL
    assert "'t'" not in promote_pam.TIMESERIES_SQL
