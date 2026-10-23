"""
Transporte · ANTAQ — movimentação portuária (toneladas) por UF e ano.
Fonte: Estatístico Aquaviário, dados abertos (web3.antaq.gov.br/ea/txt/):
{ano}Atracacao.zip (uma linha por atracação, com UF e porto) e
{ano}Carga.zip (carga por atracação, VLPesoCargaBruta em toneladas),
ligados por IDAtracacao. Inclui portos organizados e TUPs.

Série por UF (entidade_tipo 'uf'), segmento vazio = todas as cargas.
Alimenta a visão regional (camada Transporte) e a barra de tempo.
"""
from __future__ import annotations

import logging
from collections import defaultdict
from datetime import date

from ..baixar import abrir_csvs, baixar
from ..csv_util import indice, ler_linhas, numero
from ..municipios import TabelaMunicipios
from ..postgrest import Indicador, Observacao

logger = logging.getLogger(__name__)

ID = "antaq_portos"
JOB = "series-uf:antaq_portos"
VERSAO = "antaq-portos-v1-2026-10"
ENTIDADE = "uf"
BASE = "https://web3.antaq.gov.br/ea/txt/"
ANO_INICIO = 2010
FONTE = {"fonte": "ANTAQ — Estatístico Aquaviário (dados abertos)", "fonte_url": "https://web3.antaq.gov.br/ea/", "licenca": "dados públicos"}
UFS = {"AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"}

INDICADORES = [
    Indicador(id="uf.porto_toneladas", nome="Movimentação portuária", natureza="fluxo", unidade="toneladas", periodicidade="anual",
              camada_mapa="Transporte", fonte_chave="antaq",
              descricao="Toneladas movimentadas (carga bruta) nas instalações portuárias da UF no ano, portos organizados e terminais de uso privado.",
              metodologia="Soma de VLPesoCargaBruta de {ano}Carga.zip por UF da atracação ({ano}Atracacao.zip), ligadas por IDAtracacao."),
]


def _ano(caminho_atr, caminho_carga, amostra: int | None) -> dict[str, float]:
    uf_por_atr: dict[str, str] = {}
    for _, fluxo in abrir_csvs(caminho_atr, ".txt"):
        cab, linhas = ler_linhas(fluxo, amostra=amostra)
        assert cab is not None
        i_id = indice(cab, "idatracacao")
        i_uf = indice(cab, "uf")
        for l in linhas:
            try:
                uf = l[i_uf].strip().upper()
                if uf in UFS:
                    uf_por_atr[l[i_id].strip()] = uf
            except IndexError:
                continue
    soma: dict[str, float] = defaultdict(float)
    for _, fluxo in abrir_csvs(caminho_carga, ".txt"):
        cab, linhas = ler_linhas(fluxo, amostra=amostra)
        assert cab is not None
        i_id = indice(cab, "idatracacao")
        i_peso = indice(cab, "vlpesocargabruta", "peso carga bruta")
        for l in linhas:
            try:
                uf = uf_por_atr.get(l[i_id].strip())
                if not uf:
                    continue
                soma[uf] += numero(l[i_peso]) or 0.0
            except IndexError:
                continue
    return soma


def coletar(_municipios: TabelaMunicipios, amostra: int | None = None) -> tuple[list[Observacao], dict]:
    obs: list[Observacao] = []
    faltas: list[int] = []
    ano_fim = date.today().year - 1  # o ano corrente só fecha em janeiro
    for ano in range(ANO_INICIO, ano_fim + 1):
        try:
            soma = _ano(baixar(f"{BASE}{ano}Atracacao.zip"), baixar(f"{BASE}{ano}Carga.zip"), amostra)
        except RuntimeError as e:
            logger.warning("ANTAQ %d: %s", ano, e)
            faltas.append(ano)
            continue
        for uf, t in soma.items():
            obs.append(Observacao(indicador_id="uf.porto_toneladas", entidade_tipo=ENTIDADE, entidade_chave=uf, periodo_referencia=f"{ano}-01-01",
                                  valor=round(t, 1), granularidade="ano", metadados={**FONTE, "versao": VERSAO}, versao_metodo=VERSAO))
        logger.info("ANTAQ %d: %d UFs", ano, len(soma))
    escopo = {**FONTE, "anos": [ANO_INICIO, ano_fim], "faltas": faltas, "completo": not faltas}
    return obs, escopo
