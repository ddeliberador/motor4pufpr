# MOTOR 4P UFPR - Backend Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc curl ca-certificates zstd \
    && rm -rf /var/lib/apt/lists/*

# Ollama — servidor local do modelo aberto Tucano 2
RUN curl -fsSL https://ollama.com/install.sh | sh

# Baixa o modelo Tucano 2 JÁ NO BUILD da imagem.
# Motivo: o proxy do Railway encerra requisições HTTP após ~5 minutos; se o
# pull (~1,5 GB) ficasse para a primeira chamada, ela nunca completaria.
# Build demora mais, mas em runtime o modelo já está em disco e a análise
# começa imediatamente.
ARG TUCANO_MODEL=hf.co/tensorblock/Tucano-2b4-Instruct-GGUF:Q3_K_M
ENV TUCANO_MODEL=${TUCANO_MODEL}
ENV OLLAMA_MODELS=/app/.ollama/models
RUN mkdir -p "$OLLAMA_MODELS" \
    && (ollama serve > /tmp/ollama-build.log 2>&1 &) \
    && for i in $(seq 1 30); do curl -sf http://127.0.0.1:11434/api/version && break; sleep 1; done \
    && ollama pull "$TUCANO_MODEL" \
    && (pkill -f "ollama serve" || true)

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application using PORT environment variable from Railway
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
