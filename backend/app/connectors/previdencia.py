"""
MOTOR 4P UFPR - Previdência Connector
Conector para INSS e PREVIC (benefícios e fundos de pensão)

Fonte: https://dadosabertos.dataprev.gov.br/ via dados.gov.br
"""
import logging
from typing import List, Dict, Any

from .base import BaseConnector

logger = logging.getLogger(__name__)


class PrevidenciaConnector(BaseConnector):
    """
    Conector para dados previdenciários — aposentadorias, pensões,
    auxílios (INSS) e fundos de pensão complementar (PREVIC).
    """

    def __init__(self):
        super().__init__()
        self.base_url = "https://dados.gov.br/api/3/action"

    def get_source_name(self) -> str:
        return "INSS/PREVIC"

    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        return await self.search_datasets(query)

    async def search_datasets(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        logger.info(f"Previdência search: {query}")
        try:
            data = await self.get(
                f"{self.base_url}/package_search",
                params={
                    "q": f"{query} previdência INSS benefício aposentadoria pensão",
                    "rows": str(limit),
                },
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
                    "url": f"https://dados.gov.br/dados/conjuntos-dados/{pkg.get('name', '')}",
                })
            return results
        except Exception as e:
            logger.warning(f"Previdência API error: {e}")
            return []
