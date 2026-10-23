"""
Transporte · ANTT — carga ferroviária originada por UF e ano.
Fonte: dados abertos da ANTT (CKAN), conjunto "Produção origem–destino" das
concessionárias ferroviárias: uma linha por fluxo (mês/ano, ferrovia,
mercadoria, origem e destino com UF, toneladas úteis TU, TKU).

Série por UF (entidade_tipo 'uf'): soma de TU com origem na UF no ano.
O conjunto pode ser indicado diretamente por ANTT_FERRO_PACOTE (id no CKAN).
"""
from __future__ import annotations

import logging
import os
from collections import defaultdict

from ..baixar import abrir_csvs, baixar
from ..csv_util import ano_de, indice, ler_linhas, numero
from ..municipios import TabelaMunicipios
from ..postgrest import Indicador, Observacao
from .ckan_antt import recursos_csv

logger = logging.getLogger(__name__)

ID = "antt_ferro"
JOB = "series-uf:antt_ferro"
VERSAO = "antt-ferro-v1-2026-10"
ENTIDADE = "uf"
PACOTE = os.environ.get("ANTT_FERRO_PACOTE", "producao-origem-destino")
FONTE = {"fonte": "ANTT — Produção origem–destino (dados abertos)", "fonte_url": "https://dados.antt.gov.br/", "licenca": "dados públicos"}
UFS = {"AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"}

INDICADORES = [
    Indicador(id="uf.ferro_tu", nome="Carga ferroviária originada", natureza="fluxo", unidade="toneladas úteis", periodicidade="anual",
              camada_mapa="L2", fonte_chave="antt",
              descricao="Toneladas úteis transportadas pelas concessionárias ferroviárias com origem na UF, por ano.",
              metodologia="Soma da coluna TU por UF de origem e ano nos CSVs de produção origem–destino da ANTT (CKAN)."),
]


def somar_csv(caminho, amostra: int | None = None) -> dict[tuple[str, int], float]:
    soma: dict[tuple[str, int], float] = defaultdict(float)
    for _, fluxo in abrir_csvs(caminho):
        cab, linhas = ler_linhas(fluxo, amostra=amostra)
        assert cab is not None
        i_uf = indice(cab, "uf_origem", "uf origem", "sg_uf_origem", "estado_origem")
        i_tu = indice(cab, "tu", "toneladas uteis", "tonelada util")
        i_ano = indice(cab, "ano", "mes_ano", "mes/ano", "data")
        for l in linhas:
            try:
                uf = l[i_uf].strip().upper()[-2:]
                if uf not in UFS:
                    continue
                ano = ano_de(l[i_ano])
                if ano is None:
                    continue
                soma[(uf, ano)] += numero(l[i_tu]) or 0.0
            except (IndexError, ValueError):
                continue
    return soma


def coletar(_municipios: TabelaMunicipios, amostra: int | None = None) -> tuple[list[Observacao], dict]:
    recursos = recursos_csv(PACOTE)
    if not recursos:
        raise RuntimeError(f"CKAN da ANTT não devolveu CSV para o conjunto {PACOTE}; defina ANTT_FERRO_PACOTE")
    soma: dict[tuple[str, int], float] = defaultdict(float)
    for rec in recursos:
        try:
            for k, v in somar_csv(baixar(rec["url"]), amostra).items():
                soma[k] += v
        except RuntimeError as e:
            logger.warning("ANTT ferro %s: %s", rec["nome"], e)
    obs = [Observacao(indicador_id="uf.ferro_tu", entidade_tipo=ENTIDADE, entidade_chave=uf, periodo_referencia=f"{ano}-01-01",
                      valor=round(v, 1), granularidade="ano", metadados={**FONTE, "versao": VERSAO}, versao_metodo=VERSAO) for (uf, ano), v in soma.items() if v > 0]
    anos = sorted({a for _, a in soma})
    return obs, {**FONTE, "recursos": len(recursos), "anos": [anos[0], anos[-1]] if anos else None, "completo": True}
