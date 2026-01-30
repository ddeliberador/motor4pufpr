"""
Rota para consulta integrada de demanda produtiva (IBGE, SIDRA, CAPES, CNPq)
"""
from fastapi import APIRouter, Query
from typing import Optional
from ...services.productive_demand_engine import ProductiveDemandEngine

router = APIRouter()
engine = ProductiveDemandEngine()

@router.get("/productive-demand", summary="Consulta integrada de demanda produtiva")
async def get_productive_demand(
    query: str = Query(..., description="Termo ou área de interesse"),
    state: Optional[str] = Query(None, description="Sigla do estado (ex: PR, SP, BR para Brasil)")
):
    """
    Retorna dados integrados de demanda produtiva (IBGE, SIDRA, CAPES, CNPq)
    """
    result = await engine.get_productive_demand(query, state)
    return result
