"""
MOTOR 4P UFPR - Data Schemas
Modelos de dados para o sistema
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# =============================================================================
# ENUMS
# =============================================================================

class IncidenceType(str, Enum):
    """Tipos de incidência no sistema"""
    SCIENTIFIC = "scientific"       # Grupos de pesquisa, artigos
    TECHNOLOGICAL = "technological" # Patentes
    PRODUCTIVE = "productive"       # Empresas, produção industrial
    INSTITUTIONAL = "institutional" # Instrumentos públicos
    INTERNATIONAL = "international" # Incidência global


# =============================================================================
# ONTOLOGY - Tradução de objetos tecnológicos
# =============================================================================

class OntologyMapping(BaseModel):
    """Mapeamento ontológico de um objeto tecnológico"""
    query: str = Field(..., description="Objeto tecnológico original")

    # Códigos de classificação
    cnpq_areas: List[Dict[str, str]] = Field(default_factory=list, description="Áreas do conhecimento CNPq")
    ipc_codes: List[Dict[str, str]] = Field(default_factory=list, description="Classificação Internacional de Patentes")
    ncm_codes: List[Dict[str, str]] = Field(default_factory=list, description="Nomenclatura Comum do Mercosul")
    cnae_codes: List[Dict[str, str]] = Field(default_factory=list, description="Classificação Nacional de Atividades Econômicas")

    # Termos expandidos para busca
    search_terms: List[str] = Field(default_factory=list, description="Termos de busca derivados")

    confidence: float = Field(default=0.0, ge=0, le=1, description="Confiança do mapeamento")


# =============================================================================
# SCIENTIFIC INCIDENCE - CNPq / OpenAlex
# =============================================================================

class ResearchGroup(BaseModel):
    """Grupo de pesquisa (CNPq)"""
    id: Optional[str] = None
    name: str
    institution: str
    institution_acronym: Optional[str] = None
    state: str
    city: Optional[str] = None
    area: str
    sub_area: Optional[str] = None
    leader: Optional[str] = None
    researchers_count: Optional[int] = None
    students_count: Optional[int] = None
    year_created: Optional[int] = None

    # Conexões internacionais
    international_collaboration: Optional[str] = None

    # Metadados
    source: str = "cnpq"
    last_updated: Optional[datetime] = None


class ScientificPaper(BaseModel):
    """Artigo científico (OpenAlex)"""
    id: str
    title: str
    authors: List[Dict[str, Any]]
    institutions: List[str]
    publication_year: int
    journal: Optional[str] = None
    doi: Optional[str] = None
    citations_count: int = 0

    # Classificação
    concepts: List[Dict[str, Any]] = Field(default_factory=list)

    # Acesso
    is_open_access: bool = False
    url: Optional[str] = None

    source: str = "openalex"


class ScientificIncidence(BaseModel):
    """Incidência científica agregada"""
    research_groups: List[ResearchGroup] = Field(default_factory=list)
    papers: List[ScientificPaper] = Field(default_factory=list)

    # Estatísticas
    total_groups: int = 0
    total_papers: int = 0
    total_researchers: int = 0

    # Distribuição geográfica
    by_state: Dict[str, int] = Field(default_factory=dict)
    by_institution: Dict[str, int] = Field(default_factory=dict)


# =============================================================================
# TECHNOLOGICAL INCIDENCE - INPI / Lens
# =============================================================================

class Patent(BaseModel):
    """Patente (INPI / Lens)"""
    id: str
    title: str
    abstract: Optional[str] = None
    applicants: List[str]
    inventors: List[str] = Field(default_factory=list)

    # Datas
    filing_date: Optional[str] = None
    publication_date: Optional[str] = None
    grant_date: Optional[str] = None

    # Classificação
    ipc_codes: List[str] = Field(default_factory=list)
    cpc_codes: List[str] = Field(default_factory=list)

    # Status
    status: Optional[str] = None

    # Citações
    citations_count: int = 0
    cited_by_count: int = 0

    # Origem
    country: str = "BR"
    source: str = "inpi"
    url: Optional[str] = None


class TechnologicalIncidence(BaseModel):
    """Incidência tecnológica agregada"""
    patents: List[Patent] = Field(default_factory=list)

    # Estatísticas
    total_patents: int = 0
    patents_by_year: Dict[str, int] = Field(default_factory=dict)
    patents_by_applicant_type: Dict[str, int] = Field(default_factory=dict)  # universidade, empresa, pessoa física

    # Top aplicantes
    top_applicants: List[Dict[str, Any]] = Field(default_factory=list)


# =============================================================================
# PRODUCTIVE INCIDENCE - COMEX / IBGE
# =============================================================================

class TradeData(BaseModel):
    """Dados de comércio exterior (COMEX Stat)"""
    ncm: str
    ncm_description: str

    # Exportação
    export_value_usd: float = 0
    export_quantity: float = 0
    export_countries: List[Dict[str, Any]] = Field(default_factory=list)

    # Importação
    import_value_usd: float = 0
    import_quantity: float = 0
    import_countries: List[Dict[str, Any]] = Field(default_factory=list)

    # Período
    year: int
    month: Optional[int] = None

    # Balanço
    trade_balance: float = 0


class ProductiveIncidence(BaseModel):
    """Incidência produtiva agregada"""
    trade_data: List[TradeData] = Field(default_factory=list)

    # Resumo
    total_exports_usd: float = 0
    total_imports_usd: float = 0
    trade_balance: float = 0

    # Dependência
    main_import_origins: List[Dict[str, Any]] = Field(default_factory=list)
    main_export_destinations: List[Dict[str, Any]] = Field(default_factory=list)


# =============================================================================
# INSTITUTIONAL INCIDENCE - BNDES / Finep
# =============================================================================

class PublicInstrument(BaseModel):
    """Instrumento público de fomento"""
    id: Optional[str] = None
    name: str
    organization: str  # BNDES, Finep, Embrapii, etc.
    type: str  # Subvenção, Financiamento, Bolsa, etc.

    # Status
    status: str  # Aberto, Encerrado, Contínuo

    # Valores
    total_value: Optional[float] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None

    # Elegibilidade
    eligible_entities: List[str] = Field(default_factory=list)
    eligible_areas: List[str] = Field(default_factory=list)

    # Datas
    opening_date: Optional[str] = None
    closing_date: Optional[str] = None

    # Link
    url: Optional[str] = None

    source: str = "manual"


class InstitutionalIncidence(BaseModel):
    """Incidência institucional agregada"""
    instruments: List[PublicInstrument] = Field(default_factory=list)

    # Financiamentos históricos (BNDES)
    historical_financing: List[Dict[str, Any]] = Field(default_factory=list)

    # Estatísticas
    total_available_value: float = 0
    instruments_by_type: Dict[str, int] = Field(default_factory=dict)
    instruments_by_organization: Dict[str, int] = Field(default_factory=dict)


# =============================================================================
# INTERNATIONAL INCIDENCE
# =============================================================================

class InternationalIncidence(BaseModel):
    """Incidência internacional"""
    country: str
    country_code: str
    flag_emoji: str

    # Dados científicos
    institutions_count: int = 0
    papers_count: int = 0

    # Dados tecnológicos
    patents_count: int = 0

    # Dados comerciais com Brasil
    exports_to_brazil_usd: float = 0
    imports_from_brazil_usd: float = 0

    # Relevância
    global_relevance: str = ""  # Líder, Alta P&D, Emergente, etc.


# =============================================================================
# INDICATORS - Índices estruturais
# =============================================================================

class IndicatorValue(BaseModel):
    """Valor de um indicador"""
    code: str
    name: str
    value: float = Field(..., ge=0, le=100)
    description: str
    methodology: Optional[str] = None

    # Interpretação
    level: str  # Alto, Médio, Baixo
    interpretation: str


class StructuralIndicators(BaseModel):
    """Conjunto de indicadores estruturais"""
    c2t: IndicatorValue = Field(..., description="Maturidade Ciência → Tecnologia")
    gt: IndicatorValue = Field(..., description="Gargalo de Tradução")
    p2c: IndicatorValue = Field(..., description="Aderência Política → Capacidade")
    cd: IndicatorValue = Field(..., description="Concentração e Dependência")

    # Índice composto (opcional)
    ilt: Optional[IndicatorValue] = Field(None, description="Índice de Lacuna de Tradução")


# =============================================================================
# COMPLETE INCIDENCE RESULT
# =============================================================================

class IncidenceResult(BaseModel):
    """Resultado completo da análise de incidência"""
    # Input
    query: str
    ontology: OntologyMapping

    # Incidências
    scientific: ScientificIncidence
    technological: TechnologicalIncidence
    productive: ProductiveIncidence
    institutional: InstitutionalIncidence
    international: List[InternationalIncidence] = Field(default_factory=list)

    # Indicadores
    indicators: StructuralIndicators

    # Estatísticas gerais
    stats: Dict[str, int] = Field(default_factory=dict)

    # Metadados
    generated_at: datetime = Field(default_factory=datetime.now)
    processing_time_ms: Optional[int] = None
    data_sources: List[str] = Field(default_factory=list)


# =============================================================================
# API Request/Response
# =============================================================================

class SearchRequest(BaseModel):
    """Requisição de busca"""
    query: str = Field(..., min_length=2, max_length=500)
    include_international: bool = True
    include_papers: bool = True
    limit: int = Field(default=50, ge=1, le=200)


class SearchResponse(BaseModel):
    """Resposta de busca"""
    success: bool
    data: Optional[IncidenceResult] = None
    error: Optional[str] = None
    cached: bool = False
