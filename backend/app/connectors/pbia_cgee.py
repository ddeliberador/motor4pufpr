"""
MOTOR 4P UFPR - Conector PBIA/CGEE
Plano Brasileiro de Inteligência Artificial (MCTI/CGEE).

Fonte: relatório Power BI "Publish to Web" que alimenta
https://pbia.cgee.org.br/resultados. Não é uma API oficial documentada:
consultamos o endpoint público de query do relatório. Se a CGEE republicar o
relatório com outro schema, as consultas falham e devolvem lista vazia
(com warning no log), sem derrubar o restante do Motor.

Eixos:
1. Infraestrutura e Desenvolvimento de IA
2. Capacitação, Formação e Difusão de IA
3. Governo e Serviços Públicos
4. Setor Produtivo
5. Governança e Regulação
"""
import logging
from typing import Any, Dict, List

from cachetools import TTLCache
from tenacity import retry, stop_after_attempt, wait_exponential

from .base import BaseConnector

logger = logging.getLogger(__name__)

CLUSTER = "https://wabi-brazil-south-b-primary-api.analysis.windows.net"
RESOURCE_KEY = "2dd48ef9-3404-4f8c-8db1-e2b8f068a158"
REPORT_ID = "2dd48ef9-3404-4f8c-8db1-e2b8f068a158"
MODEL_ID = 7407363

QUERY_URL = f"{CLUSTER}/public/reports/querydata?synchronous=true"

HEADERS = {
    "Content-Type": "application/json;charset=UTF-8",
    "X-PowerBI-ResourceKey": RESOURCE_KEY,
    "Accept": "application/json, text/plain, */*",
}

COLUNAS_EIXO = [
    "Ações", "Programa", "Status", "Descrição", "Metas",
    "Entrega 1", "Entrega 2", "Entregas previstas para 2026",
]
CHAVES_EIXO = [
    "acao", "programa", "status", "descricao", "metas",
    "entrega_1", "entrega_2", "entregas_previstas_2026",
]

TTL_24H = 24 * 60 * 60


def _build_query_body(entity: str, columns: list[str]) -> dict:
    select = [
        {
            "Column": {
                "Expression": {"SourceRef": {"Source": "t"}},
                "Property": col,
            },
            "Name": f"{entity}.{col}",
        }
        for col in columns
    ]
    return {
        "version": "1.0.0",
        "queries": [
            {
                "Query": {
                    "Commands": [
                        {
                            "SemanticQueryDataShapeCommand": {
                                "Query": {
                                    "Version": 2,
                                    "From": [{"Name": "t", "Entity": entity, "Type": 0}],
                                    "Select": select,
                                },
                                "Binding": {
                                    "Primary": {"Groupings": [{"Projections": list(range(len(columns)))}]},
                                    "DataReduction": {"DataVolume": 4, "Primary": {"Window": {"Count": 5000}}},
                                    "Version": 1,
                                },
                            }
                        }
                    ]
                },
                "QueryId": "",
                "ApplicationContext": {"DatasetId": None, "Sources": [{"ReportId": REPORT_ID}]},
            }
        ],
        "cancelQueries": [],
        "modelId": MODEL_ID,
    }


def _decode_dsr(response_json: dict, ncols: int) -> list[list]:
    dsr = response_json["results"][0]["result"]["data"]["dsr"]
    ds0 = dsr["DS"][0]
    dm0 = ds0["PH"][0]["DM0"]
    value_dicts = ds0["ValueDicts"]
    dicts = [value_dicts.get(f"D{i}", []) for i in range(ncols)]
    prev = [None] * ncols
    decoded_rows = []
    for entry in dm0:
        null_mask = entry.get("Ø", 0)
        repeat_mask = entry.get("R", 0)
        c_iter = iter(entry.get("C", []))
        row = [None] * ncols
        for i in range(ncols):
            bit = 1 << i
            if null_mask & bit:
                row[i] = None
            elif repeat_mask & bit:
                row[i] = prev[i]
            else:
                row[i] = next(c_iter)
        prev = row
        decoded_rows.append(row)
    result = []
    for row in decoded_rows:
        result.append([dicts[i][v] if v is not None else None for i, v in enumerate(row)])
    return result


class PBIACGEEConnector(BaseConnector):
    """Conector para o painel público do PBIA (MCTI/CGEE)."""

    def __init__(self):
        super().__init__()
        # Dado muda pouco: cache de 24h.
        self.cache = TTLCache(maxsize=100, ttl=TTL_24H)

    def get_source_name(self) -> str:
        return "PBIA/CGEE"

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def _query(self, entity: str, columns: List[str]) -> List[list]:
        cache_key = f"pbia:{entity}:{'|'.join(columns)}"
        cached = self._get_cached(cache_key)
        if cached is not None:
            return cached
        body = _build_query_body(entity, columns)
        async with self._semaphore:
            if self.client:
                resp = await self.client.post(QUERY_URL, json=body, headers=HEADERS)
            else:
                import httpx
                async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as c:
                    resp = await c.post(QUERY_URL, json=body, headers=HEADERS)
        resp.raise_for_status()
        rows = _decode_dsr(resp.json(), len(columns))
        self._set_cached(cache_key, rows)
        return rows

    async def get_resumo(self) -> List[Dict[str, Any]]:
        """54 ações (tabela "Eixos") com status."""
        try:
            rows = await self._query("Eixos", ["Ações", "Status"])
            return [{"acao": r[0], "status": r[1]} for r in rows]
        except Exception as e:
            logger.warning(f"PBIA/CGEE resumo: {type(e).__name__}: {e}")
            return []

    async def get_eixo_detalhado(self, numero: int) -> List[Dict[str, Any]]:
        """Detalhe de um eixo (1 a 5)."""
        if numero not in range(1, 6):
            logger.warning(f"PBIA/CGEE: eixo inválido {numero}")
            return []
        try:
            rows = await self._query(f"Eixo {numero}", COLUNAS_EIXO)
            return [dict(zip(CHAVES_EIXO, r)) for r in rows]
        except Exception as e:
            logger.warning(f"PBIA/CGEE eixo {numero}: {type(e).__name__}: {e}")
            return []

    async def get_todos_eixos_detalhados(self) -> Dict[int, List[Dict[str, Any]]]:
        return {n: await self.get_eixo_detalhado(n) for n in range(1, 6)}

    async def search(self, query: str, **kwargs) -> List[Any]:
        """Filtra ações (resumo e detalhe dos eixos) por substring case-insensitive."""
        q = (query or "").strip().lower()
        try:
            resumo = await self.get_resumo()
            eixos = await self.get_todos_eixos_detalhados()
        except Exception as e:
            logger.warning(f"PBIA/CGEE search: {type(e).__name__}: {e}")
            return []

        def casa(*campos: Any) -> bool:
            return not q or any(q in str(c).lower() for c in campos if c)

        resultados: List[Dict[str, Any]] = []
        acoes_detalhadas = set()
        for numero, acoes in eixos.items():
            for a in acoes:
                acoes_detalhadas.add(a.get("acao"))
                if casa(a.get("acao"), a.get("descricao"), a.get("metas")):
                    resultados.append({**a, "eixo": numero, "fonte": self.get_source_name()})
        for r in resumo:
            if r["acao"] not in acoes_detalhadas and casa(r["acao"]):
                resultados.append({**r, "eixo": None, "fonte": self.get_source_name()})
        return resultados
