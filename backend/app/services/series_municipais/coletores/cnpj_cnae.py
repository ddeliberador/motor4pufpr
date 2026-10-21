"""
L3/L5 · Receita Federal — estabelecimentos ativos por município nos CNAEs de
tecnologia: 62 (serviços de TI: software, consultoria, suporte) e 631
(hospedagem, processamento de dados, portais).
Fonte: Dados Abertos do CNPJ (arquivos mensais Estabelecimentos0..9.zip e
Municipios.zip em arquivos.receitafederal.gov.br). Licença: dados públicos da RFB.

Foto mensal: nº de estabelecimentos com situação cadastral ativa (02), por
município (o código de município da RFB é o TOM, convertido para IBGE pelo
nome + UF).
"""
from __future__ import annotations

import logging
import os
import re
from collections import defaultdict

import httpx

from ..baixar import UA, abrir_csvs, baixar
from ..csv_util import ler_linhas
from ..municipios import TabelaMunicipios
from ..postgrest import Indicador, Observacao

logger = logging.getLogger(__name__)

ID = "cnpj_cnae"
JOB = "series-municipais:cnpj_cnae"
VERSAO = "cnpj-cnae-v1-2026-10"
BASE = os.environ.get("RFB_CNPJ_BASE", "https://arquivos.receitafederal.gov.br/dados/cnpj/dados_abertos_cnpj/")
FONTE = {"fonte": "Receita Federal — Dados Abertos do CNPJ (Estabelecimentos)", "fonte_url": BASE, "licenca": "dados públicos"}

# Posições no CSV de Estabelecimentos (sem cabeçalho), conforme layout da RFB.
COL_SITUACAO, COL_CNAE, COL_UF, COL_MUNICIPIO = 5, 11, 19, 20

SEGMENTOS = {
    "mun.estab_ti": ("62",),
    "mun.estab_dados": ("631",),
}

INDICADORES = [
    Indicador(id="mun.estab_ti", nome="Estabelecimentos ativos de serviços de TI (CNAE 62)", natureza="estoque", unidade="estabelecimentos", periodicidade="mensal",
              camada_mapa="L5", fonte_chave="rfb_cnpj", cnae="62",
              descricao="Estabelecimentos com situação cadastral ativa cujo CNAE principal está na divisão 62 (desenvolvimento de software, consultoria e suporte em TI). Inclui MEI.",
              metodologia="Contagem nos arquivos Estabelecimentos da RFB, situação 02, CNAE principal iniciado por 62; município TOM convertido para IBGE por nome + UF."),
    Indicador(id="mun.estab_dados", nome="Estabelecimentos ativos de hospedagem e dados (CNAE 631)", natureza="estoque", unidade="estabelecimentos", periodicidade="mensal",
              camada_mapa="L3", fonte_chave="rfb_cnpj", cnae="631",
              descricao="Estabelecimentos ativos cujo CNAE principal é 6311 (tratamento de dados, hospedagem) ou 6319 (portais e provedores de conteúdo).",
              metodologia="Contagem nos arquivos Estabelecimentos da RFB, situação 02, CNAE principal iniciado por 631; município TOM convertido para IBGE por nome + UF."),
]


def pasta_mais_recente() -> str:
    r = httpx.get(BASE, headers=UA, timeout=60, follow_redirects=True)
    r.raise_for_status()
    pastas = sorted(set(re.findall(r'href="(\d{4}-\d{2})/?"', r.text)))
    if not pastas:
        raise RuntimeError(f"nenhuma pasta AAAA-MM encontrada em {BASE}")
    return pastas[-1]


def carregar_tom(pasta: str, municipios: TabelaMunicipios) -> dict[str, str]:
    """Código TOM (RFB) -> nome, para converter em IBGE junto com a UF."""
    caminho = baixar(f"{BASE}{pasta}/Municipios.zip")
    tom: dict[str, str] = {}
    for _, fluxo in abrir_csvs(caminho, padrao=""):
        _, linhas = ler_linhas(fluxo, com_cabecalho=False)
        for l in linhas:
            if len(l) >= 2:
                tom[l[0].strip().lstrip("0") or "0"] = l[1].strip()
    if len(tom) < 5000:
        raise RuntimeError(f"Municipios.zip devolveu só {len(tom)} códigos TOM")
    return tom


def coletar(municipios: TabelaMunicipios, amostra: int | None = None) -> tuple[list[Observacao], dict]:
    pasta = pasta_mais_recente()
    tom = carregar_tom(pasta, municipios)
    cache_ibge: dict[tuple[str, str], str | None] = {}
    contagem: dict[str, dict[str, int]] = {k: defaultdict(int) for k in SEGMENTOS}
    lidas = 0
    sem_municipio = 0
    arquivos = list(range(10)) if amostra is None else [0]
    for n in arquivos:
        caminho = baixar(f"{BASE}{pasta}/Estabelecimentos{n}.zip")
        for _, fluxo in abrir_csvs(caminho, padrao=""):
            _, linhas = ler_linhas(fluxo, com_cabecalho=False, amostra=amostra)
            for l in linhas:
                lidas += 1
                try:
                    if l[COL_SITUACAO].strip() != "02":
                        continue
                    cnae = l[COL_CNAE].strip()
                    alvo = [k for k, prefixos in SEGMENTOS.items() if cnae.startswith(prefixos)]
                    if not alvo:
                        continue
                    chave = (l[COL_MUNICIPIO].strip().lstrip("0") or "0", l[COL_UF].strip().upper())
                except IndexError:
                    continue
                if chave not in cache_ibge:
                    nome = tom.get(chave[0])
                    cache_ibge[chave] = municipios.por_nome_uf(nome, chave[1]) if nome else None
                ibge = cache_ibge[chave]
                if not ibge:
                    sem_municipio += 1
                    continue
                for k in alvo:
                    contagem[k][ibge] += 1
        logger.info("Estabelecimentos%d: %d linhas acumuladas", n, lidas)
    periodo = f"{pasta}-01"
    obs = [
        Observacao(ind, ibge, periodo, float(v), "mes", "", "foto_coletada", metadados={**FONTE, "pasta": pasta}, versao_metodo=VERSAO)
        for ind, por_mun in contagem.items() for ibge, v in por_mun.items()
    ]
    return obs, {"pasta": pasta, "linhas": lidas, "sem_municipio": sem_municipio, "arquivos": len(arquivos), "completo": amostra is None}
