"""Guards for analysis/build_sp_real_uncertainty.py.

The uncertainty prototype is only meaningful while its vectorised model is the
published Cenário Real: these tests fail if the two drift apart.

    pytest tests/test_sp_real_uncertainty.py -v
"""

import importlib.util
from pathlib import Path

import numpy as np

SCRIPT = Path(__file__).resolve().parents[1] / "analysis" / "build_sp_real_uncertainty.py"
_spec = importlib.util.spec_from_file_location("sp_unc", SCRIPT)
U = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(U)


def test_modes_reproduce_published_real_total():
    total = U.check_reproduces_published(U.activity_totals())
    assert round(total) == 7_832_143_834


def test_every_mode_lies_inside_its_range():
    for name, (lo, mode, hi, src, _) in U.PARAMS.items():
        assert lo <= mode <= hi, name
        assert lo < hi, name
        assert src in {"corpus", "atlas", "assumed"}, name


def test_triangular_ppf_hits_bounds_and_mode():
    lo, mode, hi = 2.0, 3.0, 7.0
    u = np.array([0.0, (mode - lo) / (hi - lo), 1.0])
    np.testing.assert_allclose(U.tri_ppf(u, lo, mode, hi), [lo, mode, hi])


def test_triangular_ppf_reproduces_the_analytic_mean():
    lo, mode, hi = 0.2, 0.4, 0.5
    x = U.tri_ppf(np.random.default_rng(0).random(200_000), lo, mode, hi)
    assert abs(x.mean() - (lo + mode + hi) / 3) < 1e-3
