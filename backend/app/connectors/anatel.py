"""
Conector Anatel — Dados de Telecomunicações por Município
Fonte: dados.gov.br (datasets Anatel — conjunto "Meu Município")
Plano de Dados Abertos Anatel 2025-2027 — vigência jun/2025 a jun/2027
Sem API REST — dados publicados como CSV/Excel no dados.gov.br
"""
import logging
import httpx
from typing import Any

logger = logging.getLogger(__name__)

DADOS_GOV_BASE = "https://dados.gov.br"
ANATEL_ORG_ID = "agencia-nacional-de-telecomunicacoes-anatel"

# Datasets conhecidos (confirmados em 14/09/2026)
DATASETS_CONHECIDOS = {
    "meu_municipio": {
        "descricao": "Dados de telecomunicações por município — banda larga fixa, telefonia móvel, fixa e TV por assinatura",
        "tags": ["meu-municipio", "municipio", "telecomunicacoes"],
        "url_referencia": "https://dados.gov.br/dataset?tags=ANATEL&organization=agencia-nacional-de-telecomunicacoes-anatel",
    },
    "banda_larga_fixa": {
        "descricao": "Acessos de Banda Larga Fixa (SCM) por município — histórico",
        "tags": ["banda-larga-fixa", "scm"],
        "url_referencia": "https://dados.gov.br/dataset/acessos-banda-larga-fixa",
    },
    "telefonia_movel": {
        "descricao": "Acessos de Telefonia Móvel (SMP) e Banda Larga Móvel por município",
        "tags": ["telefonia-movel", "smp"],
        "url_referencia": "https://dados.gov.br/dataset/acessos-telefonia-movel",
    },
}

async def _search_anatel_datasets(client: httpx.AsyncClient, query: str) -> list[dict]:
    """Busca datasets da Anatel no dados.gov.br."""
    try:
        # Usa a API CKAN do dados.gov.br com chave se disponível
        import os
        chave = os.getenv("DADOS_GOV_API_KEY", "")
        headers: dict = {"User-Agent": "Motor4P-UFPR/1.0 (motor4p@ufpr.br)"}
        if chave:
            headers["chave-api-dados-abertos"] = chave

        r = await client.get(
            f"{DADOS_GOV_BASE}/dados/api/publico/conjuntos-dados",
            params={
                "nomeConjuntoDados": query,
                "organizacao": ANATEL_ORG_ID,
                "pagina": 1,
                "tamanhoPagina": 5,
            },
            headers=headers,
            timeout=15,
        )
        if r.status_code == 200:
            data = r.json()
            return data if isinstance(data, list) else data.get("data", [])
    except Exception as e:
        logger.warning(f"Anatel dados.gov.br search falhou: {e}")
    return []

async def buscar_cobertura_municipio(
    municipio: str | None = None,
    uf: str | None = None,
    municipio_ibge: str | None = None,
) -> dict[str, Any]:
    """
    Retorna metadados e links de acesso aos dados de cobertura de telecomunicações.
    A filtragem por município é local (CSVs são grandes).
    """
    async with httpx.AsyncClient() as client:
        # Busca datasets Anatel
        datasets_encontrados = await _search_anatel_datasets(client, "telecomunicações município")
        if not datasets_encontrados:
            datasets_encontrados = await _search_anatel_datasets(client, "banda larga")

        resultado_base = {
            "municipio": municipio,
            "uf": uf,
            "municipio_ibge": municipio_ibge,
            "datasets_conhecidos": DATASETS_CONHECIDOS,
            "fonte": "Anatel / dados.gov.br",
            "url_portal": f"{DADOS_GOV_BASE}/dataset?organization={ANATEL_ORG_ID}",
            "plano_dados_abertos": "https://www.gov.br/anatel/pt-br/dados/dados-abertos",
            "vigencia_pda": "junho/2025 a junho/2027",
            "nota_tecnica": (
                "Anatel não expõe API REST de consulta. Dados publicados como CSV/Excel no dados.gov.br. "
                "Para o Motor: mostrar links diretos de download + instrução de filtro por coluna CD_MUNICIPIO (código IBGE)."
            ),
        }

        if datasets_encontrados:
            resultado_base["datasets_encontrados"] = [
                {
                    "titulo": d.get("title", d.get("nome", "")),
                    "descricao": (d.get("notes", d.get("descricao", "")) or "")[:200],
                    "url": d.get("url", f"{DADOS_GOV_BASE}/dataset/{d.get('name', '')}"),
                    "organizacao": d.get("organization", {}).get("title", "Anatel") if isinstance(d.get("organization"), dict) else "Anatel",
                }
                for d in datasets_encontrados[:5]
            ]
            resultado_base["disponivel"] = True
        else:
            resultado_base["disponivel"] = True  # Sempre retorna — links curados já existem
            resultado_base["datasets_encontrados"] = []
            resultado_base["aviso"] = "Busca dinâmica não retornou resultados — use os links curados em datasets_conhecidos"

        # Links diretos curados (confirmados em 14/09/2026)
        resultado_base["links_diretos"] = [
            {
                "label": "Meu Município — banda larga, móvel, fixa, TV",
                "url": "https://informacoes.anatel.gov.br/paineis/acessos/meu-municipio",
                "tipo": "painel_interativo",
            },
            {
                "label": "Acessos Banda Larga Fixa (CSV histórico)",
                "url": "https://dados.gov.br/dataset/acessos-banda-larga-fixa",
                "tipo": "dataset_csv",
            },
            {
                "label": "Acessos Telefonia Móvel (CSV histórico)",
                "url": "https://dados.gov.br/dataset/acessos-telefonia-movel",
                "tipo": "dataset_csv",
            },
            {
                "label": "Qualidade dos Serviços (pesquisa satisfação)",
                "url": "https://dados.gov.br/dataset/qualidade-dos-servicos-de-telecomunicacoes",
                "tipo": "dataset_csv",
            },
        ]

        if municipio_ibge:
            resultado_base["instrucao_filtro"] = (
                f"Após download do CSV, filtrar pela coluna CD_MUNICIPIO = '{municipio_ibge}' "
                f"(código IBGE de {municipio or 'município selecionado'})."
            )

        return resultado_base
