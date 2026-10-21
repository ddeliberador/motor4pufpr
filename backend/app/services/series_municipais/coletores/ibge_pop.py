"""
Base · IBGE — população residente por município (estimativas anuais e Censo).
Fonte: API SIDRA, tabela 6579 (população estimada, variável 9324) e tabela
4714 (Censo 2022, variável 93). Licença: dados públicos do IBGE.

Serve para normalizar os demais indicadores municipais (por 10 mil habitantes).
"""
from __future__ import annotations

import logging

import httpx

from ..baixar import UA
from ..municipios import TabelaMunicipios
from ..postgrest import Indicador, Observacao

logger = logging.getLogger(__name__)

ID = "ibge_pop"
JOB = "series-municipais:ibge_pop"
VERSAO = "ibge-pop-v1-2026-10"
URLS = [
    ("https://apisidra.ibge.gov.br/values/t/6579/n6/all/v/9324/p/all", "estimativa"),
    ("https://apisidra.ibge.gov.br/values/t/4714/n6/all/v/93/p/all", "censo"),
]
FONTE = {"fonte": "IBGE — SIDRA (tabelas 6579 e 4714)", "fonte_url": "https://sidra.ibge.gov.br/", "licenca": "dados públicos"}

INDICADORES = [
    Indicador(id="mun.populacao", nome="População residente", natureza="estoque", unidade="habitantes", periodicidade="anual",
              camada_mapa=None, fonte_chave="ibge_sidra",
              descricao="População residente estimada (SIDRA 6579) ou recenseada (SIDRA 4714, 2022), por município e ano.",
              metodologia="Leitura direta da API SIDRA; o Censo prevalece sobre a estimativa no mesmo ano."),
]


def coletar(municipios: TabelaMunicipios, amostra: int | None = None) -> tuple[list[Observacao], dict]:
    valores: dict[tuple[str, int], tuple[float, str]] = {}
    for url, origem in URLS:
        r = httpx.get(url, headers=UA, timeout=180)
        if r.status_code != 200:
            raise RuntimeError(f"SIDRA {url}: HTTP {r.status_code}")
        linhas = r.json()
        if not linhas:
            continue
        cab = linhas[0]
        k_mun = next(k for k, v in cab.items() if "Município (Código)" in str(v))
        k_ano = next(k for k, v in cab.items() if "Ano (Código)" in str(v))
        for l in linhas[1:]:
            ibge = municipios.ibge_valido(l.get(k_mun))
            try:
                ano = int(l.get(k_ano))
                v = float(l.get("V"))
            except (TypeError, ValueError):
                continue
            if not ibge:
                continue
            if origem == "censo" or (ibge, ano) not in valores:
                valores[(ibge, ano)] = (v, origem)
        logger.info("SIDRA %s: %d linhas", origem, len(linhas) - 1)
    obs = [Observacao("mun.populacao", ibge, f"{ano}-07-01", v, "ano", "", metadados={**FONTE, "origem": origem}, versao_metodo=VERSAO)
           for (ibge, ano), (v, origem) in valores.items()]
    return obs, {"urls": [u for u, _ in URLS], "observacoes": len(obs), "municipios": len({k[0] for k in valores}), "completo": True}
