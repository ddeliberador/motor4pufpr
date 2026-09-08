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

# Ollama — servidor local do modelo aberto Tucano 2 (nenhum modelo é baixado aqui:
# o pull acontece sob demanda, na primeira chamada de análise)
RUN curl -fsSL https://ollama.com/install.sh | sh

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
