"""
L6 · CAPES — programas de pós-graduação stricto sensu por município.
Fonte: Dados Abertos CAPES (CKAN), conjuntos "Coleta Sucupira — Programas"
(um CSV por ano; colunas AN_BASE, CD_PROGRAMA_IES, NM_AREA_AVALIACAO,
NM_MUNICIPIO_PROGRAMA_IES, SG_UF_PROGRAMA_IES...). Licença: ODbL.

Por município e ano: nº de programas (segmento vazio) e nº na área de
avaliação Ciência da Computação (segmento 'computacao').
"""
from __future__ import annotations

import logging
from collections import defaultdict

import httpx

from ..baixar import UA, abrir_csvs, baixar
from ..csv_util import indice, ler_linhas
from ..municipios import TabelaMunicipios
from ..postgrest import Indicador, Observacao

logger = logging.getLogger(__name__)

ID = "capes_ppg"
JOB = "series-municipais:capes_ppg"
VERSAO = "capes-ppg-v1-2026-10"
CKAN = "https://dadosabertos.capes.gov.br/api/3/action"
FONTE = {"fonte": "CAPES — Dados Abertos (Coleta Sucupira, programas de pós-graduação)", "fonte_url": "https://dadosabertos.capes.gov.br/", "licenca": "ODbL"}

INDICADORES = [
    Indicador(id="mun.ppg", nome="Programas de pós-graduação stricto sensu", natureza="estoque", unidade="programas", periodicidade="anual",
              camada_mapa="L6", fonte_chave="capes",
              descricao="Programas de pós-graduação em funcionamento no município, por ano-base (segmento vazio = todas as áreas; 'computacao' = área Ciência da Computação).",
              metodologia="Contagem de CD_PROGRAMA_IES distintos por município (NM_MUNICIPIO_PROGRAMA_IES + SG_UF_PROGRAMA_IES, casados com a malha IBGE) e AN_BASE, nos CSVs da Coleta Sucupira."),
]


def listar_csvs() -> list[tuple[str, str]]:
    """(nome, url) de todos os CSVs de programas da Coleta Sucupira, todos os períodos."""
    r = httpx.get(f"{CKAN}/package_search", params={"q": "colsucup prog", "rows": 50}, headers=UA, timeout=60)
    r.raise_for_status()
    out: list[tuple[str, str]] = []
    for pacote in r.json().get("result", {}).get("results", []):
        if "prog" not in pacote.get("name", "").lower():
            continue
        for rec in pacote.get("resources", []):
            if str(rec.get("format", "")).upper() == "CSV":
                out.append((rec.get("name") or rec["url"].rsplit("/", 1)[-1], rec["url"]))
    if not out:
        raise RuntimeError("CKAN da CAPES não devolveu CSVs de programas (colsucup prog)")
    return out


def coletar(municipios: TabelaMunicipios, amostra: int | None = None) -> tuple[list[Observacao], dict]:
    csvs = listar_csvs()
    programas: dict[tuple[str, int], dict[str, set[str]]] = defaultdict(lambda: {"": set(), "computacao": set()})
    sem_municipio = 0
    lidas = 0
    for nome, url in csvs:
        caminho = baixar(url)
        for _, fluxo in abrir_csvs(caminho):
            cab, linhas = ler_linhas(fluxo, amostra=amostra)
            assert cab is not None
            i_ano = indice(cab, "an_base", "ano base", "ano_base")
            i_prog = indice(cab, "cd_programa_ies", "cd_programa", "codigo programa")
            i_area = indice(cab, "nm_area_avaliacao", "area avaliacao", obrigatorio=False)
            i_mun = indice(cab, "nm_municipio_programa_ies", "municipio programa", "nm_municipio")
            i_uf = indice(cab, "sg_uf_programa_ies", "sg_uf_programa", "sg_uf")
            for l in linhas:
                lidas += 1
                try:
                    ano = int(float(l[i_ano]))
                    ibge = municipios.por_nome_uf(l[i_mun], l[i_uf])
                except (ValueError, IndexError):
                    continue
                if not ibge:
                    sem_municipio += 1
                    continue
                prog = l[i_prog].strip()
                programas[(ibge, ano)][""].add(prog)
                if i_area is not None and "COMPUTA" in l[i_area].upper():
                    programas[(ibge, ano)]["computacao"].add(prog)
        logger.info("%s: %d linhas acumuladas", nome, lidas)
    obs: list[Observacao] = []
    for (ibge, ano), segs in programas.items():
        for seg, conj in segs.items():
            if seg == "" or conj:
                obs.append(Observacao("mun.ppg", ibge, f"{ano}-12-31", float(len(conj)), "ano", seg, metadados=FONTE, versao_metodo=VERSAO))
    return obs, {"csvs": len(csvs), "linhas": lidas, "sem_municipio": sem_municipio, "municipios": len({k[0] for k in programas}), "completo": amostra is None}
