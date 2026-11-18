"""Guards for analysis/build_sp_digestate_nutrients.py.

The prototype recomputes feedstock masses from the scenario script's constants;
these tests fail if its masses stop matching the methane the scenario script
reports for the same municipality.
"""

import csv
import importlib.util
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "digestate", ROOT / "analysis" / "build_sp_digestate_nutrients.py"
)
D = importlib.util.module_from_spec(spec)
spec.loader.exec_module(D)
S = D.load_scenario_module()

with D.MASTER.open(encoding="utf-8-sig") as fh:
    ROWS = list(csv.DictReader(fh))
CANE_ROW = max(ROWS, key=lambda r: float(r["prod_t_Cana_de_açúcar"] or 0))


def test_every_stream_has_composition_and_fate():
    t = D.feedstock_tonnes(S, CANE_ROW)
    assert set(t) == set(D.COMPOSITION) == set(D.FATE)
    assert set(D.FATE.values()) <= set(D.FATE_LABEL)


def test_masses_reproduce_scenario_methane():
    t = D.feedstock_tonnes(S, CANE_ROW)
    ch4 = S.calcular([CANE_ROW], D.TIER)
    torta = t["torta de filtro"] * 1000 * S.TORTA_VS / 100 * S.TORTA_BMP / 1000
    palha_wet = t["palha de cana"] * D.STRAW_VS_PER_TS / (S.PALHA_VS / 100)
    palha = palha_wet * 1000 * S.PALHA_VS / 100 * S.PALHA_BMP / 1000
    bov = t["bovinos"] * 1000 * S.BOV_VS / 100 * S.BOV_BMP / 1000
    assert torta == pytest.approx(ch4["torta de filtro"])
    assert palha == pytest.approx(ch4["palha de cana"])
    assert bov == pytest.approx(ch4["bovinos"])


def test_storage_loss_applies_to_nitrogen_only():
    out = D.digestate_nutrients({"aves": 1000.0})["aves"]
    assert out["N"] == pytest.approx(D.COMPOSITION["aves"]["N"] * D.N_STORAGE_RETENTION)
    assert out["K2O"] == pytest.approx(D.COMPOSITION["aves"]["K2O"])


def test_mandate_panel_digestate_shares_are_the_prototypes():
    """The revenue-stack card (C27) quotes these shares; they must follow the prototype."""
    import yaml

    by_fate = {f: dict.fromkeys(D.NUTRIENTS, 0.0) for f in D.FATE_LABEL}
    for r in ROWS:
        for s, v in D.digestate_nutrients(D.feedstock_tonnes(S, r)).items():
            for n in D.NUTRIENTS:
                by_fate[D.FATE[s]][n] += v[n]
    value = {f: D.value_brl(t) for f, t in by_fate.items()}
    total = sum(value.values())
    params = yaml.safe_load(
        (D.NEWLOOK / "data" / "canonical_parameters" / "mandato_biometano.yaml").read_text(
            encoding="utf-8"
        )
    )
    quoted = params["pilha_de_receitas"]["digestato_valor_por_destino"]
    fate = {"ja_reciclado": "ja_reciclado", "reposicao": "exportado_pela_remocao", "novo": "novo"}
    for key, f in fate.items():
        assert quoted[key] == pytest.approx(value[f] / total, abs=0.006)
