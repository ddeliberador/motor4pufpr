"""
Base · OpenAlex — coautoria científica entre instituições brasileiras, por ano.
Fonte: API pública (api.openalex.org), licença CC0. Uma linha em `interacoes`
por par de instituições e ano, com o número de obras em comum em
metadados.peso (a view de fluxos soma esse peso como "laços").

Método: lista as instituições do Brasil (tipos education e facility, com
volume mínimo de obras) e, para cada instituição e ano, pede ao OpenAlex o
agrupamento das obras dela por instituição coautora
(`group_by=authorships.institutions.lineage`). Cada agrupamento vale um par
A–B naquele ano; pares aparecem duas vezes (de A e de B) e ficam com o maior
valor. Pares com menos de MIN_OBRAS obras no ano não entram.

A UF vem de `geo.region` da instituição no OpenAlex; quando falta, o par é
gravado sem UF (conta no catálogo, não desenha arco). É contagem de obras com
afiliação dupla, não prova de projeto conjunto.
"""
from __future__ import annotations

import logging
import os
import time
import unicodedata
from datetime import date

import httpx

from ..baixar import UA

logger = logging.getLogger(__name__)

ID = "openalex_coautoria"
JOB = "interacoes:openalex_coautoria"
VERSAO = "openalex-coautoria-v1-2026-10"
TIPO_COLETA = "interacoes"
API = "https://api.openalex.org"
ANO_INICIO = 2014
MIN_OBRAS_INSTITUICAO = 300   # instituições com menos obras no total ficam fora da lista
MIN_OBRAS = 3                 # pares com menos obras no ano não viram interação
PAUSA = 0.12                  # ~8 req/s, dentro do polite pool do OpenAlex
FONTE = {"fonte": "OpenAlex (api.openalex.org)", "fonte_url": "https://docs.openalex.org/", "licenca": "CC0"}

UF_POR_ESTADO = {
    "acre": "AC", "alagoas": "AL", "amapa": "AP", "amazonas": "AM", "bahia": "BA", "ceara": "CE", "distrito federal": "DF",
    "espirito santo": "ES", "goias": "GO", "maranhao": "MA", "mato grosso": "MT", "mato grosso do sul": "MS", "minas gerais": "MG",
    "para": "PA", "paraiba": "PB", "parana": "PR", "pernambuco": "PE", "piaui": "PI", "rio de janeiro": "RJ", "rio grande do norte": "RN",
    "rio grande do sul": "RS", "rondonia": "RO", "roraima": "RR", "santa catarina": "SC", "sao paulo": "SP", "sergipe": "SE", "tocantins": "TO",
    "federal district": "DF", "state of sao paulo": "SP", "state of rio de janeiro": "RJ", "state of minas gerais": "MG",
}


def _sem_acento(t: str) -> str:
    return unicodedata.normalize("NFD", str(t or "")).encode("ascii", "ignore").decode().lower().strip()


def uf_da_regiao(regiao: str | None) -> str | None:
    """'São Paulo' → 'SP'; 'State of Paraná' → 'PR'; desconhecido → None."""
    if not regiao:
        return None
    r = _sem_acento(regiao)
    if r in UF_POR_ESTADO:
        return UF_POR_ESTADO[r]
    r = r.removeprefix("state of ").removeprefix("estado de ").removeprefix("estado do ").strip()
    return UF_POR_ESTADO.get(r)


def _params(extra: dict | None = None) -> dict:
    p = {"mailto": os.environ.get("OPENALEX_MAILTO", "")} if os.environ.get("OPENALEX_MAILTO") else {}
    p.update(extra or {})
    return p


def _get(cli: httpx.Client, caminho: str, params: dict) -> dict:
    for tentativa in range(4):
        r = cli.get(caminho, params=_params(params))
        if r.status_code == 200:
            return r.json()
        if r.status_code == 429 or r.status_code >= 500:
            time.sleep(3 * (tentativa + 1))
            continue
        raise RuntimeError(f"OpenAlex {caminho}: HTTP {r.status_code} {r.text[:200]}")
    raise RuntimeError(f"OpenAlex {caminho}: sem resposta após 4 tentativas")


