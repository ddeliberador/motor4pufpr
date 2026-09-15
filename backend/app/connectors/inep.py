"""
Conector INEP — Censo da Educação Superior
Fonte: dados.gov.br + inep.gov.br/microdados
Microdados anuais em CSV (arquivo grande) — sem API REST
Estratégia: metadados + links de download + curadoria de indicadores-chave
"""
import logging
import httpx
import os
from typing import Any, Dict, List

from .base import BaseConnector

logger = logging.getLogger(__name__)


class INEPConnector(BaseConnector):
    """Connector legado para dados do INEP sobre instituições de ensino.

    Mantido para compatibilidade com incidence_engine (search_institutions).
    Para o Censo da Educação Superior use buscar_censo_educacao().
    """

    def __init__(self):
        super().__init__()
        self.base_url = "https://dadosabertos.inep.gov.br/api"
        self.timeout = 30.0

    async def search_institutions(self, term: str, state: str = None) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                institutions = await self._search_higher_education(client, term, state)
                courses = await self._search_courses(client, term, state)

                return {
                    "source": "INEP",
                    "institutions": institutions,
                    "courses": courses,
                    "total_institutions": len(institutions),
                    "total_courses": len(courses)
                }
        except Exception as e:
            return self._handle_error(e, "INEP")

    async def _search_higher_education(self, client: httpx.AsyncClient, term: str, state: str) -> List[Dict]:
        institutions_mock = [
            {
                "name": "Universidade Federal do Paraná",
                "acronym": "UFPR",
                "state": "PR",
                "city": "Curitiba",
                "type": "Pública Federal",
                "has_graduate": True,
                "areas": ["Tecnologia", "Ciências Exatas", "Engenharias"],
                "grade_enade": 4.2
            },
            {
                "name": "Universidade de São Paulo",
                "acronym": "USP",
                "state": "SP",
                "city": "São Paulo",
                "type": "Pública Estadual",
                "has_graduate": True,
                "areas": ["Todas as áreas"],
                "grade_enade": 4.8
            }
        ]

        filtered = [
            inst for inst in institutions_mock
            if term.lower() in str(inst.get("areas", "")).lower()
            and (not state or inst.get("state") == state)
        ]

        return filtered

    async def _search_courses(self, client: httpx.AsyncClient, term: str, state: str) -> List[Dict]:
        courses_mock = [
            {
                "name": "Engenharia de Computação",
                "institution": "UFPR",
                "level": "Graduação",
                "modality": "Presencial",
                "city": "Curitiba",
                "state": "PR",
                "grade_enade": 4,
                "duration_semesters": 10
            },
            {
                "name": "Ciência da Computação",
                "institution": "USP",
                "level": "Graduação",
                "modality": "Presencial",
                "city": "São Paulo",
                "state": "SP",
                "grade_enade": 5,
                "duration_semesters": 8
            }
        ]

        filtered = [
            course for course in courses_mock
            if term.lower() in course.get("name", "").lower()
            and (not state or course.get("state") == state)
        ]

        return filtered

# Indicadores curados do Censo da Educação Superior 2023 (INEP)
CENSO_2023 = {
    "ano": 2023,
    "fonte": "Censo da Educação Superior 2023 — INEP/MEC",
    "url": "https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/censo-da-educacao-superior",
    "indicadores": {
        "ies_total": 2595,
        "ies_publicas": 320,
        "ies_privadas": 2275,
        "cursos_total": 44543,
        "matriculas_total": 9747606,
        "matriculas_presencial": 4285512,
        "matriculas_ead": 5462094,
        "concluintes": 1330934,
        "docentes_total": 403117,
        "docentes_doutores_pct": 40.2,
    },
    "areas_mais_matriculados": [
        {"area": "Negócios, Administração e Direito", "matriculas": 2850000},
        {"area": "Saúde e Bem-estar", "matriculas": 1620000},
        {"area": "Educação", "matriculas": 1180000},
        {"area": "Engenharia, Produção e Construção", "matriculas": 1050000},
        {"area": "Computação e TIC", "matriculas": 850000},
    ],
}

async def buscar_censo_educacao(
    uf: str | None = None,
    area: str | None = None,
) -> dict[str, Any]:
    async with httpx.AsyncClient(headers={"User-Agent": "Motor4P-UFPR/1.0 (motor4p@ufpr.br)"}) as client:
        # Busca dataset no dados.gov.br
        dataset_url: str | None = None
        try:
            chave = os.getenv("DADOS_GOV_API_KEY", "")
            headers_req: dict = {"User-Agent": "Motor4P-UFPR/1.0 (motor4p@ufpr.br)"}
            if chave:
                headers_req["chave-api-dados-abertos"] = chave
            r = await client.get(
                "https://dados.gov.br/dados/api/publico/conjuntos-dados",
                params={"nomeConjuntoDados": "microdados censo educação superior", "pagina": 1, "tamanhoPagina": 3},
                headers=headers_req,
                timeout=12,
            )
            if r.status_code == 200:
                items = r.json()
                if isinstance(items, list) and items:
                    dataset_url = items[0].get("url")
        except Exception as e:
            logger.warning(f"INEP dados.gov.br: {e}")

        return {
            "disponivel": True,
            "fonte": "INEP — Censo da Educação Superior",
            "url_portal": "https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/censo-da-educacao-superior",
            "url_microdados": "https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/censo-da-educacao-superior",
            "dataset_dados_gov": dataset_url,
            "indicadores_nacionais": CENSO_2023,
            "uf_filtro": uf,
            "area_filtro": area,
            "colunas_filtro_uf": "CO_UF_IES (código IBGE da UF da IES)",
            "periodicidade": "Anual — referência 2023 disponível (2024 previsto para dez/2024)",
            "nota_tecnica": (
                "Microdados do Censo são arquivos CSV grandes (500MB+). "
                "O Motor retorna metadados e links — download e filtragem são feitos localmente. "
                "Colunas relevantes: CO_UF_IES, NO_IES, CO_CURSO, NO_CURSO, CO_CINE_AREA_GERAL, "
                "QT_MAT, QT_CONC, QT_DOC_EX."
            ),
            "links_diretos": [
                {"label": f"Microdados INEP 2023{' — filtrar por CO_UF_IES=' + uf if uf else ''}", "url": "https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/censo-da-educacao-superior"},
                {"label": "Resumo Técnico Censo 2023 (PDF)", "url": "https://download.inep.gov.br/publicacoes/institucionais/estatisticas_e_indicadores/resumo_tecnico_censo_educacao_superior_2023.pdf"},
                {"label": "Sinopse Estatística 2023 (tabelas Excel)", "url": "https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/censo-da-educacao-superior/resultados"},
            ],
        }
