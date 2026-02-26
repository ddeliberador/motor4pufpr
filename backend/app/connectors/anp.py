"""
MOTOR 4P UFPR - ANP Connector
Conector para dados abertos da ANP (petróleo, gás, biocombustíveis)

Documentação: https://dados.gov.br/dados/organizacoes/visualizar/agencia-nacional-do-petroleo-gas-natural-e-biocombustiveis-anp
"""
import logging
from typing import List, Dict, Any

from .base import BaseConnector

logger = logging.getLogger(__name__)

ANP_BASE = "https://dados.gov.br/api/3/action"


class ANPConnector(BaseConnector):
    """
    Conector para ANP — dados de produção de petróleo, gás,
    biocombustíveis e P&D obrigatório no setor de energia.
    """

    def __init__(self):
        super().__init__()
        self.base_url = ANP_BASE

    def get_source_name(self) -> str:
        return "ANP"

    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """Busca datasets da ANP"""
        return await self.search_datasets(query)

    async def search_datasets(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Busca datasets da ANP no portal dados.gov.br
        """
        logger.info(f"ANP search: {query}")
        try:
            data = await self.get(
                f"{self.base_url}/package_search",
                params={
                    "q": query,
                    "fq": "organization:agencia-nacional-do-petroleo-gas-natural-e-biocombustiveis-anp",
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
                    "description": pkg.get("notes", ""),
                    "resources_count": len(resources),
                    "formats": list({r.get("format", "").upper() for r in resources if r.get("format")}),
                    "last_modified": pkg.get("metadata_modified", ""),
                    "url": f"https://dados.gov.br/dados/conjuntos-dados/{pkg.get('name', '')}",
                })
            return results
        except Exception as e:
            logger.warning(f"ANP API error: {e}")
            return []
