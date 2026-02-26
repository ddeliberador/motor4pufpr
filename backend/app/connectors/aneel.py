"""
MOTOR 4P UFPR - ANEEL Connector
Conector para dados abertos da ANEEL (energia elétrica, P&D)

Documentação: https://dadosabertos.aneel.gov.br/
"""
import logging
from typing import List, Dict, Any

from .base import BaseConnector

logger = logging.getLogger(__name__)

ANEEL_BASE = "https://dadosabertos.aneel.gov.br/api/3/action"


class ANEELConnector(BaseConnector):
    """
    Conector para ANEEL — dados de geração distribuída, P&D regulado,
    e empreendimentos energéticos.
    """

    def __init__(self):
        super().__init__()
        self.base_url = ANEEL_BASE

    def get_source_name(self) -> str:
        return "ANEEL"

    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """Busca datasets da ANEEL por termo"""
        return await self.search_datasets(query)

    async def search_datasets(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Busca datasets no portal de dados abertos da ANEEL
        """
        logger.info(f"ANEEL search: {query}")
        try:
            data = await self.get(
                f"{self.base_url}/package_search",
                params={"q": query, "rows": str(limit)},
                use_cache=True,
            )
            results = []
            for pkg in data.get("result", {}).get("results", []):
                resources = pkg.get("resources", [])
                results.append({
                    "id": pkg.get("id", ""),
                    "title": pkg.get("title", ""),
                    "description": pkg.get("notes", ""),
                    "organization": pkg.get("organization", {}).get("title", "ANEEL"),
                    "resources_count": len(resources),
                    "formats": list({r.get("format", "").upper() for r in resources if r.get("format")}),
                    "last_modified": pkg.get("metadata_modified", ""),
                    "url": f"https://dadosabertos.aneel.gov.br/dataset/{pkg.get('name', '')}",
                })
            return results
        except Exception as e:
            logger.warning(f"ANEEL API error: {e}")
            return []

    async def get_generation_data(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Busca dados de geração distribuída
        resource_id do dataset 'Geração Distribuída' da ANEEL
        """
        try:
            data = await self.get(
                f"{self.base_url}/datastore_search",
                params={
                    "resource_id": "b1bd71e7-d0ad-4214-9053-cbd58e9564a7",
                    "limit": str(limit),
                },
                use_cache=True,
            )
            return data.get("result", {}).get("records", [])
        except Exception as e:
            logger.warning(f"ANEEL generation data error: {e}")
            return []
