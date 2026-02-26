"""
MOTOR 4P UFPR - FNDE Connector
Conector para dados do FNDE (repasses educacionais)

Documentação: https://www.fnde.gov.br/dadosabertos/
"""
import logging
from typing import List, Dict, Any

from .base import BaseConnector

logger = logging.getLogger(__name__)

FNDE_BASE = "https://dados.gov.br/api/3/action"


class FNDEConnector(BaseConnector):
    """
    Conector para FNDE — repasses educacionais por programa e região.
    Mapeia investimento público em educação.
    """

    def __init__(self):
        super().__init__()
        self.base_url = FNDE_BASE

    def get_source_name(self) -> str:
        return "FNDE"

    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        return await self.search_datasets(query)

    async def search_datasets(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        logger.info(f"FNDE search: {query}")
        try:
            data = await self.get(
                f"{self.base_url}/package_search",
                params={
                    "q": query,
                    "fq": "organization:fundo-nacional-de-desenvolvimento-da-educacao-fnde",
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
            logger.warning(f"FNDE API error: {e}")
            return []
