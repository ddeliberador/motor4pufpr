"""
MOTOR 4P UFPR - Companies Routes
Companhias de capital aberto (CVM) por setor correspondente ao CNAE.

Recorte PARCIAL: apenas companhias de capital aberto registradas na CVM.
"""
import logging
from typing import List

from fastapi import APIRouter, Query

from app.connectors.cvm import CVMConnector

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/companies", tags=["Companies"])


@router.get("/public-by-cnae")
async def public_companies_by_cnae(
    cnae: List[str] = Query(default=[], description="Códigos CNAE (repetível ou separado por vírgula)"),
    limit: int = Query(default=10, ge=1, le=50),
):
    """
    Maiores companhias de capital aberto do setor, ranqueadas pela receita
    declarada à CVM (conta 3.01 da DRE, arquivo DFP mais recente).
    """
    codes: List[str] = []
    for item in cnae:
        codes.extend([c.strip() for c in str(item).split(",") if c.strip()])

    if not codes:
        return {
            "success": True,
            "data": {
                "available": False,
                "reason": "Nenhum código CNAE informado. Este bloco depende de classificação setorial.",
                "companies": [],
                "cnae_codes": [],
                "cvm_sectors": [],
            },
        }

    try:
        async with CVMConnector() as connector:
            data = await connector.get_top_companies_by_cnae(codes, limit=limit)
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"public_companies_by_cnae error: {e}")
        return {
            "success": False,
            "error": "Não foi possível consultar os dados abertos da CVM agora.",
            "data": {"available": False, "reason": str(e), "companies": []},
        }
