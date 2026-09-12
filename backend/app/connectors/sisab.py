"""
MOTOR 4P UFPR - SISAB Connector
Sistema de Informação em Saúde para a Atenção Básica (SISAB/SAPS/MS).

Complementa o conector DATASUS/CNES: o resto do DATASUS é FTP de arquivos .dbc
em lote, mas o SISAB expõe uma API REST pública real, sem chave.

ENDPOINTS DESCOBERTOS E VALIDADOS COM CHAMADA REAL EM 2026-09-12
(o serviço é um Spring Boot com /actuator aberto, mas sem /mappings nem swagger;
as rotas foram confirmadas por diferença de resposta 404 vs 500 e conferidas
contra o uso público documentado do portal relatorioaps):

  Base: https://relatorioaps-prd.saude.gov.br
    /cobertura/aps      -> Cobertura potencial da APS (eSF, eAP, eSFR, eCR, eAPP)
    /cobertura/sb/v2    -> Cobertura de Saúde Bucal
    /cobertura/acs      -> Cobertura de Agentes Comunitários de Saúde
    /cobertura/pns      -> Cobertura APS via Pesquisa Nacional de Saúde

  Parâmetros (query string, GET):
    unidadeGeografica = BRASIL | REGIAO | UF | MUNICIPIO
    nuCompInicio      = AAAAMM (competência CNES inicial)
    nuCompFim         = AAAAMM (competência CNES final)
    coUf              = código IBGE da UF (obrigatório para MUNICIPIO)

  Resposta: LISTA JSON direta (não há envelope). Campos variam por relatório.

Observações reais:
  - `https://relatorioaps.saude.gov.br` (front Angular) não responde de dentro
    do sandbox; a API de produção é o host `-prd`.
  - Requisição sem parâmetros retorna HTTP 500 "Falha interna do servidor!!!" —
    logo, ausência de parâmetro NÃO é tratada como "sem dados": levanta erro.
"""
import logging
from typing import Any, Dict, List, Optional

from .base import BaseConnector

logger = logging.getLogger(__name__)

SISAB_BASE = "https://relatorioaps-prd.saude.gov.br"

# Tipos de relatório -> rota real
SISAB_REPORTS: Dict[str, Dict[str, str]] = {
    "aps": {
        "endpoint": "/cobertura/aps",
        "name": "Cobertura potencial da Atenção Primária à Saúde",
        "coverage_field": "qtCobertura",
        "period_field": "nuComp",
    },
    "sb": {
        "endpoint": "/cobertura/sb/v2",
        "name": "Cobertura de Saúde Bucal",
        "coverage_field": "pcCoberturaSbAps",
        "period_field": "nuCompetencia",
    },
    "acs": {
        "endpoint": "/cobertura/acs",
        "name": "Cobertura de Agentes Comunitários de Saúde",
        "coverage_field": "pcCoberturaAcsAb",
        "period_field": "nuComp",
    },
    "pns": {
        "endpoint": "/cobertura/pns",
        "name": "Cobertura da APS via Pesquisa Nacional de Saúde",
        "coverage_field": "vlCobertura",
        "period_field": "nuComp",
    },
}

GEO_LEVELS = ("BRASIL", "REGIAO", "UF", "MUNICIPIO")

UF_IBGE = {
    "AC": "12", "AL": "27", "AP": "16", "AM": "13", "BA": "29", "CE": "23",
    "DF": "53", "ES": "32", "GO": "52", "MA": "21", "MT": "51", "MS": "50",
    "MG": "31", "PA": "15", "PB": "25", "PR": "41", "PE": "26", "PI": "22",
    "RJ": "33", "RN": "24", "RS": "43", "RO": "11", "RR": "14", "SC": "42",
    "SP": "35", "SE": "28", "TO": "17",
}


def _to_float(value: Any) -> Optional[float]:
    """Converte '96.60' / '1,855' / 97.81 em float. ACS devolve números com vírgula de milhar."""
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(str(value).replace(",", "").strip())
    except ValueError:
        return None


