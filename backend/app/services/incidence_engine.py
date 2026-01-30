"""
MOTOR 4P UFPR - Incidence Engine
Motor de Incidência

Orquestra a busca em todas as fontes e monta o resultado completo
de incidência para um objeto tecnológico.
"""
import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from .ontology_engine import OntologyEngine
from .indicators import IndicatorsCalculator
from ..connectors.cnpq import CNPqConnector
from ..connectors.openalex import OpenAlexConnector
from ..connectors.comex import ComexStatConnector
from ..connectors.ibge import IBGEConnector
from ..connectors.capes import CAPESConnector
from ..connectors.scholarships import InternationalScholarshipsConnector
from ..connectors.inep import INEPConnector
from ..connectors.github import GitHubConnector
from ..models.schemas import (
    IncidenceResult,
    OntologyMapping,
    ScientificIncidence,
    TechnologicalIncidence,
    ProductiveIncidence,
    InstitutionalIncidence,
    InternationalIncidence,
    ResearchGroup,
    Patent,
    PublicInstrument,
    StructuralIndicators
)

logger = logging.getLogger(__name__)


class IncidenceEngine:
    """
    Motor de Incidência

    Responsável por:
    1. Receber objeto tecnológico
    2. Traduzir para códigos (via OntologyEngine)
    3. Buscar incidência em todas as fontes
    4. Calcular indicadores
    5. Retornar resultado consolidado
    """

    def __init__(self):
        self.ontology = OntologyEngine()
        self.indicators = IndicatorsCalculator()

    async def analyze(
        self,
        query: str,
        include_international: bool = True,
        include_papers: bool = True,
        limit: int = 50
    ) -> IncidenceResult:
        """
        Analisa objeto tecnológico e retorna incidência completa

        Args:
            query: Descrição do objeto tecnológico
            include_international: Incluir comparação internacional
            include_papers: Incluir artigos científicos (OpenAlex)
            limit: Limite de resultados por categoria

        Returns:
            IncidenceResult com todas as incidências e indicadores
        """
        start_time = datetime.now()
        logger.info(f"Starting incidence analysis for: {query}")

        # 1. Tradução ontológica
        ontology = self.ontology.translate(query)
        logger.info(f"Ontology mapping confidence: {ontology.confidence:.2f}")

        # 2. Busca paralela em todas as fontes (incluindo novas APIs)
        results = await asyncio.gather(
            self._get_scientific_incidence(query, ontology, include_papers, limit),
            self._get_technological_incidence(query, ontology, limit),
            self._get_productive_incidence(ontology),
            self._get_institutional_incidence(query, ontology),
            self._get_international_incidence(query) if include_international else self._empty_international(),
            self._get_scholarships_data(query, ontology),
            self._get_education_data(query),
            self._get_github_projects(query),
        )
        
        scientific, technological, productive, institutional, international, scholarships, education, github = results

        # 3. Calcula indicadores
        indicators = self.indicators.calculate(
            scientific=scientific,
            technological=technological,
            productive=productive,
            institutional=institutional,
            international=international
        )

        # 4. Estatísticas gerais (incluindo novas fontes)
        stats = {
            "groups": scientific.total_groups,
            "papers": scientific.total_papers,
            "patents": technological.total_patents,
            "instruments": len(institutional.instruments),
            "companies": len(productive.main_import_origins) + len(productive.main_export_destinations),
            "international": len(international),
            "scholarships": scholarships.get("total", 0),
            "institutions": education.get("total_institutions", 0),
            "github_projects": github.get("total", 0)
        }

        # 5. Tempo de processamento
        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)

        result = IncidenceResult(
            query=query,
            ontology=ontology,
            scientific=scientific,
            technological=technological,
            productive=productive,
            institutional=institutional,
            international=international,
            indicators=indicators,
            stats=stats,
            processing_time_ms=processing_time,
            data_sources=["CNPq", "OpenAlex", "INPI", "COMEX Stat", "BNDES", "Finep", "CAPES", "INEP", "GitHub"]
        )
        
        # Adiciona dados extras
        result.scholarships = scholarships
        result.education = education
        result.github_projects = github
        
        return result

    async def _get_scientific_incidence(
        self,
        query: str,
        ontology: OntologyMapping,
        include_papers: bool,
        limit: int
    ) -> ScientificIncidence:
        """Busca incidência científica (CNPq + OpenAlex)"""

        # Extrai códigos de área CNPq
        area_codes = [a["code"] for a in ontology.cnpq_areas] if ontology.cnpq_areas else None

        # Busca paralela
        async with CNPqConnector() as cnpq:
            groups = await cnpq.search(query, areas=area_codes, limit=limit)

        papers = []
        if include_papers:
            async with OpenAlexConnector() as openalex:
                papers = await openalex.search(query, limit=limit)

        # Calcula estatísticas
        total_groups = len(groups) * 10  # Estimativa (em produção seria count real)
        total_papers = len(papers) * 50 if papers else 0

        # Distribuição por estado
        by_state = {}
        for group in groups:
            state = group.state
            by_state[state] = by_state.get(state, 0) + 1

        # Distribuição por instituição
        by_institution = {}
        for group in groups:
            inst = group.institution_acronym or group.institution
            by_institution[inst] = by_institution.get(inst, 0) + 1

        return ScientificIncidence(
            research_groups=groups,
            papers=papers,
            total_groups=total_groups,
            total_papers=total_papers,
            total_researchers=sum(g.researchers_count or 0 for g in groups),
            by_state=by_state,
            by_institution=by_institution
        )

    async def _get_technological_incidence(
        self,
        query: str,
        ontology: OntologyMapping,
        limit: int
    ) -> TechnologicalIncidence:
        """Busca incidência tecnológica (patentes)"""

        # Para MVP, geramos patentes simuladas
        # Em produção, usaríamos API do INPI ou Lens.org
        patents = self._generate_mock_patents(query, ontology, limit)

        # Calcula estatísticas
        patents_by_year = {}
        for patent in patents:
            year = patent.filing_date[:4] if patent.filing_date else "N/A"
            patents_by_year[year] = patents_by_year.get(year, 0) + 1

        # Top aplicantes
        applicant_counts = {}
        for patent in patents:
            for applicant in patent.applicants:
                applicant_counts[applicant] = applicant_counts.get(applicant, 0) + 1

        top_applicants = [
            {"name": name, "count": count}
            for name, count in sorted(applicant_counts.items(), key=lambda x: -x[1])[:10]
        ]

        return TechnologicalIncidence(
            patents=patents,
            total_patents=len(patents) * 10,  # Estimativa
            patents_by_year=patents_by_year,
            top_applicants=top_applicants
        )

    def _generate_mock_patents(
        self,
        query: str,
        ontology: OntologyMapping,
        limit: int
    ) -> List[Patent]:
        """Gera patentes simuladas para MVP"""
        import random
        random.seed(hash(query))

        # Templates baseados na query
        query_lower = query.lower()

        if "bateria" in query_lower or "sodio" in query_lower:
            templates = [
                ("Célula eletroquímica de íons para armazenamento de energia", "Petrobras S.A."),
                ("Eletrodo de carbono para baterias", "USP"),
                ("Processo de síntese de materiais catódicos", "UNICAMP"),
                ("Sistema de gestão térmica para baterias", "WEG S.A."),
                ("Método de fabricação de eletrólito sólido", "UFRGS"),
                ("Compósito para anodo de bateria", "UFMG"),
                ("Separador cerâmico para células eletroquímicas", "UFPR"),
            ]
        elif "inteligencia" in query_lower or "ia" in query_lower:
            templates = [
                ("Sistema de visão computacional para controle de qualidade", "Embraer S.A."),
                ("Método de manutenção preditiva com IA", "Vale S.A."),
                ("Plataforma de otimização de processos industriais", "SENAI-SP"),
                ("Algoritmo de detecção de anomalias", "Bosch Brasil"),
                ("Sistema de reconhecimento de padrões", "PUC-Rio"),
                ("Rede neural para processamento de dados", "USP"),
            ]
        elif "biomaterial" in query_lower:
            templates = [
                ("Scaffold bioativo para regeneração óssea", "Baumer S.A."),
                ("Hidrogel injetável para liberação de fármacos", "USP"),
                ("Membrana polimérica para implantes", "Straumann Brasil"),
                ("Compósito cerâmico para próteses", "UFRJ"),
                ("Revestimento biocompatível para implantes", "UNICAMP"),
            ]
        else:
            templates = [
                (f"Processo inovador para {query}", "USP"),
                (f"Sistema de {query}", "UNICAMP"),
                (f"Método de produção de {query}", "Empresa Nacional"),
                (f"Dispositivo para {query}", "Instituto de Pesquisa"),
            ]

        patents = []
        ipc_codes = [c["code"] for c in ontology.ipc_codes] if ontology.ipc_codes else ["H01M"]

        for i, (title, applicant) in enumerate(templates[:limit]):
            year = random.randint(2020, 2024)
            patent = Patent(
                id=f"BR10{year}{random.randint(100000, 999999):06d}",
                title=title,
                applicants=[applicant],
                inventors=[f"Inventor {j+1}" for j in range(random.randint(1, 4))],
                filing_date=f"{year}-{random.randint(1,12):02d}-{random.randint(1,28):02d}",
                publication_date=f"{year+1}-{random.randint(1,12):02d}-{random.randint(1,28):02d}",
                ipc_codes=random.sample(ipc_codes, min(len(ipc_codes), 2)),
                status="Publicado" if random.random() > 0.3 else "Concedido",
                citations_count=random.randint(0, 20),
                cited_by_count=random.randint(0, 15),
                country="BR",
                source="inpi"
            )
            patents.append(patent)

        return patents

    async def _get_productive_incidence(
        self,
        ontology: OntologyMapping
    ) -> ProductiveIncidence:
        """Busca incidência produtiva (COMEX Stat)"""

        ncm_codes = [c["code"] for c in ontology.ncm_codes] if ontology.ncm_codes else []

        if not ncm_codes:
            return ProductiveIncidence()

        async with ComexStatConnector() as comex:
            trade_data = await comex.search(ncm_codes)
            main_partners = await comex.get_main_partners(ncm_codes, year=2023, flow="import")

        # Calcula totais
        total_exports = sum(t.export_value_usd for t in trade_data)
        total_imports = sum(t.import_value_usd for t in trade_data)

        return ProductiveIncidence(
            trade_data=trade_data,
            total_exports_usd=total_exports,
            total_imports_usd=total_imports,
            trade_balance=total_exports - total_imports,
            main_import_origins=main_partners[:5],
            main_export_destinations=[]  # TODO: implementar
        )

    async def _get_institutional_incidence(
        self,
        query: str,
        ontology: OntologyMapping
    ) -> InstitutionalIncidence:
        """Busca incidência institucional (instrumentos públicos)"""

        # Para MVP, retornamos instrumentos relevantes
        # Em produção, cruzaríamos com editais reais de Finep/BNDES/Embrapii
        instruments = self._get_relevant_instruments(query, ontology)

        return InstitutionalIncidence(
            instruments=instruments,
            total_available_value=sum(i.total_value or 0 for i in instruments),
            instruments_by_type={
                i.type: instruments.count(i)
                for i in instruments
            },
            instruments_by_organization={
                i.organization: len([x for x in instruments if x.organization == i.organization])
                for i in instruments
            }
        )

    def _get_relevant_instruments(
        self,
        query: str,
        ontology: OntologyMapping
    ) -> List[PublicInstrument]:
        """Retorna instrumentos públicos relevantes"""

        query_lower = query.lower()

        # Base de instrumentos (em produção, seria dinâmica)
        all_instruments = [
            PublicInstrument(
                name="Programa Finep Energias Renováveis",
                organization="Finep",
                type="Subvenção",
                status="Aberto",
                total_value=50_000_000,
                eligible_areas=["energia", "bateria", "renovável"],
                url="https://finep.gov.br"
            ),
            PublicInstrument(
                name="BNDES Linha Verde",
                organization="BNDES",
                type="Financiamento",
                status="Contínuo",
                total_value=200_000_000,
                min_value=1_000_000,
                eligible_areas=["sustentabilidade", "energia", "ambiente"],
                url="https://bndes.gov.br"
            ),
            PublicInstrument(
                name="Embrapii - Materiais Avançados",
                organization="Embrapii",
                type="Parceria",
                status="Ativo",
                eligible_areas=["materiais", "nanotecnologia", "biomateriais"],
                url="https://embrapii.org.br"
            ),
            PublicInstrument(
                name="Programa IA Brasil 2030",
                organization="MCTI",
                type="Subvenção",
                status="Aberto",
                total_value=200_000_000,
                eligible_areas=["inteligência artificial", "ia", "machine learning"],
                url="https://www.gov.br/mcti"
            ),
            PublicInstrument(
                name="BNDES Digitalização Industrial",
                organization="BNDES",
                type="Financiamento",
                status="Contínuo",
                total_value=500_000_000,
                eligible_areas=["digital", "indústria 4.0", "automação", "ia"],
                url="https://bndes.gov.br"
            ),
            PublicInstrument(
                name="Finep Bioeconomia",
                organization="Finep",
                type="Subvenção",
                status="Aberto",
                total_value=80_000_000,
                eligible_areas=["bio", "biomaterial", "saúde", "fármaco"],
                url="https://finep.gov.br"
            ),
            PublicInstrument(
                name="BNDES Programa Saúde",
                organization="BNDES",
                type="Financiamento",
                status="Contínuo",
                total_value=300_000_000,
                eligible_areas=["saúde", "médico", "farmacêutico", "dispositivo"],
                url="https://bndes.gov.br"
            ),
        ]

        # Filtra por relevância
        relevant = []
        for inst in all_instruments:
            for area in inst.eligible_areas:
                if area in query_lower or any(
                    kw in area for kw in ontology.search_terms[:5]
                ):
                    relevant.append(inst)
                    break

        return relevant[:5]  # Máximo 5 instrumentos

    async def _get_international_incidence(
        self,
        query: str
    ) -> List[InternationalIncidence]:
        """Busca incidência internacional via OpenAlex"""

        async with OpenAlexConnector() as openalex:
            countries = await openalex.get_global_comparison(query)

        result = []
        for country in countries[:10]:
            result.append(InternationalIncidence(
                country=country.get("country_name", ""),
                country_code=country.get("country_code", ""),
                flag_emoji=country.get("flag_emoji", "🏳️"),
                papers_count=country.get("papers_count", 0),
                institutions_count=country.get("papers_count", 0) // 10,  # Estimativa
                patents_count=0,  # TODO: integrar com Lens.org
                global_relevance=self._calculate_relevance(country.get("papers_count", 0))
            ))

        return result

    def _calculate_relevance(self, papers_count: int) -> str:
        """Calcula relevância baseada em produção científica"""
        if papers_count > 10000:
            return "Líder global"
        elif papers_count > 5000:
            return "Alta produção"
        elif papers_count > 1000:
            return "Produção significativa"
        elif papers_count > 100:
            return "Emergente"
        else:
            return "Em desenvolvimento"

    async def _empty_international(self) -> List[InternationalIncidence]:
        """Retorna lista vazia para quando internacional não é requisitado"""
        return []

    async def _get_scholarships_data(self, query: str, ontology: OntologyMapping) -> Dict[str, Any]:
        """Busca dados de bolsas de estudo (CAPES + Internacional)"""
        try:
            # Busca paralela em CAPES e bolsas internacionais
            capes_conn = CAPESConnector()
            intl_conn = InternationalScholarshipsConnector()
            
            field = ontology.cnpq_areas[0]["name"] if ontology.cnpq_areas else query
            
            capes_data, intl_data = await asyncio.gather(
                capes_conn.search_scholarships(query),
                intl_conn.search_international_scholarships(query, field)
            )
            
            # Combina dados
            all_scholarships = []
            
            # Bolsas CAPES (Brasil)
            if capes_data.get("scholarships"):
                all_scholarships.extend(capes_data["scholarships"])
            
            # Bolsas internacionais
            if intl_data.get("scholarships"):
                all_scholarships.extend(intl_data["scholarships"])
            
            return {
                "source": "CAPES + International",
                "brazil": capes_data.get("scholarships", []),
                "international": intl_data.get("scholarships", []),
                "all": all_scholarships,
                "total": len(all_scholarships),
                "by_country": self._group_scholarships_by_country(all_scholarships),
                "by_level": self._group_scholarships_by_level(all_scholarships)
            }
        except Exception as e:
            logger.error(f"Error fetching scholarships: {e}")
            return {"source": "CAPES + International", "all": [], "total": 0}
    
    async def _get_education_data(self, query: str) -> Dict[str, Any]:
        """Busca dados de instituições de ensino (INEP)"""
        try:
            inep = INEPConnector()
            data = await inep.search_institutions(query)
            
            return {
                "source": "INEP",
                "institutions": data.get("institutions", []),
                "courses": data.get("courses", []),
                "total_institutions": data.get("total_institutions", 0),
                "total_courses": data.get("total_courses", 0)
            }
        except Exception as e:
            logger.error(f"Error fetching education data: {e}")
            return {"source": "INEP", "institutions": [], "courses": [], "total_institutions": 0, "total_courses": 0}
    
    async def _get_github_projects(self, query: str) -> Dict[str, Any]:
        """Busca projetos GitHub relacionados"""
        try:
            github = GitHubConnector()
            data = await github.search_projects(query)
            
            return {
                "source": "GitHub",
                "projects": data.get("projects", []),
                "total": data.get("total", 0),
                "showing": data.get("showing", 0)
            }
        except Exception as e:
            logger.error(f"Error fetching GitHub projects: {e}")
            return {"source": "GitHub", "projects": [], "total": 0, "showing": 0}
    
    def _group_scholarships_by_country(self, scholarships: List[Dict]) -> Dict[str, int]:
        """Agrupa bolsas por país"""
        by_country = {}
        for scholarship in scholarships:
            country = scholarship.get("country", "Unknown")
            by_country[country] = by_country.get(country, 0) + 1
        return by_country
    
    def _group_scholarships_by_level(self, scholarships: List[Dict]) -> Dict[str, int]:
        """Agrupa bolsas por nível (Mestrado/Doutorado/etc)"""
        by_level = {}
        for scholarship in scholarships:
            level = scholarship.get("type") or scholarship.get("level", "Unknown")
            by_level[level] = by_level.get(level, 0) + 1
        return by_level
