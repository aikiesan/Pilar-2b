import sys
import types

from scripts import run_migrations


def _fake_module(name, main):
    module = types.ModuleType(f"scripts.{name}")
    module.main = main
    return module


def _install(monkeypatch, **mains):
    """Register fake scripts.<name> modules so run_seeder imports those."""
    for name, main in mains.items():
        monkeypatch.setitem(sys.modules, f"scripts.{name}", _fake_module(name, main))


def test_typology_loader_runs_before_the_dossier_loader():
    # 030 creates municipality_typology empty; the typology loader INSERTs the
    # 1498 rows, the dossier loader UPDATEs São Paulo's 645. Reversed, the second
    # matches nothing and silently loads zero.
    order = list(run_migrations.SEEDERS)

    assert order.index("load_municipality_typology") < order.index("load_dossier_sp_indices")


def test_both_typology_loaders_are_wired_into_seed():
    assert "load_municipality_typology" in run_migrations.SEEDERS
    assert "load_dossier_sp_indices" in run_migrations.SEEDERS


def test_a_seeder_declining_does_not_abort_the_ones_after_it(monkeypatch):
    # The loaders raise SystemExit when their raw snapshot is missing — routine,
    # since backend/data/raw/ is gitignored and never arrives with a clone.
    # `except Exception` does not catch SystemExit, so without explicit handling
    # one absent CSV would take down every later seeder.
    ran = []

    def declines():
        raise SystemExit("raw snapshot missing: dossier_municipios.csv")

    _install(
        monkeypatch,
        first=lambda: ran.append("first"),
        declines=declines,
        last=lambda: ran.append("last"),
    )
    monkeypatch.setattr(run_migrations, "SEEDERS", ("first", "declines", "last"))

    for name in run_migrations.SEEDERS:
        run_migrations.run_seeder(name)

    assert ran == ["first", "last"]


def test_an_unexpected_error_also_does_not_abort_the_run(monkeypatch):
    ran = []

    def explodes():
        raise RuntimeError("connection refused")

    _install(monkeypatch, explodes=explodes, last=lambda: ran.append("last"))

    for name in ("explodes", "last"):
        run_migrations.run_seeder(name)

    assert ran == ["last"]


def test_a_nonzero_status_is_surfaced_as_a_warning(monkeypatch, caplog):
    # load_dossier_sp_indices returns 1 on a partial load — rows that matched no
    # municipality_typology entry were skipped. That must not pass unremarked.
    _install(monkeypatch, partial=lambda: 1)

    with caplog.at_level("WARNING"):
        run_migrations.run_seeder("partial")

    assert "status 1" in caplog.text


def test_a_clean_seeder_logs_no_warning(monkeypatch, caplog):
    _install(monkeypatch, clean=lambda: 0)

    with caplog.at_level("WARNING"):
        run_migrations.run_seeder("clean")

    assert caplog.text == ""