class SISABConnector(BaseConnector):
    """Cobertura de atenção primária por UF/município, agregados mensais."""

    def __init__(self):
        super().__init__()
        self.base_url = SISAB_BASE

    def get_source_name(self) -> str:
        return "SISAB - Sistema de Informação em Saúde para a Atenção Básica"

    def list_reports(self) -> List[Dict[str, str]]:
        return [
            {"code": code, "name": cfg["name"], "endpoint": cfg["endpoint"]}
            for code, cfg in SISAB_REPORTS.items()
        ]

    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """
        Busca por UF/sigla ou 'brasil'. Termo livre é interpretado como UF.
        Para consultas explícitas prefira get_coverage().
        """
        term = (query or "").strip().upper()
        if term in UF_IBGE:
            return await self.get_coverage(level="MUNICIPIO", uf=term, **kwargs)
        return await self.get_coverage(level="UF", **kwargs)

    async def get_coverage(
        self,
        report: str = "aps",
        level: str = "UF",
        comp_start: Optional[str] = None,
        comp_end: Optional[str] = None,
        uf: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Cobertura agregada mensal.

        Args:
            report: aps | sb | acs | pns
            level: BRASIL | REGIAO | UF | MUNICIPIO
            comp_start/comp_end: competência CNES AAAAMM (ex. "202401").
            uf: sigla ou código IBGE — obrigatório quando level=MUNICIPIO.
            limit: corta o resultado no cliente (a API não pagina).

        Falha explícita: parâmetros inválidos levantam ValueError; erro de rede
        ou HTTP propaga (nunca devolve lista vazia disfarçando falha).
        """
        report = (report or "aps").lower()
        if report not in SISAB_REPORTS:
            raise ValueError(
                f"Relatório SISAB inválido: {report}. Válidos: {list(SISAB_REPORTS)}"
            )
        level = (level or "UF").upper()
        if level not in GEO_LEVELS:
            raise ValueError(
                f"Unidade geográfica inválida: {level}. Válidas: {list(GEO_LEVELS)}"
            )
        if not comp_start:
            raise ValueError("comp_start (competência AAAAMM) é obrigatório")
        comp_end = comp_end or comp_start
        for comp in (comp_start, comp_end):
            if not (len(str(comp)) == 6 and str(comp).isdigit()):
                raise ValueError(f"Competência deve ser AAAAMM: {comp}")

        cfg = SISAB_REPORTS[report]
        params: Dict[str, str] = {
            "unidadeGeografica": level,
            "nuCompInicio": str(comp_start),
            "nuCompFim": str(comp_end),
        }

        if level == "MUNICIPIO":
            if not uf:
                raise ValueError("level=MUNICIPIO exige a UF (coUf)")
        if uf:
            params["coUf"] = UF_IBGE.get(str(uf).upper(), str(uf))

        logger.info(f"SISAB {report} {level} {comp_start}-{comp_end} uf={uf}")
        data = await self.get(f"{self.base_url}{cfg['endpoint']}", params=params, use_cache=True)

        # A API devolve lista direta; BaseConnector.get() já entrega o JSON parseado.
        rows = data if isinstance(data, list) else data.get("value", data.get("content", []))
        if not isinstance(rows, list):
            raise ValueError(f"Resposta inesperada do SISAB: {type(rows).__name__}")

        results: List[Dict[str, Any]] = []
        for row in rows:
            results.append(
                {
                    "report": report,
                    "report_name": cfg["name"],
                    "level": level,
                    "period": row.get(cfg["period_field"]) or row.get("nuComp") or row.get("nuCompetencia"),
                    "region_code": row.get("coRegiao"),
                    "region": row.get("noRegiao"),
                    "uf_code": row.get("coUfIbge"),
                    "uf": row.get("sgUf"),
                    "uf_name": row.get("noUfAcentuado") or row.get("noUf"),
                    "municipality_code": row.get("coMunicipioIbge"),
                    "municipality": row.get("noMunicipioAcentuado") or row.get("noMunicipioIbge"),
                    "population": _to_float(row.get("qtPopulacao")),
                    "coverage_pct": _to_float(row.get(cfg["coverage_field"])),
                    "source": self.get_source_name(),
                    "source_url": "https://sisab.saude.gov.br/",
                    "raw": row,
                }
            )

        if limit:
            results = results[:limit]
        return results

    async def get_coverage_by_uf(
        self, comp_start: str, comp_end: Optional[str] = None, report: str = "aps"
    ) -> List[Dict[str, Any]]:
        """Cobertura das 27 UFs numa competência."""
        return await self.get_coverage(
            report=report, level="UF", comp_start=comp_start, comp_end=comp_end
        )

    async def get_coverage_by_municipality(
        self, uf: str, comp_start: str, comp_end: Optional[str] = None, report: str = "aps"
    ) -> List[Dict[str, Any]]:
        """Cobertura de todos os municípios de uma UF numa competência."""
        return await self.get_coverage(
            report=report, level="MUNICIPIO", uf=uf,
            comp_start=comp_start, comp_end=comp_end,
        )

    async def get_coverage_brazil(
        self, comp_start: str, comp_end: Optional[str] = None, report: str = "aps"
    ) -> List[Dict[str, Any]]:
        """Série nacional agregada."""
        return await self.get_coverage(
            report=report, level="BRASIL", comp_start=comp_start, comp_end=comp_end
        )
