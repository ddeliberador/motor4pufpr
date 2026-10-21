"""
L2 · ANATEL — Acessos de banda larga fixa (SCM) por município.
Fonte: Dados Abertos ANATEL, arquivo "Acessos – Banda Larga Fixa" (ZIP com um
CSV por ano; colunas Ano, Mês, ..., Município, Código IBGE Município,
Tecnologia, Meio de Acesso, ..., Acessos). Licença: ODbL (dados.gov.br).

Guarda, por município, o último mês de cada ano (e o mês mais recente do ano
corrente): total de acessos e acessos por fibra.
"""
from __future__ import annotations

import logging
import os
from collections import defaultdict

from ..baixar import abrir_csvs, baixar
from ..csv_util import indice, ler_linhas, numero
from ..municipios import TabelaMunicipios
from ..postgrest import Indicador, Observacao

logger = logging.getLogger(__name__)

ID = "anatel_bl"
JOB = "series-municipais:anatel_bl"
VERSAO = "anatel-bl-v1-2026-10"
URL = os.environ.get("ANATEL_BL_URL", "https://www.anatel.gov.br/dadosabertos/PDA/Acessos/Banda_Larga_Fixa.zip")
FONTE = {"fonte": "ANATEL — Dados Abertos (Acessos Banda Larga Fixa)", "fonte_url": URL, "licenca": "ODbL"}

INDICADORES = [
    Indicador(id="mun.bl_acessos", nome="Acessos de banda larga fixa", natureza="estoque", unidade="acessos", periodicidade="mensal",
              camada_mapa="L2", fonte_chave="anatel",
              descricao="Acessos SCM ativos no município no último mês de cada ano (segmento vazio = todas as tecnologias; 'fibra' = acessos por fibra óptica).",
              metodologia="Soma de 'Acessos' por Código IBGE no arquivo Acessos Banda Larga Fixa da ANATEL, por ano/mês; fibra quando Tecnologia ou Meio de Acesso contém 'fibra'."),
]


def coletar(municipios: TabelaMunicipios, amostra: int | None = None) -> tuple[list[Observacao], dict]:
    caminho = baixar(URL)
    # (ibge, ano, mes) -> {"": total, "fibra": fibra}
    soma: dict[tuple[str, int, int], dict[str, float]] = defaultdict(lambda: {"": 0.0, "fibra": 0.0})
    arquivos = 0
    lidas = 0
    for nome, fluxo in abrir_csvs(caminho):
        arquivos += 1
        cab, linhas = ler_linhas(fluxo, amostra=amostra)
        assert cab is not None
        i_ano = indice(cab, "ano")
        i_mes = indice(cab, "mes", "mês")
        i_ibge = indice(cab, "codigo ibge", "código ibge", "cod_ibge", "codigo_ibge")
        i_tec = indice(cab, "tecnologia", obrigatorio=False)
        i_meio = indice(cab, "meio de acesso", "meio_acesso", obrigatorio=False)
        i_ac = indice(cab, "acessos")
        for l in linhas:
            lidas += 1
            try:
                ibge = municipios.ibge_valido(l[i_ibge])
                if not ibge:
                    continue
                ano, mes = int(float(l[i_ano])), int(float(l[i_mes]))
                ac = numero(l[i_ac]) or 0.0
            except (ValueError, IndexError):
                continue
            chave = (ibge, ano, mes)
            soma[chave][""] += ac
            texto = " ".join(x for x in [l[i_tec] if i_tec is not None else "", l[i_meio] if i_meio is not None else ""] if x).lower()
            if "fibra" in texto:
                soma[chave]["fibra"] += ac
        logger.info("%s: %d linhas lidas", nome, lidas)

    # Último mês disponível de cada ano, por município.
    ultimo_mes: dict[tuple[str, int], int] = {}
    for (ibge, ano, mes) in soma:
        if mes > ultimo_mes.get((ibge, ano), 0):
            ultimo_mes[(ibge, ano)] = mes
    obs: list[Observacao] = []
    for (ibge, ano), mes in ultimo_mes.items():
        v = soma[(ibge, ano, mes)]
        for seg in ("", "fibra"):
            obs.append(Observacao("mun.bl_acessos", ibge, f"{ano:04d}-{mes:02d}-01", v[seg], "mes", seg, metadados=FONTE, versao_metodo=VERSAO))
    return obs, {"url": URL, "arquivos": arquivos, "linhas": lidas, "municipios": len({k[0] for k in ultimo_mes}), "completo": amostra is None}
