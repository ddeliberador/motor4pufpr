"""
MOTOR 4P UFPR - Querido Diário Connector
Conector para API do Querido Diário (diários oficiais municipais)

Documentação: https://queridodiario.ok.org.br/api/docs
"""
import logging
from typing import List, Dict, Any, Optional

from .base import BaseConnector

logger = logging.getLogger(__name__)

QUERIDO_DIARIO_BASE = "https://queridodiario.ok.org.br/api"


class QueridoDiarioConnector(BaseConnector):
    """
    Conector para Querido Diário — diários oficiais municipais.
    Permite buscar editais, chamadas públicas, licitações em diários oficiais.
    """

    def __init__(self):
        super().__init__()
        self.base_url = QUERIDO_DIARIO_BASE

    def get_source_name(self) -> str:
        return "QueridoDiário"

    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """Busca menções em diários oficiais"""
        return await self.search_gazettes(query)

    async def search_gazettes(
        self, query: str, territory_id: Optional[str] = None, limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Busca em diários oficiais municipais
        """
        logger.info(f"Querido Diário search: {query}")
        try:
            params: Dict[str, str] = {
                "querystring": query,
                "size": str(limit),
                "sort_by": "relevance",
            }
            if territory_id:
                params["territory_ids"] = territory_id

            data = await self.get(
                f"{self.base_url}/gazettes",
                params=params,
                use_cache=True,
            )
            results = []
            for item in data.get("gazettes", []):
                results.append({
                    "territory_id": item.get("territory_id", ""),
                    "territory_name": item.get("territory_name", ""),
                    "state_code": item.get("state_code", ""),
                    "date": item.get("date", ""),
                    "edition": item.get("edition", ""),
                    "is_extra_edition": item.get("is_extra_edition", False),
                    "url": item.get("url", ""),
                    "excerpts": item.get("excerpts", [])[:3],  # primeiros trechos
                    "highlight": item.get("highlight", ""),
                })
            return results
        except Exception as e:
            logger.warning(f"Querido Diário API error: {e}")
            return []
