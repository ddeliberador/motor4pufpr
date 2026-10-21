"""
L1 · ANEEL — Geração distribuída (micro e minigeração) por município.
Fonte: Portal de Dados Abertos ANEEL (CKAN), conjunto "Relação de
empreendimentos de geração distribuída" (CSV; colunas CodMunicipioIbge,
DthAtualizaCadastralEmpreend, MdaPotenciaInstaladaKW, SigTipoGeracao...).

Série reconstruída: potência acumulada (kW) e nº de unidades por ano de
conexão, por município; segmento 'UFV' = solar fotovoltaica.
"""
from __future__ import annotations

import logging
import os
import re
from collections import defaultdict

import httpx

from ..baixar import UA, abrir_csvs, baixar
from ..csv_util import indice, ler_linhas, numero
from ..municipios import TabelaMunicipios
from ..postgrest import Indicador, Observacao

logger = logging.getLogger(__name__)

ID = "aneel_gd"
JOB = "series-municipais:aneel_gd"
VERSAO = "aneel-gd-v1-2026-10"
CKAN = "https://dadosabertos.aneel.gov.br/api/3/action"
URL_FIXA = os.environ.get("ANEEL_GD_URL")  # opcional: pula a descoberta via CKAN
FONTE = {"fonte": "ANEEL — Dados Abertos (empreendimentos de geração distribuída)", "fonte_url": "https://dadosabertos.aneel.gov.br/", "licenca": "ODbL"}

INDICADORES = [
    Indicador(id="mun.gd_potencia_kw", nome="Geração distribuída: potência instalada acumulada", natureza="estoque", unidade="kW", periodicidade="anual",
              camada_mapa="L1", fonte_chave="aneel",
              descricao="Potência instalada acumulada de micro e minigeração distribuída ao fim de cada ano (segmento vazio = todas as fontes; 'UFV' = solar).",
              metodologia="Soma de MdaPotenciaInstaladaKW por CodMunicipioIbge e ano de DthAtualizaCadastralEmpreend, acumulada ao longo dos anos. Série reconstruída a partir do cadastro vigente: unidades desativadas não entram."),
    Indicador(id="mun.gd_unidades", nome="Geração distribuída: unidades acumuladas", natureza="estoque", unidade="unidades", periodicidade="anual",
              camada_mapa="L1", fonte_chave="aneel",
              descricao="Número acumulado de empreendimentos de geração distribuída ao fim de cada ano.",
              metodologia="Contagem de empreendimentos por CodMunicipioIbge e ano de DthAtualizaCadastralEmpreend, acumulada. Série reconstruída."),
]


def descobrir_url() -> str:
    if URL_FIXA:
        return URL_FIXA
    r = httpx.get(f"{CKAN}/package_search", params={"q": "geração distribuída empreendimento", "rows": 10}, headers=UA, timeout=60)
    r.raise_for_status()
    melhor: tuple[int, str] | None = None
    for pacote in r.json().get("result", {}).get("results", []):
        for rec in pacote.get("resources", []):
            if str(rec.get("format", "")).upper() != "CSV":
                continue
            nome = f"{pacote.get('name','')} {rec.get('name','')}".lower()
            if "empreendimento" not in nome or "distribu" not in nome:
                continue
            tam = int(rec.get("size") or 0)
            if melhor is None or tam > melhor[0]:
                melhor = (tam, rec["url"])
    if not melhor:
        raise RuntimeError("CKAN da ANEEL não devolveu o CSV de empreendimentos de geração distribuída; defina ANEEL_GD_URL")
    return melhor[1]


def coletar(municipios: TabelaMunicipios, amostra: int | None = None) -> tuple[list[Observacao], dict]:
    url = descobrir_url()
    caminho = baixar(url)
    # (ibge, ano) -> {seg: [kw, unidades]}
    por_ano: dict[tuple[str, int], dict[str, list[float]]] = defaultdict(lambda: defaultdict(lambda: [0.0, 0.0]))
    lidas = 0
    for _, fluxo in abrir_csvs(caminho):
        cab, linhas = ler_linhas(fluxo, amostra=amostra)
        assert cab is not None
        i_ibge = indice(cab, "codmunicipioibge", "municipio ibge", "cod_ibge")
        i_data = indice(cab, "dthatualizacadastralempreend", "dthconexao", "data conexao", "dthatualiza")
        i_kw = indice(cab, "mdapotenciainstaladakw", "potencia instalada", "potencia_kw")
        i_tipo = indice(cab, "sigtipogeracao", "tipo geracao", obrigatorio=False)
        for l in linhas:
            lidas += 1
            try:
                ibge = municipios.ibge_valido(l[i_ibge])
                if not ibge:
                    continue
                # datas vêm como dd/mm/aaaa ou aaaa-mm-dd
                anos = re.findall(r"\b(19\d{2}|20\d{2})\b", l[i_data])
                if not anos:
                    continue
                ano = int(anos[0])
                kw = numero(l[i_kw]) or 0.0
            except (ValueError, IndexError):
                continue
            tipo = (l[i_tipo].strip().upper() if i_tipo is not None else "")
            for seg in ("", tipo) if tipo in ("UFV",) else ("",):
                por_ano[(ibge, ano)][seg][0] += kw
                por_ano[(ibge, ano)][seg][1] += 1
    anos = sorted({a for _, a in por_ano})
    if not anos:
        raise RuntimeError("nenhuma linha válida no CSV de geração distribuída")
    ano_max = anos[-1]
    # Acumula por município ao longo dos anos (só anos com algum dado no país).
    obs: list[Observacao] = []
    acumulado: dict[tuple[str, str], list[float]] = defaultdict(lambda: [0.0, 0.0])
    ibges = sorted({i for i, _ in por_ano})
    for ano in range(anos[0], ano_max + 1):
        for ibge in ibges:
            for seg in ("", "UFV"):
                add = por_ano.get((ibge, ano), {}).get(seg)
                if add:
                    acumulado[(ibge, seg)][0] += add[0]
                    acumulado[(ibge, seg)][1] += add[1]
                kw, n = acumulado[(ibge, seg)]
                if n == 0:
                    continue
                obs.append(Observacao("mun.gd_potencia_kw", ibge, f"{ano}-12-31", round(kw, 2), "ano", seg, "reconstruida", metadados={**FONTE, "fonte_url": url}, versao_metodo=VERSAO))
                obs.append(Observacao("mun.gd_unidades", ibge, f"{ano}-12-31", n, "ano", seg, "reconstruida", metadados={**FONTE, "fonte_url": url}, versao_metodo=VERSAO))
    return obs, {"url": url, "linhas": lidas, "municipios": len(ibges), "anos": [anos[0], ano_max], "completo": amostra is None}
