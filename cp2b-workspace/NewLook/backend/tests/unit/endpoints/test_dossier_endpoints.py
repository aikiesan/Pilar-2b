"""The dossier download routes pass the reader's language to the renderers."""

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def api(test_app):
    return TestClient(test_app, base_url="http://testserver")


@pytest.mark.parametrize("suffix,pdf", [("xlsx", False), ("pdf", True)])
def test_the_language_reaches_the_renderer(api, suffix, pdf):
    with patch(
        "app.api.v1.endpoints.municipalities._dossier", return_value=(b"x", f"f.{suffix}")
    ) as dossier:
        response = api.get(f"/api/v1/municipalities/3526803/dossie.{suffix}?lang=en")

    assert response.status_code == 200
    dossier.assert_called_once_with("3526803", want_pdf=pdf, lang="en")


def test_portuguese_is_the_default(api):
    with patch(
        "app.api.v1.endpoints.municipalities._dossier", return_value=(b"x", "f.pdf")
    ) as dossier:
        api.get("/api/v1/municipalities/3526803/dossie.pdf")

    assert dossier.call_args.kwargs["lang"] == "pt-BR"


def test_an_unsupported_language_is_rejected(api):
    with patch("app.api.v1.endpoints.municipalities._dossier") as dossier:
        response = api.get("/api/v1/municipalities/3526803/dossie.pdf?lang=fr")

    assert response.status_code == 422
    dossier.assert_not_called()
