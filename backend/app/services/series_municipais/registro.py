"""Registro dos coletores e execução de uma coleta de ponta a ponta."""
from __future__ import annotations

import logging
import time
from types import ModuleType

from .coletores import anatel_bl, aneel_gd, capes_ppg, cnpj_cnae, ibge_pop
from .municipios import TabelaMunicipios
from .postgrest import SupabaseServico

logger = logging.getLogger(__name__)

COLETORES: dict[str, ModuleType] = {m.ID: m for m in (ibge_pop, anatel_bl, aneel_gd, cnpj_cnae, capes_ppg)}


def executar_coleta(fonte: str, amostra: int | None = None, simular: bool = False, sb: SupabaseServico | None = None) -> dict:
    """
    Roda um coletor. `amostra` limita as linhas lidas por arquivo (teste);
    `simular` agrega e resume sem gravar nada no Supabase.
    """
    mod = COLETORES.get(fonte)
    if not mod:
        raise ValueError(f"fonte desconhecida: {fonte}; opções: {sorted(COLETORES)}")
    sb = sb or SupabaseServico()
    inicio = time.monotonic()
    municipios = TabelaMunicipios(sb)
    obs, escopo = mod.coletar(municipios, amostra=amostra)
    resumo = {
        "fonte": fonte, "observacoes": len(obs), "escopo": escopo,
        "indicadores": sorted({o.indicador_id for o in obs}),
        "periodos": sorted({o.periodo_referencia for o in obs})[-5:],
        "segundos": round(time.monotonic() - inicio, 1),
    }
    if simular:
        resumo["simulado"] = True
        return resumo
    if not obs:
        raise RuntimeError(f"{fonte}: a coleta não produziu observações; nada gravado")
    for ind in mod.INDICADORES:
        sb.garantir_indicador(ind)
    coleta = sb.iniciar_coleta(job_id=mod.JOB, fonte=fonte, versao=mod.VERSAO, escopo=escopo)
    try:
        inseridas, ignoradas = sb.registrar_observacoes(coleta, obs)
        sb.finalizar_coleta(coleta, ok=True)
        resumo.update({"coleta_id": coleta.id, "inseridas": inseridas, "ignoradas": ignoradas})
        sb.atualizar_agenda(mod.JOB, "ok" if escopo.get("completo", True) else "parcial", f"{inseridas} observações em {resumo['segundos']}s")
    except Exception as e:  # noqa: BLE001
        sb.finalizar_coleta(coleta, ok=False, erro=str(e))
        sb.atualizar_agenda(mod.JOB, "erro", str(e))
        raise
    return resumo
