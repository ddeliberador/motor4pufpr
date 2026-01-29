"""
MOTOR 4P UFPR - Base Connector
Classe base para conectores de APIs externas
"""
import httpx
import asyncio
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, List
from cachetools import TTLCache
from tenacity import retry, stop_after_attempt, wait_exponential
import logging

from ..core.config import settings

logger = logging.getLogger(__name__)


class BaseConnector(ABC):
    """Classe base para conectores de APIs externas"""

    def __init__(self):
        self.cache = TTLCache(maxsize=1000, ttl=settings.CACHE_TTL_MEDIUM)
        self.client: Optional[httpx.AsyncClient] = None
        self._semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_REQUESTS)

    async def __aenter__(self):
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(settings.REQUEST_TIMEOUT),
            follow_redirects=True
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.client:
            await self.client.aclose()

    def _get_cache_key(self, method: str, url: str, params: Optional[Dict] = None) -> str:
        """Gera chave de cache única"""
        params_str = str(sorted(params.items())) if params else ""
        return f"{self.__class__.__name__}:{method}:{url}:{params_str}"

    def _get_cached(self, key: str) -> Optional[Any]:
        """Busca valor no cache"""
        return self.cache.get(key)

    def _set_cached(self, key: str, value: Any) -> None:
        """Armazena valor no cache"""
        self.cache[key] = value

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def _request(
        self,
        method: str,
        url: str,
        params: Optional[Dict] = None,
        headers: Optional[Dict] = None,
        json_data: Optional[Dict] = None,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """Executa requisição HTTP com retry e cache"""

        cache_key = self._get_cache_key(method, url, params)

        # Verifica cache
        if use_cache and method.upper() == "GET":
            cached = self._get_cached(cache_key)
            if cached is not None:
                logger.debug(f"Cache hit: {cache_key}")
                return cached

        # Executa requisição com semáforo para controle de concorrência
        async with self._semaphore:
            if not self.client:
                raise RuntimeError("Client not initialized. Use async context manager.")

            logger.info(f"Request: {method} {url}")

            response = await self.client.request(
                method=method,
                url=url,
                params=params,
                headers=headers,
                json=json_data
            )
            response.raise_for_status()

            data = response.json()

            # Armazena no cache
            if use_cache and method.upper() == "GET":
                self._set_cached(cache_key, data)

            return data

    async def get(self, url: str, params: Optional[Dict] = None, **kwargs) -> Dict[str, Any]:
        """Requisição GET"""
        return await self._request("GET", url, params=params, **kwargs)

    async def post(self, url: str, json_data: Optional[Dict] = None, **kwargs) -> Dict[str, Any]:
        """Requisição POST"""
        return await self._request("POST", url, json_data=json_data, **kwargs)

    @abstractmethod
    async def search(self, query: str, **kwargs) -> List[Any]:
        """Método de busca a ser implementado por cada conector"""
        pass

    @abstractmethod
    def get_source_name(self) -> str:
        """Retorna nome da fonte de dados"""
        pass
