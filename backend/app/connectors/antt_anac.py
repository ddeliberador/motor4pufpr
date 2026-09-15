"""
Conector ANTT/ANAC — Dados de Infraestrutura de Transporte
Fontes: dados.gov.br (ANTT e ANAC datasets)
Sem API REST unificada — datasets CSV no dados.gov.br
"""
import logging
import httpx
import os
from typing import Any

logger = logging.getLogger(__name__)

DATASETS_CURADOS = {
    "antt": [
        {"label": "Dados de Passageiros Rodoviários Interestaduais", "url": "https://dados.gov.br/dataset/passageiros-transportados-no-transporte-rodoviario-interestadual-de-passageiros-trip", "tipo": "CSV"},
        {"label": "Concessões Rodoviárias Federais", "url": "https://dados.gov.br/dataset/concessoes-rodoviarias", "tipo": "CSV"},
        {"label": "Malha Ferroviária Nacional", "url": "https://dados.gov.br/dataset/malha-ferroviaria", "tipo": "shapefile"},
        {"label": "Registro Nacional de Transportadores Rodoviários de Cargas", "url": "https://dados.gov.br/dataset/rntrc-registro-nacional-de-transportadores-rodoviarios-de-carga", "tipo": "CSV"},
    ],
    "anac": [
        {"label": "Movimento Operacional — voos, passageiros, carga por aeroporto", "url": "https://dados.gov.br/dataset/vra", "tipo": "CSV mensal"},
        {"label": "Empresas Aéreas Regulares (doméstico e internacional)", "url": "https://dados.gov.br/dataset/empresas-aereas", "tipo": "CSV"},
        {"label": "Infraestrutura Aeroportuária — aeródromos cadastrados", "url": "https://dados.gov.br/dataset/aerodromos", "tipo": "CSV"},
        {"label": "Acidentes Aeronáuticos (CENIPA)", "url": "https://dados.gov.br/dataset/ocorrencias-aeronauticas-da-aviacao-civil-brasileira", "tipo": "CSV"},
    ],
}

async def buscar_infraestrutura_transporte(
    uf: str | None = None,
    tipo: str | None = None,  # "antt", "anac", "todos"
) -> dict[str, Any]:
    async with httpx.AsyncClient(headers={"User-Agent": "Motor4P-UFPR/1.0 (motor4p@ufpr.br)"}) as client:
        # Busca datasets adicionais no dados.gov.br
        datasets_extras: list[dict] = []
        try:
            chave = os.getenv("DADOS_GOV_API_KEY", "")
            headers_req: dict = {"User-Agent": "Motor4P-UFPR/1.0 (motor4p@ufpr.br)"}
            if chave:
                headers_req["chave-api-dados-abertos"] = chave
            org = "agencia-nacional-de-transportes-terrestres-antt" if tipo == "antt" else "agencia-nacional-de-aviacao-civil-anac"
            r = await client.get(
                "https://dados.gov.br/dados/api/publico/conjuntos-dados",
                params={"organizacao": org, "pagina": 1, "tamanhoPagina": 5},
                headers=headers_req,
                timeout=12,
            )
            if r.status_code == 200:
                items = r.json()
                if isinstance(items, list):
                    datasets_extras = [{"titulo": d.get("title", ""), "url": d.get("url", "")} for d in items[:5]]
        except Exception as e:
            logger.warning(f"ANTT/ANAC dados.gov.br: {e}")

        datasets_antt = DATASETS_CURADOS["antt"] if tipo in (None, "antt", "todos") else []
        datasets_anac = DATASETS_CURADOS["anac"] if tipo in (None, "anac", "todos") else []

        return {
            "disponivel": True,
            "fonte": "ANTT / ANAC — Dados Abertos de Infraestrutura de Transporte",
            "datasets_antt": datasets_antt,
            "datasets_anac": datasets_anac,
            "datasets_dinamicos": datasets_extras,
            "uf_filtro": uf,
            "links_portal": [
                {"label": "Portal de Dados Abertos ANTT", "url": "https://dados.gov.br/dados/organizacoes/visualizar/agencia-nacional-de-transportes-terrestres-antt"},
                {"label": "Portal de Dados Abertos ANAC", "url": "https://dados.gov.br/dados/organizacoes/visualizar/agencia-nacional-de-aviacao-civil-anac"},
                {"label": "Painel Estatístico ANAC — voos e passageiros", "url": "https://www.anac.gov.br/assuntos/dados-e-estatisticas/mercado-do-transporte-aereo"},
            ],
            "nota": "ANTT e ANAC publicam datasets no dados.gov.br — sem API REST de consulta. Dados de movimentação de passageiros e carga são relevantes como proxy de desenvolvimento econômico regional.",
        }
