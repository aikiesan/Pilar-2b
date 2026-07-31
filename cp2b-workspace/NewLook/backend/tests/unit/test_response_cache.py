"""Garante o cache de resposta que derrubou o mapa de 4,1 s para 55 ms.

O que se testa aqui não é "o cache funciona" — é o conjunto de erros que um
cache comete em silêncio: servir a resposta de um pedido para outro, devolver
304 para um ETag que não é o seu, e crescer sem teto até comer a memória do
processo.
"""

import gzip
import json
import time

import pytest

from app.core import response_cache
from app.core.response_cache import cache_stats, cached_json_response, clear_cache


class FakeRequest:
    """Só o que o cache lê de uma Request: os cabeçalhos."""

    def __init__(self, if_none_match: str | None = None, accept_encoding: str = ""):
        self.headers = {"accept-encoding": accept_encoding}
        if if_none_match:
            self.headers["if-none-match"] = if_none_match


@pytest.fixture(autouse=True)
def _limpa():
    clear_cache()
    yield
    clear_cache()


def test_segunda_chamada_nao_reconstroi():
    chamadas = []

    def build():
        chamadas.append(1)
        return {"type": "FeatureCollection", "features": []}

    r1 = cached_json_response(FakeRequest(), "k", build)
    r2 = cached_json_response(FakeRequest(), "k", build)

    assert len(chamadas) == 1, "o builder rodou de novo — o cache não pegou"
    assert r1.body == r2.body
    assert r1.status_code == r2.status_code == 200


def test_etag_conhecido_devolve_304_sem_corpo():
    resp = cached_json_response(FakeRequest(), "k", lambda: {"a": 1})
    etag = resp.headers["etag"]

    again = cached_json_response(FakeRequest(if_none_match=etag), "k", lambda: {"a": 1})
    assert again.status_code == 304
    assert again.body == b""
    assert again.headers["etag"] == etag


def test_etag_de_outra_entrada_nao_serve():
    # O modo silencioso de errar: aceitar qualquer ETag e responder 304 para um
    # cliente que tem outro conteúdo — ele ficaria preso na versão errada.
    a = cached_json_response(FakeRequest(), "a", lambda: {"v": "a"})
    b = cached_json_response(FakeRequest(), "b", lambda: {"v": "b"})
    assert a.headers["etag"] != b.headers["etag"]

    resp = cached_json_response(
        FakeRequest(if_none_match=a.headers["etag"]), "b", lambda: {"v": "b"}
    )
    assert resp.status_code == 200
    assert b'"b"' in resp.body


def test_if_none_match_com_lista_de_etags():
    """O RFC permite `If-None-Match: "x", "y"` — navegador e proxy usam isso."""
    resp = cached_json_response(FakeRequest(), "k", lambda: {"a": 1})
    etag = resp.headers["etag"]

    lista = f'W/"outra", {etag}, W/"mais-outra"'
    again = cached_json_response(FakeRequest(if_none_match=lista), "k", lambda: {"a": 1})
    assert again.status_code == 304


def test_chaves_diferentes_nao_compartilham_bytes():
    r_map = cached_json_response(FakeRequest(), "geojson:fields=map", lambda: {"f": "map"})
    r_full = cached_json_response(FakeRequest(), "geojson:fields=full", lambda: {"f": "full"})
    assert r_map.body != r_full.body
    assert cache_stats()["entries"] == 2


def test_ttl_expirado_reconstroi():
    chamadas = []

    def build():
        chamadas.append(1)
        return {"n": len(chamadas)}

    cached_json_response(FakeRequest(), "k", build, ttl=0)
    time.sleep(0.01)
    cached_json_response(FakeRequest(), "k", build, ttl=0)
    assert len(chamadas) == 2


def test_nao_cresce_alem_do_teto(monkeypatch):
    # Sem teto, cada combinação de parâmetros vira uma cópia permanente de um
    # payload de ~12 MB. Isso é um vazamento de memória com outro nome.
    monkeypatch.setattr(response_cache, "MAX_ENTRIES", 3)
    for i in range(10):
        cached_json_response(FakeRequest(), f"k{i}", lambda i=i: {"i": i})
    assert cache_stats()["entries"] <= 3


def test_cabecalhos_de_cache_presentes():
    resp = cached_json_response(FakeRequest(), "k", lambda: {"a": 1})
    assert resp.headers["cache-control"].startswith("public, max-age=")
    # Sem Vary, um proxy pode entregar bytes gzip a quem não aceita gzip.
    assert resp.headers["vary"] == "Accept-Encoding"
    assert resp.media_type == "application/json"


def test_erro_no_builder_nao_fica_em_cache():
    def explode():
        raise RuntimeError("banco fora")

    with pytest.raises(RuntimeError):
        cached_json_response(FakeRequest(), "k", explode)
    assert cache_stats()["entries"] == 0


def test_cliente_que_aceita_gzip_recebe_comprimido_e_valido():
    """O ganho maior do cache, e o mais fácil de quebrar sem perceber.

    Guardar bytes crus deixava o GZipMiddleware refazer gzip nível 9 sobre 12 MB
    a cada requisição: 284 ms por acerto, contra 28 ms sem compressão. Comprimir
    uma vez na construção derrubou para 46 ms. Se algum dia alguém devolver o
    corpo cru com Content-Encoding: gzip, o cliente recebe lixo — daí o teste
    descomprimir de verdade em vez de só conferir o cabeçalho.
    """
    payload = {"type": "FeatureCollection", "features": [{"id": i} for i in range(50)]}
    resp = cached_json_response(
        FakeRequest(accept_encoding="gzip, deflate, br"), "k", lambda: payload
    )

    assert resp.headers["content-encoding"] == "gzip"
    assert json.loads(gzip.decompress(resp.body)) == payload
    assert len(resp.body) < len(json.dumps(payload).encode())


def test_cliente_sem_gzip_recebe_cru_e_sem_content_encoding():
    payload = {"a": 1}
    resp = cached_json_response(FakeRequest(accept_encoding="identity"), "k", lambda: payload)

    assert "content-encoding" not in resp.headers
    assert json.loads(resp.body) == payload


def test_as_duas_variantes_compartilham_etag():
    """Mesmo recurso, mesma versão: o ETag identifica o conteúdo, não a codificação.

    É o `Vary: Accept-Encoding` que impede um proxy de entregar a variante errada.
    """
    gz = cached_json_response(FakeRequest(accept_encoding="gzip"), "k", lambda: {"a": 1})
    raw = cached_json_response(FakeRequest(), "k", lambda: {"a": 1})
    assert gz.headers["etag"] == raw.headers["etag"]
    assert gz.headers["vary"] == raw.headers["vary"] == "Accept-Encoding"
