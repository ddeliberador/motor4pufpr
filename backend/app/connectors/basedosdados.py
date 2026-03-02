"""
MOTOR 4P UFPR - Base dos Dados Connector
Conector para o agregador Base dos Dados (basedosdados.org)

Fonte: https://basedosdados.org/
"""
import logging
from typing import List, Dict, Any

from .base import BaseConnector

logger = logging.getLogger(__name__)


class BaseDosDadosConnector(BaseConnector):
    """
    Conector para Base dos Dados — datasets tratados e prontos para análise,
    cobrindo CNPJ, RAIS, CAGED, PIB, saúde, educação, eleições e mais.
    """

    def __init__(self):
        super().__init__()
        self.base_url = "https://basedosdados.org/api/3/action"

    def get_source_name(self) -> str:
        return "Base dos Dados"

    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        return await self.search_datasets(query)

    async def search_datasets(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        logger.info(f"Base dos Dados search: {query}")
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
                    "organization": pkg.get("organization", {}).get("title", ""),
                    "resources_count": len(resources),
                    "formats": list({r.get("format", "").upper() for r in resources if r.get("format")}),
                    "last_modified": pkg.get("metadata_modified", ""),
                    "url": f"https://basedosdados.org/dataset/{pkg.get('name', '')}",
                    "tags": [t.get("display_name", "") for t in pkg.get("tags", [])][:5],
                })
            return results
        except Exception as e:
            logger.warning(f"Base dos Dados API error: {e}")
            return []
