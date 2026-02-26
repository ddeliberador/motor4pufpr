"""
MOTOR 4P UFPR - Brasil API Connector
Conector para Brasil API (CNPJ, IBGE, CEP, etc.)

Documentação: https://brasilapi.com.br/docs
"""
import logging
from typing import List, Dict, Any, Optional

from .base import BaseConnector

logger = logging.getLogger(__name__)

BRASILAPI_BASE = "https://brasilapi.com.br/api"


class BrasilAPIConnector(BaseConnector):
    """
    Conector para Brasil API — dados de CNPJ, CEP, IBGE, bancos, etc.
    Útil para mapear empresas por CNAE e região.
    """

    def __init__(self):
        super().__init__()
        self.base_url = BRASILAPI_BASE

    def get_source_name(self) -> str:
        return "BrasilAPI"

    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """Busca CNPJ (query deve ser um CNPJ válido)"""
        return [await self.get_cnpj(query)] if len(query.replace(".", "").replace("/", "").replace("-", "")) == 14 else []

    async def get_cnpj(self, cnpj: str) -> Dict[str, Any]:
        """
        Consulta dados de um CNPJ na Receita Federal via Brasil API
        """
        cnpj_clean = cnpj.replace(".", "").replace("/", "").replace("-", "")
        logger.info(f"BrasilAPI CNPJ lookup: {cnpj_clean}")
        try:
            data = await self.get(
                f"{self.base_url}/cnpj/v1/{cnpj_clean}",
                use_cache=True,
            )
            return {
                "cnpj": data.get("cnpj", ""),
                "razao_social": data.get("razao_social", ""),
                "nome_fantasia": data.get("nome_fantasia", ""),
                "cnae_fiscal": data.get("cnae_fiscal", ""),
                "cnae_fiscal_descricao": data.get("cnae_fiscal_descricao", ""),
                "cnaes_secundarios": data.get("cnaes_secundarios", []),
                "porte": data.get("porte", ""),
                "natureza_juridica": data.get("natureza_juridica", ""),
                "situacao_cadastral": data.get("situacao_cadastral", ""),
                "uf": data.get("uf", ""),
                "municipio": data.get("municipio", ""),
                "capital_social": data.get("capital_social", 0),
                "qsa": data.get("qsa", []),
            }
        except Exception as e:
            logger.warning(f"BrasilAPI CNPJ error: {e}")
            return {}

    async def get_cptec_forecast(self, city_code: int) -> Dict[str, Any]:
        """Previsão do tempo CPTEC/INPE — contexto regional"""
        try:
            return await self.get(f"{self.base_url}/cptec/v1/clima/previsao/{city_code}", use_cache=True)
        except Exception as e:
            logger.warning(f"BrasilAPI CPTEC error: {e}")
            return {}
