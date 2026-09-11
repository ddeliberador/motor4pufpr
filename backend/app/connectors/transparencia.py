"""
MOTOR 4P UFPR - Portal da Transparência Connector
Conector para API do Portal da Transparência (CGU)

Documentação: https://api.portaldatransparencia.gov.br/swagger-ui/index.html
"""
import logging
from datetime import datetime, timedelta
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

    async def search_agreements(
        self,
        query: str,
        limit: int = 20,
        data_inicial: Optional[str] = None,
        data_final: Optional[str] = None,
        uf: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Busca convênios federais por objeto.

        Validado contra a API real: /convenios exige um filtro restritivo —
        período de até 1 mês (dd/mm/aaaa), convenente, órgão, localidade ou
        número de convênio. Sem isso a API responde 400. Default: último mês.
        """
        logger.info(f"Transparência convênios search: {query}")
        if not data_final:
            hoje = datetime.utcnow().date()
            data_final = hoje.strftime("%d/%m/%Y")
            if not data_inicial:
                data_inicial = (hoje - timedelta(days=30)).strftime("%d/%m/%Y")
        params: Dict[str, str] = {"pagina": "1"}
        if data_inicial and data_final:
            params["dataInicial"] = data_inicial
            params["dataFinal"] = data_final
        if uf:
            params["uf"] = uf
        try:
            data = await self.get(
                f"{self.base_url}/convenios",
                params=params,
                headers=self._headers(),
                use_cache=True,
            )
            results = []
            items = data if isinstance(data, list) else data.get("data", [])
            # A API não faz busca livre por objeto: filtro client-side
            # (campos reais validados: dimConvenio.objeto, convenente.nome, orgao.nome)
            termo = (query or "").lower().strip()
            if termo:
                filtrados = [
                    i for i in items
                    if termo in str((i.get("dimConvenio") or {}).get("objeto", "")).lower()
                ]
                items = filtrados or items
            for item in items[:limit]:
                dim = item.get("dimConvenio") or {}
                convenente = item.get("convenente") or {}
                orgao = item.get("orgao") or {}
                results.append({
                    "number": dim.get("numero", ""),
                    "object": dim.get("objeto", ""),
                    "organ": orgao.get("nome", ""),
                    "value": item.get("valorLiberado", 0) or item.get("valor", 0),
                    "status": item.get("situacao", ""),
                    "start_date": item.get("dataInicioVigencia", ""),
                    "end_date": item.get("dataFinalVigencia", ""),
                    "proponent": convenente.get("nome", ""),
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
