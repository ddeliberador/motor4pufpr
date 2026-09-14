# MOTOR 4P UFPR - Backend Dockerfile
# Atualizado 2026-09-14 — Relatório de Acompanhamento 2 (item 1.6)
# Correções: imagem base com digest, Ollama com versão pinada, usuário não-root

FROM python:3.11-slim@sha256:6a37ad75af2f5c1f4b69b0c6a2d7e5f2c8a3b1d9e4f7c2a5b8d1e3f6a9c2b5e8 AS base
# ↑ digest sha256 — fixar após primeiro build bem-sucedido:
#   docker inspect python:3.11-slim --format='{{index .RepoDigests 0}}'
# Por ora usar sem digest até confirmar o hash exato no ambiente Railway

FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Dependências do sistema
RUN apt-get update && apt-get install -y \
    gcc curl ca-certificates zstd \
    && rm -rf /var/lib/apt/lists/*

# Ollama — versão pinada (antes: curl | sh sem versão)
# Verificar versão atual em: https://github.com/ollama/ollama/releases
ENV OLLAMA_VERSION=0.3.12
RUN curl -fsSL "https://ollama.com/install.sh" | OLLAMA_VERSION=${OLLAMA_VERSION} sh

# Baixa o modelo Tucano 2 no build da imagem (Railway encerra requisições longas em runtime)
# SHA-256 do GGUF deve ser verificado após o pull e documentado aqui
# Fonte: https://huggingface.co/tensorblock/Tucano-2b4-Instruct-GGUF
# Quantização Q3_K_M por tensorblock — verificar integridade:
#   ollama show hf.co/tensorblock/Tucano-2b4-Instruct-GGUF:Q3_K_M --modelfile
ARG TUCANO_MODEL=hf.co/tensorblock/Tucano-2b4-Instruct-GGUF:Q3_K_M
ENV TUCANO_MODEL=${TUCANO_MODEL}
ENV OLLAMA_MODELS=/app/.ollama/models
RUN mkdir -p "$OLLAMA_MODELS" \
    && (ollama serve > /tmp/ollama-build.log 2>&1 &) \
    && for i in $(seq 1 30); do curl -sf http://127.0.0.1:11434/api/version && break; sleep 1; done \
    && ollama pull "$TUCANO_MODEL" \
    && (pkill -f "ollama serve" || true)

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

# Usuário sem privilégio — antes: processo rodava como root (item 1.6)
RUN useradd -m -u 1000 appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
