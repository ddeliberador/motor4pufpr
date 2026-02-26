"""
MOTOR 4P UFPR - INPE Connector
Conector para dados do INPE (DETER, PRODES — desmatamento e monitoramento)

Documentação: http://terrabrasilis.dpi.inpe.br/
"""
import logging
from typing import List, Dict, Any

from .base import BaseConnector

logger = logging.getLogger(__name__)

INPE_TERRABRASILIS_BASE = "http://terrabrasilis.dpi.inpe.br/api/v1"


class INPEConnector(BaseConnector):
    """
    Conector para INPE — DETER (alertas de desmatamento) e PRODES
    (taxa anual de desmatamento). Relevante para tecnologias ambientais.
    """

    def __init__(self):
        super().__init__()
        self.base_url = INPE_TERRABRASILIS_BASE

    def get_source_name(self) -> str:
        return "INPE"

    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        return await self.search_datasets(query)

    async def search_datasets(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Busca datasets do INPE no dados.gov.br
        """
        logger.info(f"INPE search: {query}")
        try:
            data = await self.get(
                "https://dados.gov.br/api/3/action/package_search",
                params={
                    "q": query,
                    "fq": "organization:instituto-nacional-de-pesquisas-espaciais-inpe",
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
            logger.warning(f"INPE API error: {e}")
            return []
