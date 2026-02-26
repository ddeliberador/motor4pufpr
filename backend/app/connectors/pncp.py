"""
MOTOR 4P UFPR - PNCP Connector
Conector para Portal Nacional de Contratações Públicas

Documentação: https://pncp.gov.br/api/consulta/swagger-ui/
"""
import logging
from typing import List, Dict, Any, Optional

from .base import BaseConnector

logger = logging.getLogger(__name__)

PNCP_BASE = "https://pncp.gov.br/api/consulta/v1"


class PNCPConnector(BaseConnector):
    """
    Conector para PNCP (ComprasNet) — licitações e contratações públicas.
    Mapeia demanda governamental por tecnologia e inovação.
    """

    def __init__(self):
        super().__init__()
        self.base_url = PNCP_BASE

    def get_source_name(self) -> str:
        return "PNCP"

    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """Busca contratações por termo"""
        return await self.search_contracts(query)

    async def search_contracts(self, query: str, limit: int = 20, page: int = 1) -> List[Dict[str, Any]]:
        """
        Busca contratações públicas por palavra-chave
        """
        logger.info(f"PNCP search: {query}")
        try:
            data = await self.get(
                f"{self.base_url}/contratacoes/publicacao",
                params={
                    "q": query,
                    "pagina": str(page),
                    "tamanhoPagina": str(limit),
                },
                use_cache=True,
            )
            results = []
            for item in data.get("data", data) if isinstance(data, dict) else data:
                if isinstance(item, dict):
                    results.append({
                        "id": item.get("id", ""),
                        "object": item.get("objetoCompra", item.get("objeto", "")),
                        "organ": item.get("orgaoEntidade", {}).get("razaoSocial", "") if isinstance(item.get("orgaoEntidade"), dict) else "",
                        "modality": item.get("modalidadeNome", ""),
                        "value": item.get("valorTotalEstimado", 0),
                        "status": item.get("situacaoCompra", ""),
                        "publication_date": item.get("dataPublicacao", ""),
                        "uf": item.get("unidadeOrgao", {}).get("ufSigla", "") if isinstance(item.get("unidadeOrgao"), dict) else "",
                        "url": item.get("linkSistemaOrigem", ""),
                    })
            return results
        except Exception as e:
            logger.warning(f"PNCP API error: {e}")
            return []

    async def search_tenders(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Busca licitações abertas"""
        logger.info(f"PNCP tenders search: {query}")
        try:
            data = await self.get(
                f"{self.base_url}/contratacoes/publicacao",
                params={
                    "q": query,
                    "tamanhoPagina": str(limit),
                    "status": "aberta",
                },
                use_cache=True,
            )
            return data.get("data", []) if isinstance(data, dict) else []
        except Exception as e:
            logger.warning(f"PNCP tenders error: {e}")
            return []
