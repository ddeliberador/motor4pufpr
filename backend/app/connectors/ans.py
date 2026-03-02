"""
MOTOR 4P UFPR - ANS Connector
Conector para dados de saúde suplementar

Fonte: https://dados.gov.br/ (ANS)
"""
import logging
from typing import List, Dict, Any

from .base import BaseConnector

logger = logging.getLogger(__name__)


class ANSConnector(BaseConnector):
    """
    Conector para ANS — operadoras de planos de saúde,
    beneficiários, reclamações, indicadores de qualidade.
    """

    def __init__(self):
        super().__init__()
        self.base_url = "https://dados.gov.br/api/3/action"

    def get_source_name(self) -> str:
        return "ANS"

    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        return await self.search_datasets(query)

    async def search_datasets(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        logger.info(f"ANS search: {query}")
        try:
            data = await self.get(
                f"{self.base_url}/package_search",
                params={
                    "q": f"{query} saúde suplementar plano ANS operadora",
                    "fq": "organization:agencia-nacional-de-saude-suplementar-ans",
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
            logger.warning(f"ANS API error: {e}")
            return []
