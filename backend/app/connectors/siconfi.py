"""
MOTOR 4P UFPR - SICONFI Connector (Tesouro Nacional)
Conector para API do SICONFI — finanças públicas municipais e estaduais

Documentação: https://apidatalake.tesouro.gov.br/docs/siconfi/
"""
import logging
from typing import List, Dict, Any, Optional

from .base import BaseConnector

logger = logging.getLogger(__name__)

SICONFI_BASE = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt"


class SICONFIConnector(BaseConnector):
    """
    Conector para SICONFI — dados de finanças públicas de estados e municípios.
    Útil para mapear investimento público em CT&I por região.
    """

    def __init__(self):
        super().__init__()
        self.base_url = SICONFI_BASE

    def get_source_name(self) -> str:
        return "SICONFI"

    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """Busca declarações de entes (não é full-text search)"""
        return await self.get_entes()

    async def get_entes(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Lista entes da federação cadastrados"""
        try:
            data = await self.get(f"{self.base_url}/entes", use_cache=True)
            items = data.get("items", []) if isinstance(data, dict) else []
            return [
                {
                    "cod_ibge": e.get("cod_ibge", ""),
                    "ente": e.get("ente", ""),
                    "capital": e.get("capital", ""),
                    "uf": e.get("uf", ""),
                    "regiao": e.get("regiao", ""),
                    "populacao": e.get("populacao", 0),
                }
                for e in items[:limit]
            ]
        except Exception as e:
            logger.warning(f"SICONFI entes error: {e}")
            return []

    async def get_fiscal_data(self, cod_ibge: str, year: int = 2023) -> Dict[str, Any]:
        """
        Busca dados fiscais (RREO) de um ente
        """
        try:
            data = await self.get(
                f"{self.base_url}/rreo",
                params={
                    "an_exercicio": str(year),
                    "id_ente": cod_ibge,
                    "nr_periodo": "6",
                },
                use_cache=True,
            )
            return data
        except Exception as e:
            logger.warning(f"SICONFI fiscal data error: {e}")
            return {}
