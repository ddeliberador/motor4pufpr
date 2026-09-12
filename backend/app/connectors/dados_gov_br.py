"""
MOTOR 4P UFPR - dados.gov.br Connector (CKAN)
Camada de DESCOBERTA de datasets para fontes "a validar" do catálogo BBSIA
(Finep, ABVCAP, FAPs etc.) — não é integração fonte a fonte.

Endpoint validado com chamada real em 2026-09-12:
  GET https://dados.gov.br/api/3/action/package_search?q={termo}   -> HTTP 401
  GET https://dados.gov.br/dados/api/3/action/package_search?q=... -> HTTP 401
Ambos responderam `www-authenticate: Bearer` — o portal federal exige a chave
gratuita (`chave-api-dados`, obtida com conta gov.br). Sem chave o conector
falha explicitamente (nunca devolve dado estimado ou simulado).
"""
import logging
from typing import Any, Dict, List, Optional

from .base import BaseConnector
from ..core.config import settings

logger = logging.getLogger(__name__)

DADOS_GOV_BR_BASE = "https://dados.gov.br/api/3/action"
DADOS_GOV_BR_BASE_ALT = "https://dados.gov.br/dados/api/3/action"


class DadosGovBrConnector(BaseConnector):
    """Conector CKAN do Portal Brasileiro de Dados Abertos (dados.gov.br)"""

    def __init__(self, api_key: Optional[str] = None):
        super().__init__()
        self.api_key = api_key or settings.DADOS_GOV_API_KEY
        self.bases = [DADOS_GOV_BR_BASE, DADOS_GOV_BR_BASE_ALT]

    def get_source_name(self) -> str:
        return "dados.gov.br"

    def _headers(self) -> Dict[str, str]:
        h = {"accept": "application/json"}
        if self.api_key:
            # o portal aceita a chave nos dois formatos documentados
            h["chave-api-dados"] = self.api_key
            h["Authorization"] = f"Bearer {self.api_key}"
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
                "dados.gov.br exige chave gratuita (chave-api-dados). "
                "Configure DADOS_GOV_API_KEY para habilitar a descoberta de datasets."
            )
        ultimo_erro: Optional[Exception] = None
        for base in self.bases:
            try:
                data = await self.get(
                    f"{base}/package_search",
                    params={"q": termo, "rows": str(limit)},
                    headers=self._headers(),
                    use_cache=True,
                )
                return self._parse(data, limit)
            except Exception as e:  # 404 no prefixo -> tenta o alternativo
                logger.warning(f"dados.gov.br falhou em {base}: {e}")
                ultimo_erro = e
        raise RuntimeError(f"dados.gov.br indisponível: {ultimo_erro}")

    @staticmethod
    def _parse(data: Dict[str, Any], limit: int) -> List[Dict[str, Any]]:
        pacotes = (data.get("result") or {}).get("results", [])
        resultados: List[Dict[str, Any]] = []
        for pkg in pacotes[:limit]:
            recursos = pkg.get("resources") or []
            org = pkg.get("organization") or {}
            resultados.append({
                "nome": pkg.get("title") or pkg.get("name", ""),
                "organizacao": org.get("title", "") if isinstance(org, dict) else "",
                "url": f"https://dados.gov.br/dados/conjuntos-dados/{pkg.get('name', '')}",
                "formatos": sorted({(r.get("format") or "").upper() for r in recursos if r.get("format")}),
                "recursos": len(recursos),
                "descricao": (pkg.get("notes") or "")[:300],
                "atualizado_em": pkg.get("metadata_modified", ""),
            })
        return resultados
