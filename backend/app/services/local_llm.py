"""
MOTOR DA INOVAÇÃO - LLM local (Tucano 2 via Ollama)

Substitui provedores pagos de IA (Gemini/Anthropic) por um modelo aberto
brasileiro auto-hospedado: Tucano-2b4-Instruct em GGUF quantizado, servido
pelo Ollama no mesmo container do backend.

Características importantes:
- LAZY LOAD: o modelo só é baixado (`/api/pull`) na PRIMEIRA chamada de análise.
  O boot do container não baixa nada — o health check do Railway não é afetado
  e nenhuma RAM é reservada enquanto ninguém usa a análise.
- CPU: geração pode levar minutos. Timeouts generosos e erros explícitos.
"""
import asyncio
import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")

# Ollama puxa GGUF direto do Hugging Face com o formato
#   hf.co/<usuario>/<repo>:<QUANT>
# O repositório tensorblock/Tucano-2b4-Instruct-GGUF publica hoje apenas
# Q2_K e Q3_K_M (não há Q4_K_M). Usamos Q3_K_M (melhor qualidade disponível)
# e permitimos sobrescrever por variável de ambiente.
MODEL = os.environ.get(
    "TUCANO_MODEL",
    "hf.co/tensorblock/Tucano-2b4-Instruct-GGUF:Q3_K_M",
)

# O proxy do Railway encerra requisições em ~300s. O chat precisa caber nesse
# teto; o timeout local fica um pouco abaixo para devolver erro limpo em vez
# de "upstream error".
PULL_TIMEOUT = float(os.environ.get("OLLAMA_PULL_TIMEOUT", "900"))
CHAT_TIMEOUT = float(os.environ.get("OLLAMA_CHAT_TIMEOUT", "280"))

_model_ready = False
_pull_lock = asyncio.Lock()


class LocalLLMError(RuntimeError):
    """Erro claro e legível quando o modelo local não pôde responder."""


async def _ollama_alive(client: httpx.AsyncClient) -> bool:
    try:
        r = await client.get(f"{OLLAMA_URL}/api/version", timeout=10)
        return r.status_code == 200
    except Exception:
        return False


async def _model_present(client: httpx.AsyncClient) -> bool:
    try:
        r = await client.get(f"{OLLAMA_URL}/api/tags", timeout=15)
        if r.status_code != 200:
            return False
        names = [m.get("name", "") for m in r.json().get("models", [])]
        return any(n == MODEL or n.startswith(MODEL.split(":")[0]) for n in names)
    except Exception:
        return False


async def ensure_model(client: Optional[httpx.AsyncClient] = None) -> None:
    """Garante que o modelo está disponível — baixa sob demanda (lazy load)."""
    global _model_ready
    if _model_ready:
        return

    own = client is None
    client = client or httpx.AsyncClient()
    try:
        async with _pull_lock:
            if _model_ready:
                return
            if not await _ollama_alive(client):
                raise LocalLLMError(
                    "O servidor local do modelo (Ollama) não está respondendo em "
                    f"{OLLAMA_URL}. Verifique se o processo `ollama serve` subiu no container."
                )
            if await _model_present(client):
                _model_ready = True
                return

            logger.info("Baixando modelo local %s (primeira chamada)...", MODEL)
            r = await client.post(
                f"{OLLAMA_URL}/api/pull",
                json={"model": MODEL, "stream": False},
                timeout=PULL_TIMEOUT,
            )
            if r.status_code != 200:
                raise LocalLLMError(
                    f"Falha ao baixar o modelo {MODEL} (HTTP {r.status_code}): {r.text[:300]}"
                )
            _model_ready = True
            logger.info("Modelo local %s pronto.", MODEL)
    finally:
        if own:
            await client.aclose()


async def chat(
    system_prompt: str,
    user_message: str,
    *,
    temperature: float = 0.2,
    max_tokens: int = 900,
) -> str:
    """Chama o Tucano 2 local (endpoint /api/chat do Ollama) e devolve o texto."""
    async with httpx.AsyncClient() as client:
        await ensure_model(client)
        try:
            r = await client.post(
                f"{OLLAMA_URL}/api/chat",
                json={
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message},
                    ],
                    "stream": False,
                    "keep_alive": os.environ.get("OLLAMA_KEEP_ALIVE", "10m"),
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens,
                        "num_ctx": int(os.environ.get("OLLAMA_NUM_CTX", "4096")),
                    },
                },
                timeout=CHAT_TIMEOUT,
            )
        except httpx.TimeoutException as e:
            raise LocalLLMError(
                "O modelo local não respondeu dentro do tempo limite "
                f"({int(CHAT_TIMEOUT)}s). Em CPU, a geração pode ser lenta — tente novamente."
            ) from e
        except Exception as e:
            raise LocalLLMError(f"Erro ao falar com o modelo local: {e}") from e

    if r.status_code != 200:
        raise LocalLLMError(f"Modelo local retornou HTTP {r.status_code}: {r.text[:300]}")

    text = (r.json().get("message") or {}).get("content") or ""
    if not text.strip():
        raise LocalLLMError("O modelo local devolveu resposta vazia.")
    return text.strip()


def model_label() -> str:
    return "Tucano 2 (Tucano-2b4-Instruct, GGUF quantizado) — auto-hospedado via Ollama"
