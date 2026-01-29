"""
MOTOR 4P UFPR - COMEX Stat Connector
Conector para API do COMEX Stat (Comércio Exterior)

COMEX Stat é o sistema oficial de estatísticas de comércio exterior do Brasil:
- Dados desde 1997
- API REST pública
- Exportação e importação por NCM, país, estado, via de transporte

Documentação: https://api-comexstat.mdic.gov.br/docs
"""
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from .base import BaseConnector
from ..models.schemas import TradeData
from ..core.config import settings

logger = logging.getLogger(__name__)


class ComexStatConnector(BaseConnector):
    """
    Conector para API do COMEX Stat

    Implementa consulta de dados de comércio exterior brasileiro:
    - Exportações por NCM
    - Importações por NCM
    - Agregações por país, estado, período
    """

    def __init__(self):
        super().__init__()
        self.base_url = settings.COMEX_API_BASE

    def get_source_name(self) -> str:
        return "COMEX Stat - MDIC"

    async def search(
        self,
        ncm_codes: List[str],
        year: Optional[int] = None,
        months: Optional[List[int]] = None
    ) -> List[TradeData]:
        """
        Busca dados de comércio exterior por NCM

        Args:
            ncm_codes: Lista de códigos NCM (8 dígitos)
            year: Ano de referência (padrão: ano atual - 1)
            months: Meses específicos (1-12)

        Returns:
            Lista de dados de comércio
        """
        if not year:
            year = datetime.now().year - 1

        logger.info(f"COMEX search: NCMs={ncm_codes}, year={year}")

        results = []

        for ncm in ncm_codes:
            try:
                # Busca exportações
                exports = await self._get_exports(ncm, year, months)

                # Busca importações
                imports = await self._get_imports(ncm, year, months)

                # Combina resultados
                trade_data = TradeData(
                    ncm=ncm,
                    ncm_description=exports.get("description", imports.get("description", "")),
                    export_value_usd=exports.get("total_value", 0),
                    export_quantity=exports.get("total_quantity", 0),
                    export_countries=exports.get("by_country", []),
                    import_value_usd=imports.get("total_value", 0),
                    import_quantity=imports.get("total_quantity", 0),
                    import_countries=imports.get("by_country", []),
                    year=year,
                    trade_balance=exports.get("total_value", 0) - imports.get("total_value", 0)
                )

                results.append(trade_data)

            except Exception as e:
                logger.error(f"Error fetching COMEX data for NCM {ncm}: {e}")
                continue

        return results

    async def _get_exports(
        self,
        ncm: str,
        year: int,
        months: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """Busca dados de exportação"""
        # Endpoint de exportação geral
        endpoint = f"{self.base_url}/general"

        # Parâmetros para exportação
        params = {
            "flow": "export",
            "year": year,
            "ncm": ncm,
            "groupBy": "country"
        }

        if months:
            params["month"] = ",".join(str(m) for m in months)

        try:
            # Tenta API real
            data = await self.get(endpoint, params=params)

            total_value = sum(item.get("metricFOB", 0) for item in data.get("data", []))
            total_quantity = sum(item.get("metricKG", 0) for item in data.get("data", []))

            by_country = []
            for item in data.get("data", [])[:10]:  # Top 10 países
                by_country.append({
                    "country_code": item.get("country", ""),
                    "country_name": item.get("countryName", ""),
                    "value_usd": item.get("metricFOB", 0),
                    "quantity_kg": item.get("metricKG", 0)
                })

            return {
                "total_value": total_value,
                "total_quantity": total_quantity,
                "by_country": by_country,
                "description": data.get("ncmDescription", "")
            }

        except Exception as e:
            logger.warning(f"COMEX API error, using fallback data: {e}")
            return self._get_fallback_exports(ncm, year)

    async def _get_imports(
        self,
        ncm: str,
        year: int,
        months: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """Busca dados de importação"""
        endpoint = f"{self.base_url}/general"

        params = {
            "flow": "import",
            "year": year,
            "ncm": ncm,
            "groupBy": "country"
        }

        if months:
            params["month"] = ",".join(str(m) for m in months)

        try:
            data = await self.get(endpoint, params=params)

            total_value = sum(item.get("metricFOB", 0) for item in data.get("data", []))
            total_quantity = sum(item.get("metricKG", 0) for item in data.get("data", []))

            by_country = []
            for item in data.get("data", [])[:10]:
                by_country.append({
                    "country_code": item.get("country", ""),
                    "country_name": item.get("countryName", ""),
                    "value_usd": item.get("metricFOB", 0),
                    "quantity_kg": item.get("metricKG", 0)
                })

            return {
                "total_value": total_value,
                "total_quantity": total_quantity,
                "by_country": by_country,
                "description": data.get("ncmDescription", "")
            }

        except Exception as e:
            logger.warning(f"COMEX API error, using fallback data: {e}")
            return self._get_fallback_imports(ncm, year)

    def _get_fallback_exports(self, ncm: str, year: int) -> Dict[str, Any]:
        """Dados de fallback para exportações (MVP)"""
        # Dados simulados baseados em NCMs comuns
        ncm_data = NCM_FALLBACK_DATA.get(ncm[:4], {})

        return {
            "total_value": ncm_data.get("export_value", 0),
            "total_quantity": ncm_data.get("export_qty", 0),
            "by_country": ncm_data.get("export_countries", []),
            "description": ncm_data.get("description", f"Produto NCM {ncm}")
        }

    def _get_fallback_imports(self, ncm: str, year: int) -> Dict[str, Any]:
        """Dados de fallback para importações (MVP)"""
        ncm_data = NCM_FALLBACK_DATA.get(ncm[:4], {})

        return {
            "total_value": ncm_data.get("import_value", 0),
            "total_quantity": ncm_data.get("import_qty", 0),
            "by_country": ncm_data.get("import_countries", []),
            "description": ncm_data.get("description", f"Produto NCM {ncm}")
        }

    async def get_trade_balance_by_ncm(
        self,
        ncm_codes: List[str],
        years: List[int]
    ) -> Dict[str, Any]:
        """
        Calcula balança comercial histórica por NCM

        Útil para identificar dependência tecnológica
        """
        results = {}

        for ncm in ncm_codes:
            yearly_data = []
            for year in years:
                trade_data = await self.search([ncm], year=year)
                if trade_data:
                    yearly_data.append({
                        "year": year,
                        "exports": trade_data[0].export_value_usd,
                        "imports": trade_data[0].import_value_usd,
                        "balance": trade_data[0].trade_balance
                    })

            results[ncm] = yearly_data

        return results

    async def get_dependency_index(self, ncm_codes: List[str], year: int) -> Dict[str, float]:
        """
        Calcula índice de dependência tecnológica

        Índice = Importações / (Importações + Exportações)
        - 0 = Não depende (exporta tudo)
        - 1 = Totalmente dependente (só importa)
        - 0.5 = Equilibrado
        """
        trade_data = await self.search(ncm_codes, year=year)

        dependencies = {}
        for data in trade_data:
            total = data.export_value_usd + data.import_value_usd
            if total > 0:
                dependencies[data.ncm] = data.import_value_usd / total
            else:
                dependencies[data.ncm] = 0.5  # Sem dados = neutro

        return dependencies

    async def get_main_partners(
        self,
        ncm_codes: List[str],
        year: int,
        flow: str = "import"
    ) -> List[Dict[str, Any]]:
        """
        Identifica principais parceiros comerciais por NCM

        Args:
            ncm_codes: Códigos NCM
            year: Ano
            flow: "import" ou "export"

        Returns:
            Lista de países ordenada por valor
        """
        trade_data = await self.search(ncm_codes, year=year)

        # Agrega por país
        country_totals = {}

        for data in trade_data:
            countries = data.import_countries if flow == "import" else data.export_countries
            for country in countries:
                code = country.get("country_code", "")
                if code:
                    if code not in country_totals:
                        country_totals[code] = {
                            "country_code": code,
                            "country_name": country.get("country_name", code),
                            "total_value": 0
                        }
                    country_totals[code]["total_value"] += country.get("value_usd", 0)

        # Ordena por valor
        sorted_countries = sorted(
            country_totals.values(),
            key=lambda x: x["total_value"],
            reverse=True
        )

        return sorted_countries[:10]


# Dados de fallback para NCMs comuns (para MVP)
NCM_FALLBACK_DATA = {
    # Baterias e acumuladores
    "8507": {
        "description": "Acumuladores elétricos e seus separadores",
        "export_value": 45_000_000,
        "import_value": 890_000_000,
        "export_qty": 12_000_000,
        "import_qty": 78_000_000,
        "export_countries": [
            {"country_code": "AR", "country_name": "Argentina", "value_usd": 18_000_000},
            {"country_code": "PY", "country_name": "Paraguai", "value_usd": 8_000_000},
            {"country_code": "CL", "country_name": "Chile", "value_usd": 6_000_000},
        ],
        "import_countries": [
            {"country_code": "CN", "country_name": "China", "value_usd": 450_000_000},
            {"country_code": "KR", "country_name": "Coreia do Sul", "value_usd": 180_000_000},
            {"country_code": "JP", "country_name": "Japão", "value_usd": 95_000_000},
            {"country_code": "US", "country_name": "Estados Unidos", "value_usd": 65_000_000},
        ],
    },

    # Máquinas automáticas para processamento de dados
    "8471": {
        "description": "Máquinas automáticas para processamento de dados",
        "export_value": 120_000_000,
        "import_value": 2_500_000_000,
        "export_qty": 5_000_000,
        "import_qty": 150_000_000,
        "export_countries": [
            {"country_code": "AR", "country_name": "Argentina", "value_usd": 45_000_000},
            {"country_code": "MX", "country_name": "México", "value_usd": 25_000_000},
        ],
        "import_countries": [
            {"country_code": "CN", "country_name": "China", "value_usd": 1_800_000_000},
            {"country_code": "US", "country_name": "Estados Unidos", "value_usd": 350_000_000},
            {"country_code": "VN", "country_name": "Vietnã", "value_usd": 150_000_000},
        ],
    },

    # Instrumentos e aparelhos médico-cirúrgicos
    "9018": {
        "description": "Instrumentos e aparelhos para medicina, cirurgia",
        "export_value": 280_000_000,
        "import_value": 1_200_000_000,
        "export_qty": 8_000_000,
        "import_qty": 25_000_000,
        "export_countries": [
            {"country_code": "US", "country_name": "Estados Unidos", "value_usd": 85_000_000},
            {"country_code": "AR", "country_name": "Argentina", "value_usd": 55_000_000},
            {"country_code": "MX", "country_name": "México", "value_usd": 40_000_000},
        ],
        "import_countries": [
            {"country_code": "US", "country_name": "Estados Unidos", "value_usd": 450_000_000},
            {"country_code": "DE", "country_name": "Alemanha", "value_usd": 280_000_000},
            {"country_code": "CN", "country_name": "China", "value_usd": 220_000_000},
            {"country_code": "JP", "country_name": "Japão", "value_usd": 120_000_000},
        ],
    },

    # Circuitos integrados
    "8542": {
        "description": "Circuitos integrados e microconjuntos eletrônicos",
        "export_value": 35_000_000,
        "import_value": 4_200_000_000,
        "export_qty": 500_000,
        "import_qty": 2_000_000_000,
        "export_countries": [
            {"country_code": "AR", "country_name": "Argentina", "value_usd": 12_000_000},
            {"country_code": "MX", "country_name": "México", "value_usd": 8_000_000},
        ],
        "import_countries": [
            {"country_code": "CN", "country_name": "China", "value_usd": 1_800_000_000},
            {"country_code": "TW", "country_name": "Taiwan", "value_usd": 950_000_000},
            {"country_code": "KR", "country_name": "Coreia do Sul", "value_usd": 620_000_000},
            {"country_code": "MY", "country_name": "Malásia", "value_usd": 380_000_000},
            {"country_code": "US", "country_name": "Estados Unidos", "value_usd": 250_000_000},
        ],
    },

    # Produtos químicos inorgânicos
    "2825": {
        "description": "Hidrazina e hidroxilamina e seus sais inorgânicos",
        "export_value": 15_000_000,
        "import_value": 85_000_000,
        "export_qty": 5_000_000,
        "import_qty": 25_000_000,
        "export_countries": [
            {"country_code": "AR", "country_name": "Argentina", "value_usd": 8_000_000},
        ],
        "import_countries": [
            {"country_code": "CN", "country_name": "China", "value_usd": 45_000_000},
            {"country_code": "DE", "country_name": "Alemanha", "value_usd": 18_000_000},
        ],
    },
}
