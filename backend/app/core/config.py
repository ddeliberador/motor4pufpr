"""
MOTOR 4P UFPR - Configuration
Configurações centralizadas do sistema
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    """Configurações da aplicação"""

    # App
    APP_NAME: str = "MOTOR 4P UFPR"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    # API
    API_PREFIX: str = "/api/v1"

    # Auth — chave institucional exigida no header X-API-Key
    MCTI_API_KEY: Optional[str] = None

    # Portal da Transparência (CGU) — chave gratuita obtida em
    # https://portaldatransparencia.gov.br/api-de-dados (conta gov.br com 2FA)
    TRANSPARENCIA_API_KEY: Optional[str] = None

    # Portal Brasileiro de Dados Abertos (CKAN) — chave gratuita gov.br
    # exigida pelo endpoint /api/3/action (responde 401 Bearer sem ela)
    DADOS_GOV_API_KEY: Optional[str] = None


    # Database (para futuro)
    DATABASE_URL: Optional[str] = None
    REDIS_URL: str = "redis://localhost:6379"

    # External APIs
    OPENALEX_EMAIL: Optional[str] = None  # Para aumentar rate limit
    COMEX_API_BASE: str = "https://api-comexstat.mdic.gov.br"
    IBGE_API_BASE: str = "https://servicodados.ibge.gov.br/api/v2"

    # Cache settings (em segundos)
    CACHE_TTL_SHORT: int = 300      # 5 minutos
    CACHE_TTL_MEDIUM: int = 3600    # 1 hora
    CACHE_TTL_LONG: int = 86400     # 24 horas

    # Rate limiting
    MAX_CONCURRENT_REQUESTS: int = 10
    REQUEST_TIMEOUT: int = 30

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Retorna instância cacheada das configurações"""
    return Settings()


settings = get_settings()
