"""
MOTOR 4P UFPR - Incidence Routes
Rotas principais da API de incidência
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging

from ...services.incidence_engine import IncidenceEngine
from ...services.ontology_engine import OntologyEngine
from ...models.schemas import SearchRequest, SearchResponse, OntologyMapping

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/incidence", tags=["Incidence"])

# Instâncias dos motores
incidence_engine = IncidenceEngine()
ontology_engine = OntologyEngine()


@router.post("/search", response_model=SearchResponse)
async def search_incidence(request: SearchRequest):
    """
    Busca incidência completa para um objeto tecnológico

    Retorna:
    - Mapeamento ontológico (códigos CNPq, IPC, NCM, CNAE)
    - Incidência científica (grupos de pesquisa, artigos)
    - Incidência tecnológica (patentes)
    - Incidência produtiva (comércio exterior)
    - Incidência institucional (instrumentos públicos)
    - Incidência internacional (comparação global)
    - Indicadores estruturais (C2T, GT, P2C, CD, ILT)
    """
    try:
        logger.info(f"Search request: {request.query}")

        result = await incidence_engine.analyze(
            query=request.query,
            include_international=request.include_international,
            include_papers=request.include_papers,
            limit=request.limit
        )

        return SearchResponse(
            success=True,
            data=result,
            cached=False
        )

    except Exception as e:
        logger.error(f"Search error: {e}", exc_info=True)
        return SearchResponse(
            success=False,
            error=str(e)
        )


@router.get("/search")
async def search_incidence_get(
    query: str = Query(..., min_length=2, description="Objeto tecnológico a buscar"),
    include_international: bool = Query(True, description="Incluir comparação internacional"),
    include_papers: bool = Query(True, description="Incluir artigos científicos"),
    limit: int = Query(50, ge=1, le=200, description="Limite de resultados por categoria")
):
    """
    Busca incidência via GET (alternativa ao POST)
    """
    request = SearchRequest(
        query=query,
        include_international=include_international,
        include_papers=include_papers,
        limit=limit
    )
    return await search_incidence(request)


@router.get("/ontology")
async def get_ontology(
    query: str = Query(..., min_length=2, description="Objeto tecnológico a traduzir")
):
    """
    Retorna apenas o mapeamento ontológico (sem buscar incidências)

    Útil para:
    - Validar tradução antes de busca completa
    - Entender quais códigos serão usados
    - Debug e desenvolvimento
    """
    try:
        mapping = ontology_engine.translate(query)
        return {
            "success": True,
            "data": mapping
        }
    except Exception as e:
        logger.error(f"Ontology error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/examples")
async def get_examples():
    """
    Retorna exemplos de objetos tecnológicos para busca
    """
    return {
        "examples": [
            {
                "query": "baterias de sódio",
                "description": "Tecnologia de armazenamento de energia alternativa ao lítio",
                "areas": ["Energia", "Materiais", "Química"]
            },
            {
                "query": "inteligência artificial industrial",
                "description": "Aplicações de IA para manufatura e indústria 4.0",
                "areas": ["Computação", "Engenharia de Produção", "Automação"]
            },
            {
                "query": "biomateriais para implantes",
                "description": "Materiais biocompatíveis para aplicações médicas",
                "areas": ["Materiais", "Medicina", "Bioengenharia"]
            },
            {
                "query": "semicondutores",
                "description": "Componentes eletrônicos fundamentais",
                "areas": ["Física", "Engenharia Elétrica", "Nanotecnologia"]
            },
            {
                "query": "células solares de perovskita",
                "description": "Nova geração de células fotovoltaicas",
                "areas": ["Energia", "Materiais", "Física"]
            },
            {
                "query": "fármacos biotecnológicos",
                "description": "Medicamentos produzidos por engenharia genética",
                "areas": ["Farmácia", "Biotecnologia", "Medicina"]
            },
        ]
    }


@router.get("/indicators/methodology")
async def get_indicators_methodology():
    """
    Retorna documentação da metodologia dos indicadores
    """
    return {
        "indicators": {
            "C2T": {
                "name": "Maturidade Ciência → Tecnologia",
                "formula": "C2T = (Patentes / Grupos) × Fator_Citação",
                "description": "Mede a conversão de produção científica em outputs tecnológicos",
                "interpretation": {
                    ">70": "Alto - Forte transferência tecnológica",
                    "50-70": "Médio - Tradução em progresso",
                    "30-50": "Baixo-Médio - Tradução limitada",
                    "<30": "Baixo - Necessita fortalecimento"
                },
                "data_sources": ["CNPq (grupos)", "INPI (patentes)", "OpenAlex (citações)"]
            },
            "GT": {
                "name": "Gargalo de Tradução",
                "formula": "GT = 100 - [(Exploração × Produção/Importação)]",
                "description": "Identifica obstáculos na cadeia de tradução tecnológica",
                "interpretation": {
                    "<30": "Baixo - Ecossistema integrado",
                    "30-50": "Médio - Gargalos moderados",
                    "50-70": "Alto - Gargalos significativos",
                    ">70": "Crítico - Necessita intervenção"
                },
                "data_sources": ["INPI", "COMEX Stat", "BNDES"]
            },
            "P2C": {
                "name": "Aderência Política → Capacidade",
                "formula": "P2C = Σ(Instrumentos × Capacidade) / Total",
                "description": "Avalia alinhamento entre políticas e capacidade instalada",
                "interpretation": {
                    ">70": "Alto - Políticas bem direcionadas",
                    "50-70": "Médio - Espaço para otimização",
                    "30-50": "Baixo - Desalinhamento",
                    "<30": "Crítico - Instrumentos não atingem capacidades"
                },
                "data_sources": ["Finep", "BNDES", "Embrapii", "CNPq"]
            },
            "CD": {
                "name": "Concentração e Dependência",
                "formula": "CD = (Import/Total) × HHI_Concentração",
                "description": "Mede dependência de tecnologia e insumos externos",
                "interpretation": {
                    "<40": "Baixa - Base produtiva robusta",
                    "40-60": "Média - Diversificação recomendada",
                    "60-80": "Alta - Importações concentradas",
                    ">80": "Crítica - Vulnerabilidade estratégica"
                },
                "data_sources": ["COMEX Stat", "IBGE", "Receita Federal"]
            },
            "ILT": {
                "name": "Índice de Lacuna de Tradução",
                "formula": "ILT = (C2T×0.3) + ((100-GT)×0.3) + (P2C×0.2) + ((100-CD)×0.2)",
                "description": "Índice composto que resume situação geral de tradução",
                "interpretation": {
                    ">70": "Favorável - Ecossistema saudável",
                    "50-70": "Moderado - Funcional com melhorias",
                    "30-50": "Desafiador - Lacunas significativas",
                    "<30": "Crítico - Lacunas estruturais severas"
                },
                "data_sources": ["Todos os indicadores anteriores"]
            }
        }
    }
