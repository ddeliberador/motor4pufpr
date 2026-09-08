#!/usr/bin/env bash
# MOTOR DA INOVAÇÃO - inicialização do container
#
# Sobe o Ollama em background (sem baixar modelo) e a API em seguida.
# O download do modelo Tucano 2 acontece SÓ na primeira chamada de análise
# (lazy load em app/services/local_llm.py), para não atrasar o health check
# do Railway nem reservar RAM sem necessidade.
set -e

export OLLAMA_HOST="${OLLAMA_HOST:-127.0.0.1:11434}"
export OLLAMA_MODELS="${OLLAMA_MODELS:-/app/.ollama/models}"
mkdir -p "$OLLAMA_MODELS"

if command -v ollama >/dev/null 2>&1; then
  echo "[start] iniciando ollama serve em background (sem pull)"
  ollama serve >/tmp/ollama.log 2>&1 &
else
  echo "[start] AVISO: ollama não encontrado — análise por IA local ficará indisponível"
fi

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
