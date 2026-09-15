"""
MOTOR 4P UFPR - Main Application
Ponto de entrada da API FastAPI

Execução:
    uvicorn app.main:app --reload --port 8000
"""
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.core.config import settings
from app.core.auth import ApiKeyMiddleware
from app.api.routes import health_router, incidence_router, productive_demand_router, integrated_bases_router, companies_router, analysis_router
from app.connectors.capes_sucupira import buscar_programas_pg, buscar_bolsistas
from app.connectors.anatel import buscar_cobertura_municipio
from app.connectors.formict import buscar_formict
from app.connectors.fapesp_bv import buscar_projetos_fapesp
from app.connectors.startupbase import buscar_startups
from app.connectors.editais_fomento import buscar_editais_fomento
from app.connectors.sisab import SISABConnector
from app.connectors.mcti_indicadores import buscar_indicadores_mcti
from app.connectors.inep import buscar_censo_educacao
from app.connectors.antt_anac import buscar_infraestrutura_transporte

# Configura logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)

# Cria aplicação FastAPI
app = FastAPI(
    title=settings.APP_NAME,
    description="""
## MOTOR 4P UFPR - A Camada Ausente da Política Industrial Brasileira

API para análise de incidência de objetos tecnológicos no sistema de inovação brasileiro.

### Funcionalidades:
- **Tradução Ontológica**: Converte objetos tecnológicos em códigos de classificação (CNPq, IPC, NCM, CNAE)
- **Incidência Científica**: Grupos de pesquisa, artigos científicos
- **Incidência Tecnológica**: Patentes brasileiras e internacionais
- **Incidência Produtiva**: Dados de comércio exterior
- **Incidência Institucional**: Instrumentos públicos de fomento
- **Indicadores Estruturais**: C2T, GT, P2C, CD, ILT

### Fontes de Dados:
- CNPq (Diretório de Grupos de Pesquisa)
- INPI (Base de Patentes)
- OpenAlex (Artigos Científicos)
- COMEX Stat (Comércio Exterior)
- BNDES (Financiamentos)
- Finep (Instrumentos de Fomento)
- IBGE (Classificações)

### Doutorado em Políticas Públicas - UFPR
- **Doutorando**: Decio Dalton Deliberador Filho
- **Orientador**: Walter Tadahiro Shima
    """,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS restrito — origens exatas (2.3 — regex anterior autorizava qualquer *.lovable.app com credenciais)
cors_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "https://motor4pufpr.lovable.app",
    "https://lovable.dev",
]

# Autenticação por chave de API (X-API-Key) — adicionada antes do CORS para que
# o CORS continue envolvendo também as respostas 401.
app.add_middleware(ApiKeyMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["X-API-Key", "Content-Type", "Authorization"],
)


# Cabeçalhos de segurança HTTP — 2.2 do relatório de segurança 2026-09-14
@app.middleware("http")
async def add_security_headers(request: Request, call_next) -> Response:
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if request.url.path.startswith("/api/v1/") and request.url.path != "/api/v1/health":
        response.headers["Cache-Control"] = "no-store"
    return response

# Registra rotas
app.include_router(health_router, prefix=settings.API_PREFIX)
app.include_router(incidence_router, prefix=settings.API_PREFIX)
app.include_router(productive_demand_router, prefix=settings.API_PREFIX)
app.include_router(integrated_bases_router, prefix=settings.API_PREFIX)
app.include_router(companies_router, prefix=settings.API_PREFIX)
app.include_router(analysis_router, prefix=settings.API_PREFIX)


@app.get("/api/v1/capes/programas")
async def capes_programas(uf: str = "", area: str = "", ies: str = ""):
    return await buscar_programas_pg(
        area_conhecimento=area or None,
        uf=uf or None,
        ies=ies or None,
    )

@app.get("/api/v1/capes/bolsistas")
async def capes_bolsistas(uf: str = ""):
    return await buscar_bolsistas(uf=uf or None)

@app.get("/api/v1/anatel/cobertura")
async def anatel_cobertura(
    municipio: str = "",
    uf: str = "",
    municipio_ibge: str = "",
):
    return await buscar_cobertura_municipio(
        municipio=municipio or None,
        uf=uf or None,
        municipio_ibge=municipio_ibge or None,
    )

@app.get("/api/v1/formict/nits")
async def formict_nits(uf: str = ""):
    return await buscar_formict(uf=uf or None)

@app.get("/api/v1/fapesp/projetos")
async def fapesp_projetos(q: str = "", uf: str = "", area: str = ""):
    return await buscar_projetos_fapesp(
        query=q or "inovação",
        uf=uf or None,
        area=area or None,
    )

@app.get("/api/v1/startups/ecossistema")
async def startups_ecossistema(q: str = "", uf: str = "", setor: str = ""):
    return await buscar_startups(
        query=q or None,
        uf=uf or None,
        setor=setor or None,
    )

@app.get("/api/v1/fomento/editais")
async def fomento_editais(q: str = "", uf: str = "", tipo: str = "todos"):
    return await buscar_editais_fomento(
        query=q or None,
        uf=uf or None,
        tipo=tipo or "todos",
    )

@app.get("/api/v1/sisab/cobertura")
async def sisab_cobertura(
    uf: str = "",
    report: str = "aps",
    competencia: str = "202601",
):
    """Cobertura SISAB real (relatorioaps-prd.saude.gov.br).
    Com UF: municípios da UF; sem UF: as 27 UFs. Falha explícita, nunca silenciosa."""
    try:
        connector = SISABConnector()
        if uf:
            rows = await connector.get_coverage_by_municipality(
                uf=uf.upper(), comp_start=competencia, report=report
            )
        else:
            rows = await connector.get_coverage_by_uf(
                comp_start=competencia, report=report
            )
        return {
            "disponivel": True,
            "fonte": connector.get_source_name(),
            "total": len(rows),
            "resultados": rows,
        }
    except Exception as e:
        logger.warning(f"SISAB cobertura falhou: {e}")
        return {"disponivel": False, "fonte": "SISAB", "erro": str(e)[:200]}

@app.get("/api/v1/mcti/indicadores")
async def mcti_indicadores(q: str = ""):
    return await buscar_indicadores_mcti(query=q or None)

@app.get("/api/v1/inep/censo")
async def inep_censo(uf: str = "", area: str = ""):
    return await buscar_censo_educacao(uf=uf or None, area=area or None)

@app.get("/api/v1/antt/transporte")
async def antt_transporte(uf: str = "", tipo: str = "todos"):
    return await buscar_infraestrutura_transporte(uf=uf or None, tipo=tipo or "todos")

@app.get("/")
async def root():
    """Endpoint raiz"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": "A Camada Ausente da Política Industrial Brasileira",
        "docs": "/docs",
        "api": settings.API_PREFIX,
        "endpoints": {
            "health": f"{settings.API_PREFIX}/health",
            "search": f"{settings.API_PREFIX}/incidence/search",
            "ontology": f"{settings.API_PREFIX}/incidence/ontology",
            "examples": f"{settings.API_PREFIX}/incidence/examples",
            "methodology": f"{settings.API_PREFIX}/incidence/indicators/methodology"
        }
    }


@app.on_event("startup")
async def startup_event():
    """Executa na inicialização"""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"API prefix: {settings.API_PREFIX}")
    logger.info(f"Debug mode: {settings.DEBUG}")


@app.on_event("shutdown")
async def shutdown_event():
    """Executa no encerramento"""
    logger.info("Shutting down...")


# Para execução direta
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
