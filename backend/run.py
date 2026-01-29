#!/usr/bin/env python
"""
MOTOR 4P UFPR - Script de execução do backend

Uso:
    python run.py
"""
import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    debug = os.environ.get("DEBUG", "true").lower() == "true"

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=debug,
        log_level="info"
    )
