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

# Modelo Tucano 2 (2b4-Instruct, quantização Q4_K_M), montado no build da
# imagem porque o Railway encerra requisições longas em runtime.
#   Fonte: https://huggingface.co/GuilhermeAumo/Tucano-2b4-Instruct-Q4_K_M-GGUF
#   (gerado pelo gguf-my-repo a partir de TucanoBR/Tucano-2b4-Instruct),
#   fixado pelo commit do repositório e pelo SHA-256 publicado (LFS oid).
# O GGUF publicado registra `</instruction>` como token especial, que o modelo
# nunca viu no treino, e a saída vira lixo (issue #19). ollama/fix_tucano_gguf.py
# corrige só o vocabulário; o resultado é determinístico e também tem o
# SHA-256 conferido. No fim, o build pergunta a capital do RS e falha se a
# resposta não trouxer "Porto Alegre".
ARG TUCANO_GGUF_URL=https://huggingface.co/GuilhermeAumo/Tucano-2b4-Instruct-Q4_K_M-GGUF/resolve/c4fa9890bceb71946545997d093f09f89c825edb/tucano-2b4-instruct-q4_k_m.gguf
ARG TUCANO_GGUF_SHA256=c9ae932e0b53ce44fdeb9eb31d5aa16bf1012067a8d7a091c9d8e8ea7e1b9a35
ARG TUCANO_FIXED_SHA256=e6b47941f18412174e4ee01085f34fc5c613313de4e079e7ce6be273ba79c40e
ENV TUCANO_MODEL=tucano-2b4-instruct:q4_k_m
ENV OLLAMA_MODELS=/app/.ollama/models
COPY ollama/ /tmp/tucano/
RUN set -e; mkdir -p "$OLLAMA_MODELS"; cd /tmp/tucano \
    && curl -fsSL -o original.gguf "$TUCANO_GGUF_URL" \
    && echo "$TUCANO_GGUF_SHA256  original.gguf" | sha256sum -c - \
    && python -m venv /tmp/gguf-venv \
    && /tmp/gguf-venv/bin/pip install --no-cache-dir -q gguf==0.19.0 \
    && /tmp/gguf-venv/bin/python fix_tucano_gguf.py original.gguf tucano.gguf \
    && echo "$TUCANO_FIXED_SHA256  tucano.gguf" | sha256sum -c - \
    && (ollama serve > /tmp/ollama-build.log 2>&1 &) \
    && for i in $(seq 1 30); do curl -sf http://127.0.0.1:11434/api/version && break; sleep 1; done \
    && ollama create "$TUCANO_MODEL" -f Tucano.Modelfile \
    && resposta=$(curl -sf http://127.0.0.1:11434/api/chat -d "{\"model\":\"$TUCANO_MODEL\",\"stream\":false,\"messages\":[{\"role\":\"user\",\"content\":\"Qual cidade é a capital do estado do Rio Grande do Sul?\"}],\"options\":{\"temperature\":0,\"num_predict\":40}}") \
    && echo "$resposta" \
    && if ! echo "$resposta" | grep -q "Porto Alegre"; then echo "ERRO: o Tucano não respondeu Porto Alegre"; exit 1; fi \
    && (pkill -f "ollama serve" || true) \
    && rm -rf /tmp/tucano /tmp/gguf-venv

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
