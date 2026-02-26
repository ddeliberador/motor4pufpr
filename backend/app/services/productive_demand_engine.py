"""
MOTOR 4P UFPR - Productive Demand Engine
Serviço para integração e cruzamento de dados de demanda produtiva
"""
import logging
import asyncio
from typing import Dict, Any, List, Optional

from ..connectors.ibge import IBGEConnector
from ..connectors.capes import CAPESConnector
from ..connectors.cnpq import CNPqConnector
from ..connectors.ipeadata import IPEADataConnector
from ..connectors.pncp import PNCPConnector
from ..connectors.aneel import ANEELConnector
from ..connectors.anp import ANPConnector
from ..connectors.dados_gov import DadosGovConnector
from ..connectors.querido_diario import QueridoDiarioConnector
from ..connectors.transparencia import TransparenciaConnector

logger = logging.getLogger(__name__)


class ProductiveDemandEngine:
    """
    Orquestra coleta e cruzamento de dados de demanda produtiva
    usando múltiplas bases públicas integradas.
    """

    def __init__(self):
        self.ibge = IBGEConnector()
        self.capes = CAPESConnector()
        self.cnpq = CNPqConnector()
        self.ipeadata = IPEADataConnector()
        self.pncp = PNCPConnector()
        self.aneel = ANEELConnector()
        self.anp = ANPConnector()
        self.dados_gov = DadosGovConnector()
        self.querido_diario = QueridoDiarioConnector()
        self.transparencia = TransparenciaConnector()

    async def get_productive_demand(self, query: str, state: Optional[str] = None) -> Dict[str, Any]:
        """
        Busca e cruza dados de demanda produtiva para um termo/área.
        Executa buscas em paralelo em todas as bases integradas.
        """
        # Preparar tabela SIDRA
        sidra_table_id = "3653"
        sidra_params = {"periodo": "last", "localidades": state or "BR"}

        # Executar todas as buscas em paralelo
        results = await asyncio.gather(
            self._safe_call("cnae", self.ibge.search_cnae(query)),
            self._safe_call("sidra", self.ibge.get_sidra_table(sidra_table_id, params=sidra_params)),
            self._safe_call("capes", self.capes.search_scholarships(query)),
            self._safe_call("cnpq", self.cnpq.search(query)),
            self._safe_call("ipeadata", self.ipeadata.search_series(query)),
            self._safe_call("pncp", self.pncp.search_contracts(query)),
            self._safe_call("aneel", self.aneel.search_datasets(query)),
            self._safe_call("anp", self.anp.search_datasets(query)),
            self._safe_call("dados_gov", self.dados_gov.search_datasets(query)),
            self._safe_call("querido_diario", self.querido_diario.search_gazettes(query)),
            self._safe_call("transparencia", self.transparencia.search_agreements(query)),
            return_exceptions=True,
        )

        # Montar resultado consolidado
        consolidated: Dict[str, Any] = {}
        for result in results:
            if isinstance(result, dict):
                consolidated.update(result)
            elif isinstance(result, Exception):
                logger.warning(f"Parallel call failed: {result}")

        return consolidated

    async def _safe_call(self, key: str, coro) -> Dict[str, Any]:
        """Wrapper seguro: nunca deixa uma falha individual derrubar o pipeline"""
        try:
            data = await coro
            return {key: data}
        except Exception as e:
            logger.warning(f"Error in {key}: {e}")
            return {key: []}