def listar_instituicoes(cli: httpx.Client, amostra: int | None = None) -> dict[str, dict]:
    """Instituições do Brasil (education/facility) com volume mínimo, indexadas pelo id OpenAlex (I...)."""
    inst: dict[str, dict] = {}
    cursor = "*"
    while cursor:
        d = _get(cli, "/institutions", {
            "filter": f"country_code:BR,type:education|facility,works_count:>{MIN_OBRAS_INSTITUICAO}",
            "select": "id,display_name,type,geo,works_count", "per-page": 200, "cursor": cursor,
        })
        for i in d.get("results", []):
            oid = str(i["id"]).rsplit("/", 1)[-1]
            geo = i.get("geo") or {}
            inst[oid] = {"id": oid, "nome": i.get("display_name"), "tipo": i.get("type"), "uf": uf_da_regiao(geo.get("region")),
                         "cidade": geo.get("city"), "obras": i.get("works_count")}
            if amostra and len(inst) >= amostra:
                return inst
        cursor = (d.get("meta") or {}).get("next_cursor")
        time.sleep(PAUSA)
    return inst


def coautorias_da_instituicao(cli: httpx.Client, oid: str, ano: int) -> dict[str, int]:
    """{id da instituição coautora: obras em comum no ano}, só o top 200 que o group_by devolve."""
    d = _get(cli, "/works", {
        "filter": f"authorships.institutions.lineage:{oid},publication_year:{ano}",
        "group_by": "authorships.institutions.lineage", "per-page": 200,
    })
    saida: dict[str, int] = {}
    for g in d.get("group_by", []):
        k = str(g.get("key") or "").rsplit("/", 1)[-1]
        if k and k != oid:
            saida[k] = int(g.get("count") or 0)
    return saida


def coletar_interacoes(amostra: int | None = None, ano_inicio: int = ANO_INICIO, ano_fim: int | None = None) -> tuple[list[dict], dict]:
    """Linhas prontas para `interacoes_upsert` e o escopo da coleta."""
    ano_fim = ano_fim or date.today().year
    with httpx.Client(base_url=API, headers=UA, timeout=httpx.Timeout(60.0)) as cli:
        inst = listar_instituicoes(cli, amostra=amostra)
        logger.info("OpenAlex: %d instituições brasileiras", len(inst))
        pares: dict[tuple[int, str, str], int] = {}
        consultas = 0
        for ano in range(ano_inicio, ano_fim + 1):
            for oid in inst:
                for outro, n in coautorias_da_instituicao(cli, oid, ano).items():
                    if outro not in inst or n < MIN_OBRAS:
                        continue
                    a, b = sorted((oid, outro))
                    k = (ano, a, b)
                    pares[k] = max(pares.get(k, 0), n)
                consultas += 1
                time.sleep(PAUSA)
            logger.info("OpenAlex %d: %d pares acumulados (%d consultas)", ano, len(pares), consultas)
    linhas = [montar_linha(inst[a], inst[b], ano, n) for (ano, a, b), n in pares.items()]
    escopo = {**FONTE, "instituicoes": len(inst), "anos": [ano_inicio, ano_fim], "pares": len(linhas), "min_obras": MIN_OBRAS, "completo": True,
              "metodo": "group_by authorships.institutions.lineage por instituição e ano; par = maior contagem dos dois lados"}
    return linhas, escopo


def montar_linha(a: dict, b: dict, ano: int, obras: int) -> dict:
    return {
        "id": f"openalex|{ano}|{a['id']}|{b['id']}", "fonte": "openalex", "tipo": "coautoria", "dimensao": "resultado",
        "origem_helice": "ict", "origem_subtipo": a.get("tipo"), "origem_id": a["id"], "origem_nome": a.get("nome"), "origem_uf": a.get("uf"),
        "destino_helice": "ict", "destino_subtipo": b.get("tipo"), "destino_id": b["id"], "destino_nome": b.get("nome"), "destino_uf": b.get("uf"),
        "data_evento": f"{ano}-01-01", "valor": None, "referencia": None, "tecnologia": None,
        "metadados": {"peso": obras, "obras": obras, "cidade_origem": a.get("cidade"), "cidade_destino": b.get("cidade"), **FONTE, "versao": VERSAO},
    }
