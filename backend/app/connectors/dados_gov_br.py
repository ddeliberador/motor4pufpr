"""
MOTOR 4P UFPR - dados.gov.br Connector
Camada de DESCOBERTA de datasets para fontes "a validar" do catálogo BBSIA
(Finep, ABVCAP, FAPs etc.) — não é integração fonte a fonte.

Endpoint validado com chamada real em 2026-09-12:
  GET https://dados.gov.br/dados/api/publico/conjuntos-dados?nomeConjuntoDados={termo}
  Header: chave-api-dados-abertos: <chave gov.br>
  Resposta: lista de metadados de conjuntos de dados.
Sem chave o conector falha explicitamente (nunca devolve dado estimado ou simulado).
"""
import logging
from typing import Any, Dict, List, Optional

from .base import BaseConnector
from ..core.config import settings

logger = logging.getLogger(__name__)

DADOS_GOV_BR_API = "https://dados.gov.br/dados/api/publico/conjuntos-dados"


class DadosGovBrConnector(BaseConnector):
    """Conector do Portal Brasileiro de Dados Abertos (dados.gov.br)"""

    def __init__(self, api_key: Optional[str] = None):
        super().__init__()
        self.api_key = api_key or settings.DADOS_GOV_API_KEY

    def get_source_name(self) -> str:
        return "dados.gov.br"

    def _headers(self) -> Dict[str, str]:
        h = {"accept": "application/json"}
        if self.api_key:
            # Header correto confirmado em 2026-09-12 via chamada real
            h["chave-api-dados-abertos"] = self.api_key
        return h

    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        return await self.buscar(query, limit=kwargs.get("limit", 20))

    async def buscar(self, termo: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Busca datasets por termo livre. Retorna nome, organização, url e
        formatos dos recursos. Levanta erro explícito se a API recusar.
        """
        if not self.api_key:
            raise RuntimeError(
                "dados.gov.br exige chave gratuita (chave-api-dados-abertos). "
                "Configure DADOS_GOV_API_KEY para habilitar a descoberta de datasets."
            )
        data = await self.get(
            DADOS_GOV_BR_API,
            params={
                "nomeConjuntoDados": termo,
                "pagina": "1",
                "tamanho": str(limit),
            },
            headers=self._headers(),
            use_cache=True,
        )
        return self._parse(data, limit)

    @staticmethod
    def _parse(data: List[Dict[str, Any]], limit: int) -> List[Dict[str, Any]]:
        resultados: List[Dict[str, Any]] = []
        for pkg in data[:limit]:
            resultados.append({
                "id": pkg.get("id", ""),
                "nome": pkg.get("title") or pkg.get("nome", ""),
                "organizacao": pkg.get("nomeOrganizacao", ""),
                "url": f"https://dados.gov.br/dados/conjuntos-dados/{pkg.get('nome', '')}",
                "catalogacao": pkg.get("catalogacao", ""),
                "atualizado_em": pkg.get("ultimaAlteracaoMetadados", ""),
                "dados_atualizados_em": pkg.get("ultimaAtualizacaoDados", ""),
                "atualizado": pkg.get("isAtualizado", False),
            })
        return resultados
