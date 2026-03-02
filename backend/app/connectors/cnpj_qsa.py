"""
MOTOR 4P UFPR - CNPJ/QSA Connector
Conector para dados cadastrais de empresas e quadro societário

Fonte: Receita Federal via BrasilAPI e dados.gov.br
"""
import logging
from typing import List, Dict, Any, Optional

from .base import BaseConnector

logger = logging.getLogger(__name__)


class CNPJQSAConnector(BaseConnector):
    """
    Conector para CNPJ completo — razão social, CNAE, porte, endereço,
    e quadro societário (QSA) para mapeamento de vínculos corporativos.
    """

    def __init__(self):
        super().__init__()
        self.brasilapi_url = "https://brasilapi.com.br/api/cnpj/v1"

    def get_source_name(self) -> str:
        return "CNPJ/QSA"

    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        return await self.search_datasets(query)

    async def lookup_cnpj(self, cnpj: str) -> Optional[Dict[str, Any]]:
        """Busca dados completos de um CNPJ incluindo QSA"""
        cnpj_clean = cnpj.replace(".", "").replace("/", "").replace("-", "")
        logger.info(f"CNPJ lookup: {cnpj_clean}")
        try:
            data = await self.get(f"{self.brasilapi_url}/{cnpj_clean}", use_cache=True)
            qsa = data.get("qsa", [])
            return {
                "cnpj": data.get("cnpj", cnpj_clean),
                "razao_social": data.get("razao_social", ""),
                "nome_fantasia": data.get("nome_fantasia", ""),
                "cnae_fiscal": data.get("cnae_fiscal", ""),
                "cnae_descricao": data.get("cnae_fiscal_descricao", ""),
                "porte": data.get("porte", ""),
                "natureza_juridica": data.get("natureza_juridica", ""),
                "uf": data.get("uf", ""),
                "municipio": data.get("municipio", ""),
                "situacao_cadastral": data.get("descricao_situacao_cadastral", ""),
                "capital_social": data.get("capital_social", 0),
                "qsa": [{
                    "nome": s.get("nome_socio", ""),
                    "qualificacao": s.get("qualificacao_socio", ""),
                    "cnpj_cpf": s.get("cnpj_cpf_do_socio", ""),
                    "data_entrada": s.get("data_entrada_sociedade", ""),
                } for s in qsa],
                "total_socios": len(qsa),
            }
        except Exception as e:
            logger.warning(f"CNPJ lookup error: {e}")
            return None

    async def search_datasets(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Busca datasets de CNPJ no dados.gov.br"""
        logger.info(f"CNPJ/QSA dataset search: {query}")
        try:
            data = await self.get(
                "https://dados.gov.br/api/3/action/package_search",
                params={
                    "q": f"{query} CNPJ empresa cadastro",
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
                    "url": f"https://dados.gov.br/dados/conjuntos-dados/{pkg.get('name', '')}",
                })
            return results
        except Exception as e:
            logger.warning(f"CNPJ dataset search error: {e}")
            return []
