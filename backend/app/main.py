"""
MOTOR 4P UFPR - Main Application
Ponto de entrada da API FastAPI

Execução:
    uvicorn app.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from .core.config import settings
from .api.routes import incidence_router, health_router

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

# Configuração CORS - permite origens do Lovable e desenvolvimento
cors_origins = [
    "http://localhost:5173",      # Vite dev
    "http://localhost:3000",      # React dev
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "https://motor4pufpr.lovable.app",  # Produção Lovable
    "https://*.lovable.app",      # Outros subdomínios Lovable
    "https://lovable.dev",        # Lovable editor
    "https://*.lovable.dev",      # Lovable subdomínios
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*\.lovable\.(app|dev)",  # Regex para Lovable
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registra rotas
app.include_router(health_router, prefix=settings.API_PREFIX)
app.include_router(incidence_router, prefix=settings.API_PREFIX)


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
