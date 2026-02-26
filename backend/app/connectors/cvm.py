"""
MOTOR 4P UFPR - CVM Connector
Conector para dados abertos da CVM (mercado de capitais)

Documentação: https://dados.cvm.gov.br/
"""
import logging
from typing import List, Dict, Any

from .base import BaseConnector

logger = logging.getLogger(__name__)

CVM_BASE = "https://dados.cvm.gov.br/api/3/action"


class CVMConnector(BaseConnector):
    """
    Conector para CVM — dados de companhias abertas, formulários de referência,
    fundos de investimento, fatos relevantes.
    Útil para mapear investimento corporativo em P&D e inovação.
    """

    def __init__(self):
        super().__init__()
        self.base_url = CVM_BASE

    def get_source_name(self) -> str:
        return "CVM"

    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        return await self.search_datasets(query)

    async def search_datasets(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        logger.info(f"CVM search: {query}")
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
                    "url": f"https://dados.cvm.gov.br/dataset/{pkg.get('name', '')}",
                })
            return results
        except Exception as e:
            logger.warning(f"CVM API error: {e}")
            return []
