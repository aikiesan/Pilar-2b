"""GHG module (docs/data/ESPEC_MODULO_GEE.md §6): the four required checks plus the flows."""

import copy

import pytest

from app.services.canonical_loader import load_ghg_params
from app.services.ghg_service import GhgInput, estimate, estimate_substrates

P = 1_000_000.0  # Nm³ CH4/year, the spec §5 plant


@pytest.fixture(scope="module")
def params():
    return load_ghg_params()


def test_straw_has_no_avoided_methane(params):
    r = estimate(params, GhgInput(P, baseline="campo"))
    assert r.be_methane_t == 0
    assert r.er_net_t == pytest.approx(r.be_fossil_t - r.pe_total_t)


def test_wwtp_that_already_flares_has_no_avoided_methane(params):
    assert estimate(params, GhgInput(P, baseline="ete_com_queima")).be_methane_t == 0


def test_spec_section_5_example_within_one_percent(params):
    # Lagoon emitting 80 % of the methane, diesel displaced, 2 % lost, no slip.
    p = copy.deepcopy(params)
    p["linhas_de_base"]["lagoa_anaerobia"]["mcf"] = 0.80
    p["emissoes_projeto"]["slip"]["lavagem_agua"]["padrao"] = 0.0
    r = estimate(p, GhgInput(P, baseline="lagoa_anaerobia", leak=0.02))
    assert r.be_methane_t == pytest.approx(15_487, rel=0.001)
    assert r.pe_total_t == pytest.approx(387, rel=0.002)
    # The spec credits diesel on the produced volume (2,653); the module credits
    # only what is delivered, so the net is 0.3 % lower: still within ±1 %.
    assert r.er_net_t == pytest.approx(17_750, rel=0.01)


@pytest.mark.parametrize("baseline", ["campo", "lagoa_anaerobia", "pasto", "aterro_sanitario"])
@pytest.mark.parametrize("route", ["biometano_veicular", "eletricidade", "termico_glp"])
def test_project_emissions_never_lift_er_above_the_baseline(params, baseline, route):
    r = estimate(params, GhgInput(P, baseline=baseline, route=route, flared_fraction=0.1))
    assert r.pe_total_t >= 0
    assert r.er_net_t <= r.be_methane_t + r.be_fossil_t


def test_losses_cut_the_delivered_energy(params):
    r = estimate(params, GhgInput(P, baseline="campo", leak=0.025))  # water scrubbing, 2 %
    assert r.delivered_ch4_nm3_year == pytest.approx(P * 0.975 * 0.98)
    lossless = estimate(params, GhgInput(P, baseline="campo", leak=0.0, route="termico_glp"))
    assert lossless.delivered_ch4_nm3_year == P


def test_break_even_leak_zeroes_the_net_reduction(params):
    r = estimate(params, GhgInput(P, baseline="campo"))
    assert 0 < r.leak_break_even < 0.2
    at_root = estimate(params, GhgInput(P, baseline="campo", leak=r.leak_break_even))
    assert at_root.er_net_t == pytest.approx(0, abs=1e-6)


def test_gwp_version_is_reported_and_selectable(params):
    ar6 = estimate(params, GhgInput(P, baseline="lagoa_anaerobia"))
    ar5 = estimate(params, GhgInput(P, baseline="lagoa_anaerobia", gwp_version="AR5"))
    assert (ar6.gwp_version, ar6.gwp_value) == ("AR6", 27.0)
    assert ar5.be_methane_t == pytest.approx(ar6.be_methane_t * 28 / 27)


def test_electricity_displaces_much_less_than_diesel(params):
    grid = estimate(params, GhgInput(P, baseline="campo", route="eletricidade"))
    diesel = estimate(params, GhgInput(P, baseline="campo"))
    assert grid.useful_energy_unit == "MWh"
    assert grid.be_fossil_t < diesel.be_fossil_t / 10


def test_existing_capture_is_discounted(params):
    full = estimate(params, GhgInput(P, baseline="aterro_sanitario"))
    half = estimate(params, GhgInput(P, baseline="aterro_sanitario", baseline_capture=0.5))
    assert half.be_methane_t == pytest.approx(full.be_methane_t / 2)


def test_unverified_parameters_are_flagged(params):
    r = estimate(params, GhgInput(P, baseline="lagoa_anaerobia"))
    assert "linhas_de_base.lagoa_anaerobia" in r.unverified
    assert estimate(params, GhgInput(P, baseline="campo")).unverified == ()


@pytest.mark.parametrize(
    "kwargs",
    [
        {"baseline": "nope"},
        {"route": "nope"},
        {"slip_technology": "nope"},
        {"gwp_version": "AR4"},
        {"leak": 1.5},
        {"leak": 0.6, "flared_fraction": 0.6},
        {"ch4_produced_nm3_year": -1},
    ],
)
def test_bad_inputs_raise(params, kwargs):
    with pytest.raises(ValueError):
        estimate(params, GhgInput(**{"ch4_produced_nm3_year": P, **kwargs}))


def test_every_cp2b_substrate_has_a_known_baseline(params):
    from scripts.load_cp2b_potential import SUBSTRATES

    defaults = params["substratos_linha_de_base"]
    assert set(defaults) == set(SUBSTRATES)
    assert set(defaults.values()) <= set(params["linhas_de_base"])


def test_substrates_take_their_own_baseline(params):
    out = estimate_substrates(params, {"SUINOS": P, "PALHA": P}, GhgInput(0.0))
    assert out["SUINOS"].assumptions["mcf"] > 0
    assert out["PALHA"].be_methane_t == 0
