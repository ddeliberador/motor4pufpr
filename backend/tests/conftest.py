"""Configuração comum dos testes do backend.

A chave de API precisa existir antes de `app.core.config` ser importado,
porque `settings` é construído na importação e o middleware falha fechado
sem MCTI_API_KEY.
"""
import os

import httpx
import pytest

os.environ.setdefault("MCTI_API_KEY", "chave-de-teste")

API_KEY = os.environ["MCTI_API_KEY"]


@pytest.fixture
def sem_rede(monkeypatch):
    """Substitui todo httpx.AsyncClient por um transporte em memória.

    Nenhum teste toca a internet. O handler recebido decide a resposta por
    URL; o que não for tratado recebe 200 com corpo vazio, para os conectores
    seguirem o caminho normal de "fonte sem resultado" em vez de retentativas.
    """
    handlers = []

    def responder(request: httpx.Request) -> httpx.Response:
        for handler in handlers:
            resposta = handler(request)
            if resposta is not None:
                return resposta
        return httpx.Response(200, json={})

    transporte = httpx.MockTransport(responder)
    original = httpx.AsyncClient

    class ClienteSemRede(original):
        def __init__(self, *args, **kwargs):
            kwargs["transport"] = transporte
            super().__init__(*args, **kwargs)

    monkeypatch.setattr(httpx, "AsyncClient", ClienteSemRede)
    return handlers
