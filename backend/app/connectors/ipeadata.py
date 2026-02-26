"""
MOTOR 4P UFPR - IPEAData Connector
Conector para API do IPEAData (indicadores socioeconômicos)

Documentação: http://www.ipeadata.gov.br/api/
"""
import logging
from typing import List, Dict, Any, Optional

from .base import BaseConnector

logger = logging.getLogger(__name__)

IPEADATA_BASE = "http://www.ipeadata.gov.br/api/odata4"


class IPEADataConnector(BaseConnector):
    """
    Conector para IPEAData — séries históricas de indicadores
    socioeconômicos do Brasil (PIB, emprego, produção industrial, etc.)
    """

    def __init__(self):
        super().__init__()
        self.base_url = IPEADATA_BASE

    def get_source_name(self) -> str:
        return "IPEAData"

    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """Busca séries por termo"""
        return await self.search_series(query)

    async def search_series(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Busca séries temporais do IPEAData por termo
        """
        logger.info(f"IPEAData search: {query}")
        try:
            data = await self.get(
                f"{self.base_url}/Metadados",
                params={
                    "$filter": f"contains(SERNOME,'{query}')",
                    "$top": str(limit),
                    "$select": "SERCODIGO,SERNOME,SERSTATUS,SERTEMA,SERATUALIZACAO,SERFONTE,SERCOMENTARIO,FNTSIGLA,FNTNOME,PAICODIGO",
                },
                use_cache=True,
            )
            results = []
            for item in data.get("value", []):
                results.append({
                    "code": item.get("SERCODIGO", ""),
                    "name": item.get("SERNOME", ""),
                    "theme": item.get("SERTEMA", ""),
                    "source": item.get("FNTNOME", ""),
                    "source_acronym": item.get("FNTSIGLA", ""),
                    "last_update": item.get("SERATUALIZACAO", ""),
                    "country": item.get("PAICODIGO", "BRA"),
                    "comment": item.get("SERCOMENTARIO", ""),
                    "status": item.get("SERSTATUS", ""),
                })
            return results
        except Exception as e:
            logger.warning(f"IPEAData API error: {e}")
            return []

    async def get_series_values(self, series_code: str, last_n: int = 12) -> List[Dict[str, Any]]:
        """
        Retorna valores recentes de uma série IPEAData
        """
        try:
            data = await self.get(
                f"{self.base_url}/Metadados('{series_code}')/Valores",
                params={
                    "$top": str(last_n),
                    "$orderby": "VALDATA desc",
                },
                use_cache=True,
            )
            return [
                {
                    "date": v.get("VALDATA", ""),
                    "value": v.get("VALVALOR"),
                }
                for v in data.get("value", [])
            ]
        except Exception as e:
            logger.warning(f"IPEAData series values error: {e}")
            return []
