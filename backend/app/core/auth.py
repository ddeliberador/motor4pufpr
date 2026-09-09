"""
MOTOR DA INOVAÇÃO - Autenticação simples por chave de API

Todos os endpoints exigem o header "X-API-Key", exceto:
- /api/v1/health (healthcheck do Railway precisa ser público)
- /docs, /redoc, /openapi.json (documentação legível sem chave)
"""
import logging

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings

logger = logging.getLogger(__name__)

# Caminhos públicos (prefixos)
PUBLIC_PATHS = (
    "/docs",
    "/redoc",
    "/openapi.json",
    "/favicon.ico",
    f"{settings.API_PREFIX}/health",
)


def _is_public(path: str) -> bool:
    if path == "/":
        return True
    return any(path == p or path.startswith(p + "/") or path.startswith(p) for p in PUBLIC_PATHS)


class ApiKeyMiddleware(BaseHTTPMiddleware):
    """Exige o header X-API-Key em todos os endpoints protegidos."""

    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS" or _is_public(request.url.path):
            return await call_next(request)

        expected = settings.MCTI_API_KEY
        if not expected:
            # Sem chave configurada no ambiente: mantém a API aberta (dev local),
            # mas registra alerta para não passar despercebido em produção.
            logger.warning("MCTI_API_KEY não configurada — API sem autenticação")
            return await call_next(request)

        provided = request.headers.get("x-api-key")
        if not provided or provided != expected:
            return JSONResponse(
                status_code=401,
                content={"error": "X-API-Key header obrigatório ou inválido"},
            )

        return await call_next(request)
