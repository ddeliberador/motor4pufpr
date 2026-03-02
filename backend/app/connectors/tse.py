"""
MOTOR 4P UFPR - TSE Connector
Conector para dados eleitorais do Tribunal Superior Eleitoral

Fonte: https://dadosabertos.tse.jus.br/
"""
import logging
from typing import List, Dict, Any

from .base import BaseConnector

logger = logging.getLogger(__name__)

TSE_BASE = "https://dadosabertos.tse.jus.br/api/3/action"


class TSEConnector(BaseConnector):
    """
    Conector para TSE — candidaturas, prestação de contas,
    bens declarados, filiados a partidos, resultados eleitorais.
    """

    def __init__(self):
        super().__init__()
        self.base_url = TSE_BASE

    def get_source_name(self) -> str:
        return "TSE"

    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        return await self.search_datasets(query)

    async def search_datasets(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        logger.info(f"TSE search: {query}")
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
                    "description": pkg.get("notes", "")[:300],
                    "resources_count": len(resources),
                    "formats": list({r.get("format", "").upper() for r in resources if r.get("format")}),
                    "last_modified": pkg.get("metadata_modified", ""),
                    "url": f"https://dadosabertos.tse.jus.br/dataset/{pkg.get('name', '')}",
                })
            return results
        except Exception as e:
            logger.warning(f"TSE API error: {e}")
            return []
