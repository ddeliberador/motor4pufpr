"""
Endpoint para listar as bases públicas integradas ao Motor4PUFPR
"""
from fastapi import APIRouter
from ...core.integrated_bases import INTEGRATED_PUBLIC_BASES

router = APIRouter()

@router.get("/integrated-bases", summary="Lista as bases públicas integradas")
def get_integrated_bases():
    """
    Retorna a lista de bases públicas integradas ao Motor4PUFPR
    """
    return {"bases": INTEGRATED_PUBLIC_BASES}
