"""
MOTOR 4P UFPR - DOU Connector (Imprensa Nacional)
Conector para Diário Oficial da União

API: https://www.in.gov.br/servicos/diario-oficial-da-uniao
Alternativa: Querido Diário para diários municipais
"""
import logging
from typing import List, Dict, Any, Optional

from .base import BaseConnector

logger = logging.getLogger(__name__)

IMPRENSA_NACIONAL_BASE = "https://www.in.gov.br/leiturajornal"


class DOUConnector(BaseConnector):
    """
    Conector para Diário Oficial da União.
    Busca publicações oficiais: editais, portarias, chamadas de fomento.
    """

    def __init__(self):
        super().__init__()
        self.base_url = IMPRENSA_NACIONAL_BASE

    def get_source_name(self) -> str:
        return "DOU"

    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """Busca publicações no DOU"""
        return await self.search_publications(query)

    async def search_publications(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Busca publicações no Diário Oficial da União via API da Imprensa Nacional
        """
        logger.info(f"DOU search: {query}")
        try:
            data = await self.get(
                f"{self.base_url}",
                params={
                    "q": query,
                    "exactDate": "",
                    "p": "1",
                    "delta": str(limit),
                },
                use_cache=True,
            )
            # A API retorna HTML em alguns endpoints; tenta JSON
            if isinstance(data, list):
                return [
                    {
                        "title": item.get("title", ""),
                        "section": item.get("section", ""),
                        "date": item.get("date", ""),
                        "organ": item.get("artCategory", ""),
                        "url": item.get("urlTitle", ""),
                        "content_preview": item.get("content", "")[:200],
                    }
                    for item in data[:limit]
                ]
            return []
        except Exception as e:
            logger.warning(f"DOU API error: {e}")
            return []
