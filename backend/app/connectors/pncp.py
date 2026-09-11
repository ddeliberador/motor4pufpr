"""
MOTOR 4P UFPR - PNCP Connector
Conector para Portal Nacional de Contratações Públicas

Documentação: https://pncp.gov.br/api/consulta/swagger-ui/index.html
Manual das APIs de Consultas PNCP (gov.br/pncp)

Notas importantes sobre a API:
- /contratacoes/publicacao exige dataInicial (AAAAMMDD), dataFinal (AAAAMMDD)
  e codigoModalidadeContratacao (int). NÃO aceita busca livre por texto.
- /contratacoes/proposta (propostas em aberto) exige dataFinal e pagina.
"""
import logging
from datetime import date, timedelta
from typing import List, Dict, Any, Optional

from .base import BaseConnector

logger = logging.getLogger(__name__)

PNCP_BASE = "https://pncp.gov.br/api/consulta/v1"


class PNCPConnector(BaseConnector):
    """
    Conector para PNCP (ComprasNet) — licitações e contratações públicas.
    Mapeia demanda governamental por tecnologia e inovação.
    """

    def __init__(self):
        super().__init__()
        self.base_url = PNCP_BASE

    def get_source_name(self) -> str:
        return "PNCP"

    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """Busca contratações por termo"""
        return await self.search_contracts(query, **kwargs)

    @staticmethod
    def _default_dates(
        data_inicial: Optional[str], data_final: Optional[str]
    ) -> tuple[str, str]:
        hoje = date.today()
        final = data_final or hoje.strftime("%Y%m%d")
        inicial = data_inicial or (hoje - timedelta(days=90)).strftime("%Y%m%d")
        return inicial, final

    @staticmethod
    def _normalize(item: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": item.get("id", ""),
            "object": item.get("objetoCompra", item.get("objeto", "")),
            "organ": item.get("orgaoEntidade", {}).get("razaoSocial", "")
            if isinstance(item.get("orgaoEntidade"), dict)
            else "",
            "modality": item.get("modalidadeNome", ""),
            "value": item.get("valorTotalEstimado", 0),
            "status": item.get("situacaoCompra", ""),
            "publication_date": item.get("dataPublicacao", ""),
            "uf": item.get("unidadeOrgao", {}).get("ufSigla", "")
            if isinstance(item.get("unidadeOrgao"), dict)
            else "",
            "url": item.get("linkSistemaOrigem", ""),
        }

    async def contracts_by_publication(
        self,
        data_inicial: Optional[str] = None,
        data_final: Optional[str] = None,
        codigo_modalidade_contratacao: int = 6,
        uf: Optional[str] = None,
        cnpj_orgao: Optional[str] = None,
        pagina: int = 1,
    ) -> List[Dict[str, Any]]:
        """
        Chamada "crua" a /contratacoes/publicacao, sem filtro de texto.
        Datas no formato AAAAMMDD. Modalidade default 6 = Pregão Eletrônico.
        """
        inicial, final = self._default_dates(data_inicial, data_final)
        params: Dict[str, str] = {
            "dataInicial": inicial,
            "dataFinal": final,
            "codigoModalidadeContratacao": str(codigo_modalidade_contratacao),
            "pagina": str(pagina),
        }
        if uf:
            params["uf"] = uf
        if cnpj_orgao:
            params["cnpj"] = cnpj_orgao

        logger.info(f"PNCP publicacao: {params}")
        try:
            data = await self.get(
                f"{self.base_url}/contratacoes/publicacao",
                params=params,
                use_cache=True,
            )
            items = data.get("data", []) if isinstance(data, dict) else data
            return [self._normalize(i) for i in items if isinstance(i, dict)]
        except Exception as e:
            logger.warning(f"PNCP API error: {e}")
            return []

    async def search_contracts(
        self,
        query: str,
        limit: int = 20,
        page: int = 1,
        data_inicial: Optional[str] = None,
        data_final: Optional[str] = None,
        codigo_modalidade_contratacao: int = 6,
        uf: Optional[str] = None,
        cnpj_orgao: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Busca contratações públicas e filtra por palavra-chave NO CLIENTE
        (o endpoint do PNCP não suporta busca livre por texto).
        """
        results = await self.contracts_by_publication(
            data_inicial=data_inicial,
            data_final=data_final,
            codigo_modalidade_contratacao=codigo_modalidade_contratacao,
            uf=uf,
            cnpj_orgao=cnpj_orgao,
            pagina=page,
        )
        termo = (query or "").strip().lower()
        if termo:
            results = [r for r in results if termo in (r.get("object") or "").lower()]
        return results[:limit]

    async def search_tenders(
        self,
        query: str,
        limit: int = 20,
        data_final: Optional[str] = None,
        pagina: int = 1,
    ) -> List[Dict[str, Any]]:
        """
        Contratações com propostas em aberto — /contratacoes/proposta
        (exige apenas dataFinal em AAAAMMDD e pagina).
        Filtro de palavra-chave aplicado no cliente.
        """
        final = data_final or date.today().strftime("%Y%m%d")
        logger.info(f"PNCP proposta search: {query} (dataFinal={final})")
        try:
            data = await self.get(
                f"{self.base_url}/contratacoes/proposta",
                params={"dataFinal": final, "pagina": str(pagina)},
                use_cache=True,
            )
            items = data.get("data", []) if isinstance(data, dict) else data
            results = [self._normalize(i) for i in items if isinstance(i, dict)]
            termo = (query or "").strip().lower()
            if termo:
                results = [r for r in results if termo in (r.get("object") or "").lower()]
            return results[:limit]
        except Exception as e:
            logger.warning(f"PNCP tenders error: {e}")
            return []
