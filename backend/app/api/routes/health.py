"""
MOTOR 4P UFPR - Health Check Routes
"""
from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "MOTOR 4P UFPR API",
        "version": "0.1.0"
    }


@router.get("/ready")
async def readiness_check():
    """Readiness check endpoint"""
    return {
        "status": "ready",
        "connectors": {
            "cnpq": "available",
            "openalex": "available",
            "comex": "available",
            "ibge": "available"
        }
    }
