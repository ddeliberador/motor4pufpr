"""
MOTOR 4P UFPR - BCB Connector (Banco Central do Brasil)
Conector para APIs do Banco Central: SGS, PTAX, Selic

Documentação: https://dadosabertos.bcb.gov.br/
API SGS: https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados?formato=json
"""
import logging
from typing import List, Dict, Any, Optional

from .base import BaseConnector

logger = logging.getLogger(__name__)

BCB_SGS_BASE = "https://api.bcb.gov.br/dados/serie/bcdata.sgs"
BCB_PTAX_BASE = "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata"

# Séries relevantes do SGS
BCB_SERIES = {
    "selic": {"code": 432, "name": "Taxa Selic (meta)"},
    "ipca": {"code": 433, "name": "IPCA - Variação mensal"},
    "pib_mensal": {"code": 4380, "name": "PIB mensal"},
    "credito_total": {"code": 20539, "name": "Crédito total SFN"},
    "inadimplencia": {"code": 21082, "name": "Inadimplência PF"},
    "cambio_dolar": {"code": 1, "name": "Taxa de câmbio USD"},
    "reservas_internacionais": {"code": 13621, "name": "Reservas internacionais"},
    "base_monetaria": {"code": 1788, "name": "Base monetária"},
    "ibc_br": {"code": 24364, "name": "IBC-Br (proxy PIB mensal)"},
}


class BCBConnector(BaseConnector):
    """
    Conector para Banco Central — indicadores macro: Selic, câmbio,
    crédito, PTAX, reservas internacionais, base monetária.
    """

    def __init__(self):
        super().__init__()

    def get_source_name(self) -> str:
        return "BCB"

    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """Retorna séries disponíveis que casam com o termo"""
        query_lower = query.lower()
        return [
            {"code": v["code"], "name": v["name"], "key": k}
            for k, v in BCB_SERIES.items()
            if query_lower in v["name"].lower() or query_lower in k
        ]

    async def get_series(self, series_code: int, last_n: int = 12) -> List[Dict[str, Any]]:
        """
        Busca últimos valores de uma série do SGS
        """
        logger.info(f"BCB SGS series: {series_code}")
        try:
            data = await self.get(
                f"{BCB_SGS_BASE}.{series_code}/dados/ultimos/{last_n}",
                params={"formato": "json"},
                use_cache=True,
            )
            if isinstance(data, list):
                return [
                    {"date": item.get("data", ""), "value": item.get("valor", "")}
                    for item in data
                ]
            return []
        except Exception as e:
            logger.warning(f"BCB SGS error: {e}")
            return []

    async def get_ptax(self, currency: str = "USD", last_n: int = 10) -> List[Dict[str, Any]]:
        """Busca cotações PTAX"""
        try:
            data = await self.get(
                f"{BCB_PTAX_BASE}/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@di,dataFinalCotacao=@df)",
                params={
                    "@moeda": f"'{currency}'",
                    "@di": "'01-01-2024'",
                    "@df": "'12-31-2025'",
                    "$top": str(last_n),
                    "$orderby": "dataHoraCotacao desc",
                    "$format": "json",
                },
                use_cache=True,
            )
            return data.get("value", [])
        except Exception as e:
            logger.warning(f"BCB PTAX error: {e}")
            return []

    async def get_macro_snapshot(self) -> Dict[str, Any]:
        """Retorna snapshot dos principais indicadores macro"""
        snapshot = {}
        for key, info in BCB_SERIES.items():
            try:
                values = await self.get_series(info["code"], last_n=1)
                if values:
                    snapshot[key] = {
                        "name": info["name"],
                        "value": values[-1].get("value", ""),
                        "date": values[-1].get("date", ""),
                    }
            except Exception:
                pass
        return snapshot
