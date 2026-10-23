"""
Transporte · ANAC — passageiros embarcados por UF de origem e ano.
Fonte: Dados Estatísticos do Transporte Aéreo (dados abertos ANAC), arquivos
mensais "basica{ano}-{mes}.zip" com uma linha por voo/etapa (colunas
sg_uf_origem, nr_passag_pagos, nr_passag_gratis, nr_carga_paga_kg...).

Série por UF (entidade_tipo 'uf'): passageiros (pagos + grátis) embarcados
em aeroportos da UF no ano, voos regulares e não regulares, domésticos e
internacionais. Segmento vazio = total.
"""
from __future__ import annotations

import logging
import os
from collections import defaultdict
from datetime import date

from ..baixar import abrir_csvs, baixar
from ..csv_util import indice, ler_linhas, numero
from ..municipios import TabelaMunicipios
from ..postgrest import Indicador, Observacao

logger = logging.getLogger(__name__)

ID = "anac_aero"
JOB = "series-uf:anac_aero"
VERSAO = "anac-aero-v1-2026-10"
ENTIDADE = "uf"
# Pasta pública dos microdados; pode ser trocada pela variável ANAC_BASICA_URL se a ANAC mover.
BASE = os.environ.get("ANAC_BASICA_URL", "https://sistemas.anac.gov.br/dadosabertos/Voos%20e%20opera%C3%A7%C3%B5es%20a%C3%A9reas/Dados%20Estat%C3%ADsticos%20do%20Transporte%20A%C3%A9reo/")
ANO_INICIO = 2010
FONTE = {"fonte": "ANAC — Dados Estatísticos do Transporte Aéreo (microdados)", "fonte_url": "https://www.gov.br/anac/pt-br/assuntos/dados-e-estatisticas/dados-estatisticos", "licenca": "dados públicos"}
UFS = {"AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"}

INDICADORES = [
    Indicador(id="uf.aero_passageiros", nome="Passageiros embarcados", natureza="fluxo", unidade="passageiros", periodicidade="anual",
              camada_mapa="Transporte", fonte_chave="anac",
              descricao="Passageiros (pagos e grátis) embarcados nos aeroportos da UF no ano, em voos regulares e não regulares.",
              metodologia="Soma de nr_passag_pagos + nr_passag_gratis por sg_uf_origem nos arquivos mensais basica{ano}-{mes}.zip."),
]


def coletar(_municipios: TabelaMunicipios, amostra: int | None = None) -> tuple[list[Observacao], dict]:
    hoje = date.today()
    ano_fim = hoje.year - 1
    soma: dict[tuple[str, int], float] = defaultdict(float)
    faltas: list[str] = []
    for ano in range(ANO_INICIO, ano_fim + 1):
        for mes in range(1, 13):
            try:
                caminho = baixar(f"{BASE}basica{ano}-{mes:02d}.zip")
            except RuntimeError as e:
                logger.warning("ANAC %d-%02d: %s", ano, mes, e)
                faltas.append(f"{ano}-{mes:02d}")
                continue
            for _, fluxo in abrir_csvs(caminho, ".csv"):
                cab, linhas = ler_linhas(fluxo, amostra=amostra)
                assert cab is not None
                i_uf = indice(cab, "sg_uf_origem", "uf origem")
                i_pag = indice(cab, "nr_passag_pagos", "passag pagos")
                i_gra = indice(cab, "nr_passag_gratis", "passag gratis", obrigatorio=False)
                for l in linhas:
                    try:
                        uf = l[i_uf].strip().upper()
                        if uf not in UFS:
                            continue
                        soma[(uf, ano)] += (numero(l[i_pag]) or 0.0) + ((numero(l[i_gra]) or 0.0) if i_gra is not None else 0.0)
                    except IndexError:
                        continue
        logger.info("ANAC %d: %d UFs", ano, len({u for (u, a) in soma if a == ano}))
    obs = [Observacao(indicador_id="uf.aero_passageiros", entidade_tipo=ENTIDADE, entidade_chave=uf, periodo_referencia=f"{ano}-01-01",
                      valor=round(v), granularidade="ano", metadados={**FONTE, "versao": VERSAO}, versao_metodo=VERSAO) for (uf, ano), v in soma.items()]
    escopo = {**FONTE, "anos": [ANO_INICIO, ano_fim], "faltas": faltas, "completo": not faltas}
    return obs, escopo
