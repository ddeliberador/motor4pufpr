"""
Conector MCTI — Indicadores Nacionais de CT&I
Fonte: mcti.gov.br + dados.gov.br (CKAN) + OCTI/CGEE (Painel WoS)
Publicação anual em PDF/planilha — sem API REST unificada
Estratégia: curadoria dos principais indicadores + links para datasets no dados.gov.br
"""
import logging
import httpx
import os
from typing import Any

logger = logging.getLogger(__name__)

# Indicadores curados do Relatório MCTI 2024 — CT&I em Números
# Fonte: mcti.gov.br/indicadores (publicado set/2024)
INDICADORES_CURADOS = {
    "periodo_referencia": "2022-2023",
    "publicacao": "Relatório CT&I em Números 2024 — MCTI",
    "url": "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/indicadores",
    "indicadores": [
        {"nome": "Investimento total em P&D (% PIB)", "valor": "1,20%", "ano": 2022, "fonte": "MCTI"},
        {"nome": "Investimento público em P&D (% PIB)", "valor": "0,67%", "ano": 2022, "fonte": "MCTI"},
        {"nome": "Investimento privado em P&D (% PIB)", "valor": "0,53%", "ano": 2022, "fonte": "MCTI"},
        {"nome": "Pesquisadores (ETC — Equivalente Tempo Completo)", "valor": "180.000+", "ano": 2022, "fonte": "MCTI"},
        {"nome": "Artigos científicos publicados no mundo (ranking)", "valor": "9º lugar", "ano": 2023, "fonte": "Scimago"},
        {"nome": "Patentes depositadas no INPI por residentes", "valor": "4.200+", "ano": 2023, "fonte": "INPI"},
        {"nome": "Empresas que inovaram (PINTEC)", "valor": "33,6%", "ano": 2021, "fonte": "IBGE/PINTEC"},
        {"nome": "Dispêndio empresarial em P&D (R$ bilhões)", "valor": "R$ 98bi", "ano": 2022, "fonte": "MCTI"},
        {"nome": "Bolsas CNPq ativas", "valor": "85.000+", "ano": 2023, "fonte": "CNPq"},
        {"nome": "Programas de pós-graduação (CAPES)", "valor": "9.400+", "ano": 2024, "fonte": "CAPES/Sucupira"},
    ],
    "comparativo_internacional": {
        "nota": "Brasil investe 1,20% do PIB em P&D vs. média OCDE de 2,7%. Meta nacional: atingir 2% do PIB até 2030 (Nova Indústria Brasil).",
        "fonte": "OCDE Main Science and Technology Indicators 2023",
    },
}

async def buscar_indicadores_mcti(query: str | None = None) -> dict[str, Any]:
    """
    Retorna indicadores nacionais de CT&I do MCTI.
    Sem API REST — dados curados do Relatório MCTI 2024.
    """
    async with httpx.AsyncClient(headers={"User-Agent": "Motor4P-UFPR/1.0 (motor4p@ufpr.br)"}) as client:
        # Tenta descobrir datasets no dados.gov.br
        datasets: list[dict] = []
        try:
            chave = os.getenv("DADOS_GOV_API_KEY", "")
            headers_req: dict = {"User-Agent": "Motor4P-UFPR/1.0 (motor4p@ufpr.br)"}
            if chave:
                headers_req["chave-api-dados-abertos"] = chave
            r = await client.get(
                "https://dados.gov.br/dados/api/publico/conjuntos-dados",
                params={"organizacao": "ministerio-da-ciencia-tecnologia-e-inovacoes", "pagina": 1, "tamanhoPagina": 5},
                headers=headers_req,
                timeout=12,
            )
            if r.status_code == 200:
                data = r.json()
                items = data if isinstance(data, list) else data.get("data", [])
                datasets = [{"titulo": d.get("title", d.get("nome", "")), "url": d.get("url", "")} for d in items[:5]]
        except Exception as e:
            logger.warning(f"MCTI dados.gov.br: {e}")

        # Filtra indicadores por query
        indicadores = INDICADORES_CURADOS["indicadores"]
        if query:
            q = query.lower()
            indicadores = [i for i in indicadores if q in i["nome"].lower() or q in i.get("fonte", "").lower()] or INDICADORES_CURADOS["indicadores"]

        return {
            "disponivel": True,
            "fonte": "MCTI — Indicadores Nacionais de CT&I",
            "url_portal": "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/indicadores",
            "indicadores_curados": indicadores,
            "comparativo": INDICADORES_CURADOS["comparativo_internacional"],
            "periodo_referencia": INDICADORES_CURADOS["periodo_referencia"],
            "datasets_dados_gov": datasets,
            "links_diretos": [
                {"label": "Relatório CT&I em Números 2024", "url": "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/indicadores"},
                {"label": "OCTI/CGEE — Painel WoS (especialização científica)", "url": "https://octi.cgee.org.br/panoramas/brasil/outros/painel-wos"},
                {"label": "dados.gov.br — MCTI datasets", "url": "https://dados.gov.br/dados/organizacoes/visualizar/ministerio-da-ciencia-tecnologia-e-inovacoes"},
                {"label": "OCDE — Main Science and Technology Indicators", "url": "https://www.oecd.org/en/data/datasets/main-science-and-technology-indicators.html"},
            ],
            "nota": "Indicadores publicados anualmente em PDF/Excel — sem API REST unificada. Curadoria atualizada com base no Relatório MCTI 2024.",
        }
