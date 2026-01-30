"""
MOTOR 4P UFPR - Productive Demand Engine
Serviço para integração e cruzamento de dados de demanda produtiva
"""
import logging
from typing import Dict, Any, List, Optional

from ..connectors.ibge import IBGEConnector
from ..connectors.capes import CAPESConnector
from ..connectors.cnpq import CNPqConnector
# Futuro: importar CAGEDConnector, RAISConnector

logger = logging.getLogger(__name__)

class ProductiveDemandEngine:
    """
    Orquestra coleta e cruzamento de dados de demanda produtiva
    """
    def __init__(self):
        self.ibge = IBGEConnector()
        self.capes = CAPESConnector()
        self.cnpq = CNPqConnector()
        # self.caged = CAGEDConnector()  # Futuro
        # self.rais = RAISConnector()    # Futuro

    async def get_productive_demand(self, query: str, state: Optional[str] = None) -> Dict[str, Any]:
        """
        Busca e cruza dados de demanda produtiva para um termo/área
        Inclui dados do SIDRA (produção industrial, etc)
        """
        # IBGE: produção industrial, mercado de trabalho
        cnae_results = await self.ibge.search_cnae(query)
        # Exemplo: tabela 3653 = Produção Industrial Mensal
        sidra_table_id = "3653"
        sidra_params = {"periodo": "last", "localidades": state or "BR"}  # "last" pega último período disponível
        sidra_results = await self.ibge.get_sidra_table(sidra_table_id, params=sidra_params)

        # CAPES: bolsas e programas de pós
        capes_results = await self.capes.search_scholarships(query)
        # CNPq: grupos de pesquisa
        cnpq_results = await self.cnpq.search(query)
        # Futuro: emprego formal (CAGED/RAIS)

        return {
            "cnae": cnae_results,
            "sidra": sidra_results,
            "capes": capes_results,
            "cnpq": cnpq_results,
            # "caged": ...,
            # "rais": ...,
        }
