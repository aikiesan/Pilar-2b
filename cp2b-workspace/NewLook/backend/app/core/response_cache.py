"""Cache de resposta em processo, com ETag, para payloads grandes e estáveis.

MOTIVAÇÃO, medida na VM antes de escrever isto
----------------------------------------------
`/municipalities/geojson?fields=map` custa 4,1 s com um único usuário e 49,8 s
com 25 — a latência cresce linearmente com a concorrência e a vazão satura em
~2,5 req/s. São 1.770 KB remontados do PostGIS a cada visita: a consulta agrega
5.571 geometrias em jsonb, o FastAPI reserializa o dicionário inteiro, e nada
disso muda entre uma requisição e a seguinte. O resto da API é confortável
(statistics 3 ms, metrics 7 ms) — o problema é uma rota só, e é toda trabalho
repetido.

O QUE ISTO FAZ
--------------
Guarda os BYTES já serializados, não o dicionário: numa segunda chamada não há
consulta, nem agregação, nem `json.dumps`. Emite `ETag`, de modo que o navegador
que já tem o payload recebe `304 Not Modified` — resposta vazia — em vez de
1,8 MB comprimidos.

INVALIDAÇÃO
-----------
Duas camadas, ambas deliberadas:

* **O cache morre com o processo.** É em memória, e todo deploy reinicia o
  `pilar-backend` (`pm2 restart`), então código novo nunca serve payload velho.
  Essa é a garantia forte, e é por isso que o TTL pode ser generoso.
* **TTL**, para o caso de os dados mudarem sem restart — rodar
  `load_scenarios_real_ideal.py` na VM, por exemplo. Padrão de 15 min, que
  limita a janela de dado velho sem devolver o custo.

O `max-age` enviado ao navegador é curto de propósito (60 s) enquanto o ETag faz
o trabalho: o cliente revalida com frequência, mas a revalidação custa um 304 de
poucos bytes. Preferir um `max-age` longo economizaria pouco e faria uma
correção de dado levar horas para aparecer na tela de quem já visitou.

NÃO é um cache distribuído. Com mais de um worker cada um terá o seu, o que
significa no máximo uma geração por worker — aceitável, e sem a dependência de
um Redis que a plataforma hoje não tem.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import threading
import time
from typing import Any, Callable

from fastapi import Request, Response

logger = logging.getLogger(__name__)

# Segundos que uma entrada permanece válida. Ver INVALIDAÇÃO acima.
DEFAULT_TTL = int(os.environ.get("RESPONSE_CACHE_TTL", "900"))
# Quanto o navegador pode reusar sem perguntar. Curto por escolha: o ETag é que
# evita o tráfego, e um max-age longo atrasaria correções de dado.
BROWSER_MAX_AGE = int(os.environ.get("RESPONSE_CACHE_BROWSER_MAX_AGE", "60"))
# Teto de entradas. O payload do mapa tem ~15 MB de JSON cru, entao guardar
# variantes sem limite é um vazamento de memória com outro nome.
MAX_ENTRIES = int(os.environ.get("RESPONSE_CACHE_MAX_ENTRIES", "8"))

# key -> (etag, body, expires_at_monotonic)
_CACHE: dict[str, tuple[str, bytes, float]] = {}
_LOCK = threading.Lock()

_STATS = {"hits": 0, "misses": 0, "not_modified": 0}


def _evict_if_needed() -> None:
    """Descarta a entrada que expira primeiro. Chamar com o lock tomado."""
    while len(_CACHE) >= MAX_ENTRIES:
        oldest = min(_CACHE, key=lambda k: _CACHE[k][2])
        del _CACHE[oldest]


def cached_json_response(
    request: Request,
    key: str,
    build: Callable[[], Any],
    ttl: int = DEFAULT_TTL,
) -> Response:
    """Serve `build()` como JSON, com ETag e cache em processo.

    `build` só é chamado quando não há entrada válida — é onde mora o custo, e
    a graça é justamente não pagá-lo. `key` deve conter todos os parâmetros que
    mudam o corpo da resposta, ou dois pedidos diferentes compartilharão bytes.
    """
    now = time.monotonic()

    with _LOCK:
        entry = _CACHE.get(key)
        if entry and entry[2] > now:
            etag, body, _ = entry
            _STATS["hits"] += 1
        else:
            entry = None

    if entry is None:
        payload = build()
        # separators sem espaço: ~4% menor que o default do FastAPI, de graça.
        body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        etag = f'W/"{hashlib.sha256(body).hexdigest()[:32]}"'
        with _LOCK:
            _evict_if_needed()
            _CACHE[key] = (etag, body, now + ttl)
            _STATS["misses"] += 1
        logger.info("response_cache MISS %s (%.1f KB)", key, len(body) / 1024)

    headers = {
        "ETag": etag,
        "Cache-Control": f"public, max-age={BROWSER_MAX_AGE}",
        # Sem isto, um proxy pode servir a versão gzip para um cliente que não
        # aceita gzip — o GZipMiddleware varia a resposta pelo Accept-Encoding.
        "Vary": "Accept-Encoding",
    }

    # If-None-Match pode trazer uma lista, e o RFC permite o prefixo W/.
    inm = request.headers.get("if-none-match", "")
    if etag in [t.strip() for t in inm.split(",") if t.strip()]:
        with _LOCK:
            _STATS["not_modified"] += 1
        return Response(status_code=304, headers=headers)

    return Response(content=body, media_type="application/json", headers=headers)


def cache_stats() -> dict[str, Any]:
    with _LOCK:
        return {
            **_STATS,
            "entries": len(_CACHE),
            "bytes": sum(len(v[1]) for v in _CACHE.values()),
            "ttl_seconds": DEFAULT_TTL,
        }


def clear_cache() -> int:
    """Esvazia o cache. Usado nos testes e disponível para operação."""
    with _LOCK:
        n = len(_CACHE)
        _CACHE.clear()
        return n
