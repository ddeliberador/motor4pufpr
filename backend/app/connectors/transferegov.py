"""
MOTOR 4P UFPR - Transferegov Connector
Conector para a API de Dados Abertos do Transferegov (PostgREST).

Base: https://api-publica.transferegov.gestao.gov.br
Não exige autenticação (é o módulo de dados abertos — diferente da API
transacional de compras, que exige credenciamento formal e NÃO é o que
usamos aqui).

Documentação: https://www.gov.br/transferegov/pt-br/ferramentas-gestao/dados-abertos
"""
import logging
from typing import List, Dict, Any, Optional

from .base import BaseConnector

logger = logging.getLogger(__name__)

TRANSFEREGOV_BASE = "https://api-publica.transferegov.gestao.gov.br"


class TransferegovConnector(BaseConnector):
    """
    Conector para Dados Abertos do Transferegov — planos de trabalho,
    execução orçamentária/financeira e transferências da União.
    """

    def __init__(self):
        super().__init__()
        self.base_url = TRANSFEREGOV_BASE

    def get_source_name(self) -> str:
        return "Transferegov"

    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """Busca planos de trabalho por objeto (palavra-chave)"""
        return await self.search_planos_trabalho(query)

    # TODO: confirmar nome exato da tabela contra o Swagger publicado pelo Transferegov
    async def search_planos_trabalho(self, query: str, uf: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Busca planos de trabalho cujo objeto contenha a palavra-chave (ilike).
        Sintaxe de filtro PostgREST: coluna=operador.valor
        """
        params: Dict[str, str] = {
            "objeto_proposta": f"ilike.*{query}*",
            "limit": str(limit),
            "order": "data_inicio_vigencia.desc",
        }
        if uf:
            params["uf_proponente"] = f"eq.{uf}"
        try:
            data = await self.get(
                f"{self.base_url}/plano_trabalho_resumo",
                params=params,
                use_cache=True,
            )
            return data if isinstance(data, list) else []
        except Exception as e:
            logger.warning(f"Transferegov API error: {e}")
            return []

    async def listar_tabela(
        self,
        tabela: str,
        filtros: Optional[Dict[str, str]] = None,
        select: Optional[str] = None,
        order: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Consulta genérica a qualquer tabela exposta pela API (48 tabelas
        cobrindo planos de ação, execução financeira, convênios e transferências
        especiais — ver documentação oficial para a lista completa)."""
        params: Dict[str, str] = dict(filtros or {})
        if select:
            params["select"] = select
        if order:
            params["order"] = order
        params["limit"] = str(limit)
        params["offset"] = str(offset)
        try:
            data = await self.get(f"{self.base_url}/{tabela}", params=params, use_cache=True)
            return data if isinstance(data, list) else []
        except Exception as e:
            logger.warning(f"Transferegov API error ({tabela}): {e}")
            return []
