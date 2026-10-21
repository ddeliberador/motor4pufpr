"""
MOTOR 4P UFPR - Coletas pesadas (séries municipais das Camadas de IA)

Dispara, em segundo plano, a coleta de uma base pública por município e
grava o resultado na camada temporal do Supabase. Protegido pelo X-API-Key
como todo o backend. O estado fica em ingest_runs / agenda_coletas.
"""
from __future__ import annotations

import logging
import threading
import time

from fastapi import APIRouter, HTTPException, Query

from app.services.series_municipais import COLETORES, executar_coleta

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/coletas", tags=["Coletas"])

_em_andamento: dict[str, float] = {}
_ultimos: dict[str, dict] = {}
_trava = threading.Lock()


def _rodar(fonte: str, amostra: int | None, simular: bool) -> None:
    try:
        _ultimos[fonte] = {"ok": True, **executar_coleta(fonte, amostra=amostra, simular=simular)}
    except Exception as e:  # noqa: BLE001
        logger.exception("coleta %s falhou", fonte)
        _ultimos[fonte] = {"ok": False, "fonte": fonte, "erro": str(e)}
    finally:
        with _trava:
            _em_andamento.pop(fonte, None)


@router.get("/municipal")
async def listar_fontes():
    """Fontes disponíveis, o que está rodando e o último resultado de cada uma."""
    return {
        "fontes": {k: {"job": m.JOB, "indicadores": [i.id for i in m.INDICADORES], "doc": (m.__doc__ or "").strip().splitlines()[0]} for k, m in COLETORES.items()},
        "em_andamento": {k: round(time.time() - t) for k, t in _em_andamento.items()},
        "ultimos": _ultimos,
    }


@router.post("/municipal/{fonte}")
async def disparar(fonte: str, amostra: int | None = Query(None, ge=1), simular: bool = Query(False)):
    """Inicia a coleta em segundo plano e responde 202; acompanhe em GET /coletas/municipal."""
    if fonte not in COLETORES:
        raise HTTPException(404, f"fonte desconhecida: {fonte}")
    with _trava:
        if fonte in _em_andamento:
            raise HTTPException(409, f"{fonte} já está em andamento há {round(time.time() - _em_andamento[fonte])}s")
        _em_andamento[fonte] = time.time()
    threading.Thread(target=_rodar, args=(fonte, amostra, simular), name=f"coleta-{fonte}", daemon=True).start()
    return {"fonte": fonte, "aceito": True, "amostra": amostra, "simular": simular}
