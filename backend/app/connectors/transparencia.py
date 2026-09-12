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
        número de convênio. Sem isso a API responde 400. Quando o período
        pedido for maior que ~1 mês, a busca é fatiada automaticamente em
        janelas mensais e os resultados são concatenados.
        """
        logger.info(f"Transparência convênios search: {query}")
        hoje = datetime.utcnow().date()
        fim = self._parse_date(data_final) or hoje
        inicio = self._parse_date(data_inicial) or (fim - timedelta(days=30))
        if inicio > fim:
            inicio, fim = fim, inicio

        results: List[Dict[str, Any]] = []
        for janela_ini, janela_fim in self._month_windows(inicio, fim):
            if len(results) >= limit:
                break
            results.extend(
                await self._fetch_agreements_window(
                    query=query,
                    data_inicial=janela_ini.strftime("%d/%m/%Y"),
                    data_final=janela_fim.strftime("%d/%m/%Y"),
                    uf=uf,
                    limit=limit - len(results),
                )
            )
        return results[:limit]

    @staticmethod
    def _parse_date(value: Optional[str]):
        """Aceita dd/mm/aaaa ou aaaa-mm-dd"""
        if not value:
            return None
        for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
            try:
                return datetime.strptime(value, fmt).date()
            except ValueError:
                continue
        logger.warning(f"Transparência: data em formato não reconhecido: {value}")
        return None

    @staticmethod
    def _month_windows(inicio, fim, dias: int = 30):
        """Fatiamento do período em janelas de até `dias` (limite da API)"""
        janelas = []
        cursor = inicio
        while cursor <= fim:
            proximo = min(cursor + timedelta(days=dias - 1), fim)
            janelas.append((cursor, proximo))
            cursor = proximo + timedelta(days=1)
        return janelas

    async def _fetch_agreements_window(
        self,
        query: str,
        data_inicial: str,
        data_final: str,
        uf: Optional[str],
        limit: int,
        max_paginas: int = 3,
    ) -> List[Dict[str, Any]]:
        """Consulta uma janela de até 1 mês, paginando até `max_paginas`"""
        results: List[Dict[str, Any]] = []
        termo = (query or "").lower().strip()
        for pagina in range(1, max_paginas + 1):
            if len(results) >= limit:
                break
            params: Dict[str, str] = {
                "pagina": str(pagina),
                "dataInicial": data_inicial,
                "dataFinal": data_final,
            }
            if uf:
                params["uf"] = uf
            try:
                data = await self.get(
                    f"{self.base_url}/convenios",
                    params=params,
                    headers=self._headers(),
                    use_cache=True,
                )
            except Exception as e:
                logger.warning(f"Transparência API error ({data_inicial}-{data_final} p{pagina}): {e}")
                break

            items = data if isinstance(data, list) else data.get("data", [])
            if not items:
                break

            # A API não faz busca livre por objeto: filtro client-side
            # (campos reais validados: dimConvenio.objeto, convenente.nome, orgao.nome)
            if termo:
                filtrados = [
                    i for i in items
                    if termo in str((i.get("dimConvenio") or {}).get("objeto", "")).lower()
                ]
                items = filtrados or items

            for item in items:
                if len(results) >= limit:
                    break
                results.append(self._parse_agreement(item))
        return results

    @staticmethod
    def _parse_agreement(item: Dict[str, Any]) -> Dict[str, Any]:
        """Parsing do wrapper dimConvenio/convenente/orgao da resposta real"""
        dim = item.get("dimConvenio") or {}
        convenente = item.get("convenente") or {}
        orgao = item.get("orgao") or {}
        municipio = convenente.get("municipio") or {}
        return {
            "number": dim.get("numero", "") or item.get("numero", ""),
            "object": dim.get("objeto", ""),
            "organ": orgao.get("nome", ""),
            "value": item.get("valorLiberado", 0) or item.get("valor", 0),
            "status": item.get("situacao", "") or dim.get("situacao", ""),
            "start_date": item.get("dataInicioVigencia", ""),
            "end_date": item.get("dataFinalVigencia", ""),
            "proponent": convenente.get("nome", ""),
            "uf": (municipio.get("uf") or {}).get("sigla", "") if isinstance(municipio.get("uf"), dict) else "",
            "municipio": municipio.get("nomeIBGE", "") if isinstance(municipio, dict) else "",
        }


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
