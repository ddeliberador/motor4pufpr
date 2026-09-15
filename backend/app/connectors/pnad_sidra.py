"""
Conector PNAD Contínua via SIDRA/IBGE
A PNAD Contínua já está parcialmente integrada no layer-sidra (Deno),
mas faltava um conector Python dedicado com as séries corretas.

IMPORTANTE: a PNAD antiga encerrou em 2016 — usar apenas PNAD Contínua.
Três modalidades disponíveis via SIDRA:
  - Anual: tabelas 6403, 6407, 6408, 6409
  - Mensal: tabela 6381 (desocupação, subocupação)
  - Trimestral: tabela 4093 (ocupação por setor CNAE)

Documentado em: servicodados.ibge.gov.br/api/docs/agregados?versao=3
"""
import logging
import httpx
from typing import Any

logger = logging.getLogger(__name__)

SIDRA_BASE = "https://servicodados.ibge.gov.br/api/v3/agregados"

# Mapa UF → código IBGE para SIDRA N3
UF_IBGE = {
    "AC":"12","AL":"27","AP":"16","AM":"13","BA":"29","CE":"23","DF":"53","ES":"32","GO":"52",
    "MA":"21","MT":"51","MS":"50","MG":"31","PA":"15","PB":"25","PR":"41","PE":"26","PI":"22",
    "RJ":"33","RN":"24","RS":"43","RO":"11","RR":"14","SC":"42","SP":"35","SE":"28","TO":"17"
}

# Tabelas PNAD Contínua confirmadas (verificadas contra /api/v3/agregados)
TABELAS_PNAD = {
    # Anual
    "6403": {"nome": "Taxa de desocupação — PNAD Contínua Anual", "variaveis": "4099", "periodicidade": "anual"},
    "6407": {"nome": "Rendimento médio mensal real — PNAD Contínua Anual", "variaveis": "5932", "periodicidade": "anual"},
    "6408": {"nome": "Pessoas ocupadas por grupo de atividade — PNAD Contínua Anual", "variaveis": "4090", "periodicidade": "anual"},
    "6409": {"nome": "Nível de ocupação — PNAD Contínua Anual", "variaveis": "4094", "periodicidade": "anual"},
    # Trimestral
    "4093": {"nome": "Pessoas de 14 anos ou mais ocupadas por grupo de atividade — PNAD Contínua Trimestral", "variaveis": "4090", "periodicidade": "trimestral"},
    # Mensal
    "6381": {"nome": "Taxa de desocupação, subocupação e força de trabalho potencial — PNAD Contínua Mensal", "variaveis": "4099", "periodicidade": "mensal"},
}


async def _fetch_sidra_tabela(
    client: httpx.AsyncClient,
    tabela: str,
    variavel: str,
    uf: str | None,
    periodos: str = "-4",
) -> dict | None:
    """Busca uma tabela SIDRA com localidade por UF ou nacional."""
    uf_code = UF_IBGE.get(uf.upper(), "") if uf else ""
    localidade = f"N3/{uf_code}" if uf_code else "N1/all"
    url = (
        f"{SIDRA_BASE}/{tabela}/periodos/{periodos}"
        f"/variaveis/{variavel}"
        f"?localidades={localidade}&formato=JSON"
    )
    try:
        r = await client.get(url, timeout=15)
        if r.status_code == 200:
            data = r.json()
            # SIDRA retorna lista com metadados no índice 0 e dados no restante
            registros = data[1:] if len(data) > 1 else []
            return {
                "tabela": tabela,
                "nome": TABELAS_PNAD[tabela]["nome"],
                "localidade": uf or "Brasil",
                "periodos_retornados": len(registros),
                "amostra": registros[:3],  # 3 registros de amostra
                "url_consulta": url,
            }
    except Exception as e:
        logger.warning(f"SIDRA tabela {tabela}: {e}")
    return None


async def buscar_pnad(
    uf: str | None = None,
    tabelas: list[str] | None = None,
    periodos: str = "-4",
) -> dict[str, Any]:
    """
    Busca dados da PNAD Contínua via API SIDRA.
    Por padrão retorna as 4 últimas referências temporais disponíveis.
    """
    tabelas_buscar = tabelas or list(TABELAS_PNAD.keys())

    async with httpx.AsyncClient(
        headers={"User-Agent": "Motor4P-UFPR/1.0 (motor4p@ufpr.br)"}
    ) as client:
        resultados: list[dict] = []
        for tabela_id in tabelas_buscar:
            if tabela_id not in TABELAS_PNAD:
                continue
            meta = TABELAS_PNAD[tabela_id]
            resultado = await _fetch_sidra_tabela(
                client, tabela_id, meta["variaveis"], uf, periodos
            )
            if resultado:
                resultado["periodicidade"] = meta["periodicidade"]
                resultados.append(resultado)

    return {
        "disponivel": True,
        "fonte": "PNAD Contínua — IBGE via API SIDRA v3",
        "url_sidra": "https://sidra.ibge.gov.br/pesquisa/pnadct/tabelas",
        "url_api": SIDRA_BASE,
        "uf_filtro": uf,
        "uf_ibge": UF_IBGE.get(uf.upper(), None) if uf else None,
        "tabelas_disponíveis": TABELAS_PNAD,
        "resultados": resultados,
        "total_tabelas_consultadas": len(tabelas_buscar),
        "total_com_dados": len(resultados),
        "nota_importante": (
            "A PNAD antiga encerrou em 2016 — usar apenas PNAD Contínua. "
            "Três modalidades: Anual (tabelas 6403/6407/6408/6409), "
            "Trimestral (4093 — ocupados por CNAE) e Mensal (6381 — desocupação). "
            "Nível N3 = UF; N1 = Brasil."
        ),
        "links_diretos": [
            {"label": "PNAD Contínua — IBGE", "url": "https://www.ibge.gov.br/estatisticas/sociais/trabalho/9171-pesquisa-nacional-por-amostra-de-domicilios-continua-mensal.html"},
            {"label": f"SIDRA — tabelas PNAD Contínua{' · ' + uf if uf else ''}", "url": "https://sidra.ibge.gov.br/pesquisa/pnadct/tabelas"},
            {"label": "API SIDRA v3 — documentação", "url": "https://servicodados.ibge.gov.br/api/docs/agregados?versao=3"},
        ],
    }
