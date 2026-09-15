"""
Conector CAPES/Sucupira — Dados Abertos de Pós-Graduação
Fonte: dadosabertos.capes.gov.br (CKAN)
Sem API REST de consulta — usa CKAN para descobrir URLs de CSV e baixa o mais recente.
Documentado em: https://dadosabertos.capes.gov.br/dataset/
"""
import logging
import httpx
from typing import Any
from functools import lru_cache

logger = logging.getLogger(__name__)

CAPES_CKAN_BASE = "https://dadosabertos.capes.gov.br"

# Slugs dos datasets mais relevantes para o Motor da Inovação
DATASETS = {
    "programas": "br-capes-colsucup-prog-2021a2024-2024-01-01",       # Programas de PG + notas
    "docentes":  "br-capes-colsucup-docente-2021a2024-2024-01-01",    # Docentes por programa
    "discentes": "br-capes-colsucup-discente-2021a2024-2024-01-01",   # Discentes matriculados
    "bolsistas": "br-capes-bolsas-pais-2024",                          # Bolsistas no país
}

async def _ckan_package_show(client: httpx.AsyncClient, package_id: str) -> dict | None:
    """Busca metadados de um dataset CKAN pelo slug."""
    try:
        r = await client.get(
            f"{CAPES_CKAN_BASE}/api/3/action/package_show",
            params={"id": package_id},
            timeout=15,
        )
        if r.status_code == 200:
            data = r.json()
            if data.get("success"):
                return data["result"]
    except Exception as e:
        logger.warning(f"CAPES CKAN package_show falhou ({package_id}): {e}")
    return None

async def _search_dataset(client: httpx.AsyncClient, query: str) -> list[dict]:
    """Busca datasets por palavra-chave no CKAN da CAPES."""
    try:
        r = await client.get(
            f"{CAPES_CKAN_BASE}/api/3/action/package_search",
            params={"q": query, "rows": 5, "sort": "metadata_modified desc"},
            timeout=15,
        )
        if r.status_code == 200:
            data = r.json()
            if data.get("success"):
                return data["result"].get("results", [])
    except Exception as e:
        logger.warning(f"CAPES CKAN search falhou: {e}")
    return []

def _csv_url_from_package(pkg: dict) -> str | None:
    """Extrai a URL do CSV mais recente de um package CKAN."""
    resources = pkg.get("resources", [])
    csvs = [r for r in resources if r.get("format", "").upper() in ("CSV", "XLSX")]
    if not csvs:
        return None
    # Prefere o mais recente
    csvs.sort(key=lambda r: r.get("last_modified", r.get("created", "")), reverse=True)
    return csvs[0].get("url")

async def buscar_programas_pg(
    area_conhecimento: str | None = None,
    uf: str | None = None,
    ies: str | None = None,
) -> dict[str, Any]:
    """
    Retorna metadados e URL de download dos programas de pós-graduação CAPES.
    Filtragem por área/UF/IES é feita no cliente (os CSVs são grandes — não baixamos aqui).
    """
    async with httpx.AsyncClient(headers={"User-Agent": "Motor4P-UFPR/1.0 (motor4p@ufpr.br)"}) as client:
        # Busca o dataset de programas
        pkg = await _ckan_package_show(client, DATASETS["programas"])

        # Fallback: busca por palavra-chave
        if not pkg:
            results = await _search_dataset(client, "programas pós-graduação stricto sensu 2024")
            pkg = results[0] if results else None

        if not pkg:
            return {
                "disponivel": False,
                "motivo": "Dataset de programas CAPES não encontrado via CKAN",
                "fonte": CAPES_CKAN_BASE,
            }

        csv_url = _csv_url_from_package(pkg)
        recursos = [
            {
                "nome": r.get("name", ""),
                "formato": r.get("format", ""),
                "url": r.get("url", ""),
                "modificado": r.get("last_modified", ""),
            }
            for r in pkg.get("resources", [])[:8]
        ]

        return {
            "disponivel": True,
            "dataset_titulo": pkg.get("title", ""),
            "dataset_notas": (pkg.get("notes", "") or "")[:300],
            "csv_url": csv_url,
            "recursos": recursos,
            "filtros_disponiveis": {
                "area_conhecimento": area_conhecimento,
                "uf": uf,
                "ies": ies,
                "nota": "Filtragem local após download — CSVs contêm colunas NM_AREA_CONHECIMENTO, SG_UF_IES, NM_IES",
            },
            "campos_principais": [
                "CD_PROGRAMA_IES", "NM_PROGRAMA_IES", "NM_AREA_CONHECIMENTO",
                "NM_GRANDE_AREA_CONHECIMENTO", "NM_IES", "SG_UF_IES",
                "NM_MUNICIPIO_PROGRAMA_IES", "AN_INICIO", "CD_CONCEITO_PROGRAMA",
                "DS_SITUACAO_PROGRAMA",
            ],
            "fonte": CAPES_CKAN_BASE,
            "url_portal": f"{CAPES_CKAN_BASE}/dataset/",
            "periodo": "2021–2024",
        }

async def buscar_bolsistas(uf: str | None = None) -> dict[str, Any]:
    """Retorna metadados e URL de download dos bolsistas CAPES no país."""
    async with httpx.AsyncClient(headers={"User-Agent": "Motor4P-UFPR/1.0 (motor4p@ufpr.br)"}) as client:
        results = await _search_dataset(client, "bolsistas programas bolsas país 2024")
        pkg = results[0] if results else None
        if not pkg:
            return {"disponivel": False, "motivo": "Dataset de bolsistas CAPES não encontrado", "fonte": CAPES_CKAN_BASE}

        csv_url = _csv_url_from_package(pkg)
        return {
            "disponivel": True,
            "dataset_titulo": pkg.get("title", ""),
            "csv_url": csv_url,
            "filtro_uf": uf,
            "nota": "Colunas incluem NM_IES, SG_UF_IES, AN_CONCESSAO, NM_MODALIDADE, QT_BOLSA",
            "fonte": CAPES_CKAN_BASE,
        }
