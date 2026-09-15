# MOTOR 4P UFPR - Backend Dockerfile
#
# Procedência fixada (issue #3):
#   - imagem base por digest (não por tag)
#   - Ollama em versão exata
#   - modelo Tucano 2 verificado pelo SHA-256 publicado no Hugging Face
#   - processo roda como usuário sem privilégio

# python:3.11-slim em 2026-09-14. Para atualizar:
#   docker pull python:3.11-slim && docker inspect python:3.11-slim --format='{{index .RepoDigests 0}}'
FROM python:3.11-slim@sha256:9534e5a8e315485d4061ed659af0fd78a284c015f9b73661b41d6bab25604534

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Dependências do sistema
RUN apt-get update && apt-get install -y \
    gcc curl ca-certificates zstd \
    && rm -rf /var/lib/apt/lists/*

# Ollama — versão exata (o instalador aceita OLLAMA_VERSION). Releases:
#   https://github.com/ollama/ollama/releases
ARG OLLAMA_VERSION=0.34.0
RUN curl -fsSL "https://ollama.com/install.sh" | OLLAMA_VERSION=${OLLAMA_VERSION} sh \
    && ollama --version

# Modelo Tucano 2 (2b4-Instruct, quantização Q3_K_M por tensorblock), baixado no
# build da imagem porque o Railway encerra requisições longas em runtime.
#   Fonte: https://huggingface.co/tensorblock/Tucano-2b4-Instruct-GGUF
#   SHA-256 do GGUF, conforme publicado pelo Hugging Face (LFS oid):
#     https://huggingface.co/api/models/tensorblock/Tucano-2b4-Instruct-GGUF/tree/main
# O Ollama guarda cada blob como sha256-<hash>; se o arquivo baixado não tiver
# exatamente o hash esperado, o blob não existe e o build falha aqui.
ARG TUCANO_MODEL=hf.co/tensorblock/Tucano-2b4-Instruct-GGUF:Q3_K_M
ARG TUCANO_GGUF_SHA256=ee4d1d3c2eaf7845c4a057fe3594bf3058029e73a836c799503d69f987322415
ENV TUCANO_MODEL=${TUCANO_MODEL}
ENV OLLAMA_MODELS=/app/.ollama/models
RUN mkdir -p "$OLLAMA_MODELS" \
    && (ollama serve > /tmp/ollama-build.log 2>&1 &) \
    && for i in $(seq 1 30); do curl -sf http://127.0.0.1:11434/api/version && break; sleep 1; done \
    && ollama pull "$TUCANO_MODEL" \
    && (pkill -f "ollama serve" || true)
RUN test -f "$OLLAMA_MODELS/blobs/sha256-$TUCANO_GGUF_SHA256" \
    || { echo "ERRO: GGUF baixado não confere com o SHA-256 esperado ($TUCANO_GGUF_SHA256)"; ls -la "$OLLAMA_MODELS/blobs"; exit 1; }

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

# Usuário sem privilégio
RUN useradd -m -u 1000 appuser \
    && chmod +x /app/start.sh \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

CMD ["/app/start.sh"]
