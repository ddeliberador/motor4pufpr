"""
MOTOR 4P UFPR - Portal da Transparência Connector
Conector para API do Portal da Transparência (CGU)

Documentação: https://api.portaldatransparencia.gov.br/swagger-ui/index.html
"""
import logging
from typing import List, Dict, Any, Optional

from .base import BaseConnector

logger = logging.getLogger(__name__)

TRANSPARENCIA_BASE = "https://api.portaldatransparencia.gov.br/api-de-dados"


class TransparenciaConnector(BaseConnector):
    """
    Conector para Portal da Transparência — convênios, despesas,
    CEIS, CNEP, CEPIM (sanções), contratos e emendas parlamentares.
    """

    def __init__(self, api_key: Optional[str] = None):
        super().__init__()
        self.base_url = TRANSPARENCIA_BASE
        self.api_key = api_key  # chave-api-dados obtida no portal

    def get_source_name(self) -> str:
        return "PortalTransparência"

    def _headers(self) -> Dict[str, str]:
        h: Dict[str, str] = {}
        if self.api_key:
            h["chave-api-dados"] = self.api_key
        return h

    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """Busca convênios por tema"""
        return await self.search_agreements(query)

    async def search_agreements(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Busca convênios federais por objeto
        """
        logger.info(f"Transparência convênios search: {query}")
        try:
            data = await self.get(
                f"{self.base_url}/convenios",
                params={"objeto": query, "pagina": "1", "quantidade": str(limit)},
                headers=self._headers(),
                use_cache=True,
            )
            results = []
            items = data if isinstance(data, list) else data.get("data", [])
            for item in items[:limit]:
                results.append({
                    "number": item.get("numero", ""),
                    "object": item.get("objeto", ""),
                    "organ": item.get("orgaoSuperior", ""),
                    "value": item.get("valor", 0),
                    "status": item.get("situacao", ""),
                    "start_date": item.get("dataInicio", ""),
                    "end_date": item.get("dataFim", ""),
                    "proponent": item.get("proponente", ""),
                })
            return results
        except Exception as e:
            logger.warning(f"Transparência API error: {e}")
            return []

    async def search_sanctions(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Busca empresas/pessoas sancionadas (CEIS/CNEP/CEPIM)
        """
        logger.info(f"Transparência sanções search: {query}")
        try:
            data = await self.get(
                f"{self.base_url}/ceis",
                params={"nomeFantasia": query, "pagina": "1", "quantidade": str(limit)},
                headers=self._headers(),
                use_cache=True,
            )
            items = data if isinstance(data, list) else data.get("data", [])
            return [
                {
                    "name": item.get("nomeSancionado", ""),
                    "cnpj_cpf": item.get("cpfCnpjSancionado", ""),
                    "sanction_type": item.get("tipoSancao", ""),
                    "organ": item.get("orgaoSancionador", ""),
                    "start_date": item.get("dataInicioSancao", ""),
                    "end_date": item.get("dataFimSancao", ""),
                }
                for item in items[:limit]
            ]
        except Exception as e:
            logger.warning(f"Transparência sanções error: {e}")
            return []
