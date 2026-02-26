"""
MOTOR 4P UFPR - Portal Dados Abertos Connector
Conector genérico para o Portal Brasileiro de Dados Abertos (dados.gov.br)

Documentação: https://dados.gov.br/swagger-ui/
"""
import logging
from typing import List, Dict, Any, Optional

from .base import BaseConnector

logger = logging.getLogger(__name__)

DADOS_GOV_BASE = "https://dados.gov.br/api/3/action"


class DadosGovConnector(BaseConnector):
    """
    Conector para Portal Dados Abertos — catálogo central de datasets
    do governo federal brasileiro. Inclui RAIS, CAGED, IBAMA, INPE, etc.
    """

    def __init__(self):
        super().__init__()
        self.base_url = DADOS_GOV_BASE

    def get_source_name(self) -> str:
        return "DadosGov"

    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """Busca datasets no portal"""
        return await self.search_datasets(query, organization=kwargs.get("organization"))

    async def search_datasets(
        self, query: str, organization: Optional[str] = None, limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Busca datasets no Portal Dados Abertos
        """
        logger.info(f"DadosGov search: {query}")
        try:
            params: Dict[str, str] = {"q": query, "rows": str(limit)}
            if organization:
                params["fq"] = f"organization:{organization}"

            data = await self.get(
                f"{self.base_url}/package_search",
                params=params,
                use_cache=True,
            )
            results = []
            for pkg in data.get("result", {}).get("results", []):
                resources = pkg.get("resources", [])
                org = pkg.get("organization", {})
                results.append({
                    "id": pkg.get("id", ""),
                    "title": pkg.get("title", ""),
                    "description": pkg.get("notes", "")[:300],
                    "organization": org.get("title", "") if isinstance(org, dict) else "",
                    "resources_count": len(resources),
                    "formats": list({r.get("format", "").upper() for r in resources if r.get("format")}),
                    "tags": [t.get("display_name", "") for t in pkg.get("tags", [])],
                    "last_modified": pkg.get("metadata_modified", ""),
                    "url": f"https://dados.gov.br/dados/conjuntos-dados/{pkg.get('name', '')}",
                })
            return results
        except Exception as e:
            logger.warning(f"DadosGov API error: {e}")
            return []

    async def get_dataset_resources(self, dataset_id: str) -> List[Dict[str, Any]]:
        """Retorna recursos (arquivos) de um dataset"""
        try:
            data = await self.get(
                f"{self.base_url}/package_show",
                params={"id": dataset_id},
                use_cache=True,
            )
            resources = data.get("result", {}).get("resources", [])
            return [
                {
                    "id": r.get("id", ""),
                    "name": r.get("name", ""),
                    "format": r.get("format", ""),
                    "url": r.get("url", ""),
                    "size": r.get("size"),
                    "last_modified": r.get("last_modified", ""),
                }
                for r in resources
            ]
        except Exception as e:
            logger.warning(f"DadosGov resources error: {e}")
            return []
