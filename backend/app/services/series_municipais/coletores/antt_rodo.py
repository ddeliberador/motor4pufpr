"""
Transporte · ANTT — volume de veículos nas praças de pedágio das rodovias
federais concedidas, por UF e ano.
Fonte: dados abertos da ANTT (CKAN), conjunto "Volume de tráfego por praça
de pedágio" (uma linha por praça, mês e categoria, com concessionária,
praça, sentido, categoria e volume). A UF vem da coluna de UF quando
existe; senão, do nome da praça ("Praça 3 - BR-116/SP"). Cobre só rodovias
concedidas, nunca a malha inteira.

Série por UF (entidade_tipo 'uf'): soma dos volumes no ano.
"""
from __future__ import annotations

import logging
import os
import re
from collections import defaultdict

from ..baixar import abrir_csvs, baixar
from ..csv_util import ano_de, indice, ler_linhas, numero
from ..municipios import TabelaMunicipios
from ..postgrest import Indicador, Observacao
from .ckan_antt import recursos_csv

logger = logging.getLogger(__name__)

ID = "antt_rodo"
JOB = "series-uf:antt_rodo"
VERSAO = "antt-rodo-v1-2026-10"
ENTIDADE = "uf"
PACOTE = os.environ.get("ANTT_RODO_PACOTE", "volume-trafego-praca-pedagio")
FONTE = {"fonte": "ANTT — Volume de tráfego por praça de pedágio (dados abertos)", "fonte_url": "https://dados.antt.gov.br/", "licenca": "dados públicos"}
UFS = {"AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"}

INDICADORES = [
    Indicador(id="uf.rodo_veiculos", nome="Veículos em rodovias federais concedidas", natureza="fluxo", unidade="veículos", periodicidade="anual",
              camada_mapa="L2", fonte_chave="antt",
              descricao="Veículos registrados nas praças de pedágio das concessões rodoviárias federais da UF, por ano. Só rodovias concedidas.",
              metodologia="Soma da coluna de volume por UF (coluna própria ou sigla no nome da praça) e ano nos CSVs da ANTT (CKAN)."),
]


def uf_da_praca(texto: str) -> str | None:
    m = re.findall(r"/([A-Z]{2})\b", texto.upper())
    for s in reversed(m):
        if s in UFS:
            return s
    return None


def somar_csv(caminho, amostra: int | None = None) -> dict[tuple[str, int], float]:
    soma: dict[tuple[str, int], float] = defaultdict(float)
    for _, fluxo in abrir_csvs(caminho):
        cab, linhas = ler_linhas(fluxo, amostra=amostra)
        assert cab is not None
        i_uf = indice(cab, "uf", "sg_uf", obrigatorio=False)
        i_praca = indice(cab, "praca", "praça", obrigatorio=False)
        i_vol = indice(cab, "volume_total", "volume", "qtd", "quantidade")
        i_ano = indice(cab, "mes_ano", "mes/ano", "ano", "data")
        if i_uf is None and i_praca is None:
            raise RuntimeError(f"CSV sem coluna de UF nem de praça; cabeçalho = {cab[:30]}")
        for l in linhas:
            try:
                uf = l[i_uf].strip().upper() if i_uf is not None else None
                if uf not in UFS:
                    uf = uf_da_praca(l[i_praca]) if i_praca is not None else None
                if not uf:
                    continue
                ano = ano_de(l[i_ano])
                if ano is None:
                    continue
                soma[(uf, ano)] += numero(l[i_vol]) or 0.0
            except (IndexError, ValueError):
                continue
    return soma


def coletar(_municipios: TabelaMunicipios, amostra: int | None = None) -> tuple[list[Observacao], dict]:
    recursos = recursos_csv(PACOTE)
    if not recursos:
        raise RuntimeError(f"CKAN da ANTT não devolveu CSV para o conjunto {PACOTE}; defina ANTT_RODO_PACOTE")
    soma: dict[tuple[str, int], float] = defaultdict(float)
    for rec in recursos:
        try:
            for k, v in somar_csv(baixar(rec["url"]), amostra).items():
                soma[k] += v
        except RuntimeError as e:
            logger.warning("ANTT rodo %s: %s", rec["nome"], e)
    obs = [Observacao(indicador_id="uf.rodo_veiculos", entidade_tipo=ENTIDADE, entidade_chave=uf, periodo_referencia=f"{ano}-01-01",
                      valor=round(v), granularidade="ano", metadados={**FONTE, "versao": VERSAO}, versao_metodo=VERSAO) for (uf, ano), v in soma.items() if v > 0]
    anos = sorted({a for _, a in soma})
    return obs, {**FONTE, "recursos": len(recursos), "anos": [anos[0], anos[-1]] if anos else None, "completo": True}
