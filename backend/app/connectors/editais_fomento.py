"""
Conector de Editais de Fomento — Finep e CNPq
Fontes:
  - finep.gov.br/chamadas-publicas (sem API — HTML parsing)
  - gov.br/cnpq/chamadas/abertas-para-submissao (sem API — HTML parsing)
Estratégia: curadoria dos editais NIB 2026 (R$ 3,3bi) + parsing HTML para chamadas abertas
"""
import logging
import httpx
import re
from typing import Any
from datetime import datetime

logger = logging.getLogger(__name__)

# Curadoria dos editais Finep NIB 2026 (confirmados — R$ 3,3bi total, 10 editais)
# Fonte: ABGi Brasil, abgi-brasil.com/oportunidades-abertas-finep/ (30/04/2026)
EDITAIS_NIB_2026 = [
    {
        "titulo": "Finep Tecnologias Digitais — Transformação Digital",
        "orgao": "Finep / Nova Indústria Brasil",
        "valor": "R$ 300.000.000",
        "trl_aceito": "TRL 4 a 9",
        "elegivel": "Empresas com fins lucrativos",
        "prazo": "30/09/2026",
        "prazo_urgencia": "proximo",
        "missao_nib": "Transformação Digital",
        "url": "https://www.finep.gov.br/chamadas-publicas/chamadaspublicas?situacao=aberta",
        "situacao": "aberta",
    },
    {
        "titulo": "Finep NIB — Transição Energética e Energias Renováveis",
        "orgao": "Finep / Nova Indústria Brasil",
        "valor": "Parte dos R$ 3,3bi",
        "trl_aceito": "TRL 4 a 9",
        "elegivel": "Empresas com fins lucrativos",
        "prazo": "Verificar portal Finep",
        "prazo_urgencia": "normal",
        "missao_nib": "Transição e Segurança Energética",
        "url": "https://www.finep.gov.br/chamadas-publicas/chamadaspublicas?situacao=aberta",
        "situacao": "aberta",
    },
    {
        "titulo": "Finep NIB — Saúde (Complexo Econômico-Industrial da Saúde)",
        "orgao": "Finep / Nova Indústria Brasil",
        "valor": "Parte dos R$ 3,3bi",
        "trl_aceito": "TRL 4 a 9",
        "elegivel": "Empresas com fins lucrativos + parceria com ICT ou Hospital",
        "prazo": "Verificar portal Finep",
        "prazo_urgencia": "normal",
        "missao_nib": "Saúde",
        "url": "https://www.finep.gov.br/chamadas-publicas/chamadaspublicas?situacao=aberta",
        "situacao": "aberta",
    },
    {
        "titulo": "Finep NIB — Agro (Bioeconomia e Sistemas Alimentares)",
        "orgao": "Finep / Nova Indústria Brasil",
        "valor": "Parte dos R$ 3,3bi",
        "trl_aceito": "TRL 4 a 9",
        "elegivel": "Empresas com fins lucrativos",
        "prazo": "Verificar portal Finep",
        "prazo_urgencia": "normal",
        "missao_nib": "Bioeconomia, Agro e Sistemas Alimentares",
        "url": "https://www.finep.gov.br/chamadas-publicas/chamadaspublicas?situacao=aberta",
        "situacao": "aberta",
    },
    {
        "titulo": "Finep NIB — Defesa e Segurança",
        "orgao": "Finep / Nova Indústria Brasil",
        "valor": "Parte dos R$ 3,3bi",
        "trl_aceito": "TRL 3 a 9",
        "elegivel": "Empresas de defesa credenciadas",
        "prazo": "Verificar portal Finep",
        "prazo_urgencia": "normal",
        "missao_nib": "Defesa e Segurança",
        "url": "https://www.finep.gov.br/chamadas-publicas/chamadaspublicas?situacao=aberta",
        "situacao": "aberta",
    },
    {
        "titulo": "Finep Pesquisa Aplicada em Centros Temáticos 2025",
        "orgao": "Finep",
        "valor": "Definido por edital",
        "trl_aceito": "TRL 1 a 6",
        "elegivel": "ICTs (Fundações de Apoio)",
        "prazo": "Verificar portal Finep — rerratificado em 29/04/2026",
        "prazo_urgencia": "normal",
        "missao_nib": None,
        "url": "https://www.finep.gov.br/chamadas-publicas/chamadaspublicas?situacao=aberta",
        "situacao": "aberta",
    },
    {
        "titulo": "Finep Mais Inovação Brasil — Rodada 2",
        "orgao": "Finep",
        "valor": "Parte dos R$ 3,3bi",
        "trl_aceito": "TRL 4 a 9",
        "elegivel": "Empresas com fins lucrativos",
        "prazo": "Verificar resultado de habilitação — resultado preliminar em 27/04/2026",
        "prazo_urgencia": "normal",
        "missao_nib": "Transversal",
        "url": "https://www.finep.gov.br/chamadas-publicas/chamadaspublicas?situacao=aberta",
        "situacao": "em_habilitacao",
    },
]

# Chamadas abertas CNPq (curadas em 14/09/2026)
CHAMADAS_CNPQ_2026 = [
    {
        "titulo": "CNPq — Biotecnologia (saúde, agro, ambiental e industrial)",
        "orgao": "CNPq / MCTI",
        "elegivel": "Pesquisadores vinculados a ICTs",
        "prazo": "Verificar portal CNPq",
        "prazo_urgencia": "normal",
        "publicado": "03/08/2026",
        "url": "https://www.gov.br/cnpq/pt-br/chamadas/abertas-para-submissao",
    },
    {
        "titulo": "CNPq — MAI/DAI 2026 (Mestrado/Doutorado para Inovação em parceria com empresa)",
        "orgao": "CNPq / CAPES",
        "elegivel": "Universidades em parceria com empresas",
        "prazo": "11/12/2026",
        "prazo_urgencia": "normal",
        "publicado": "28/04/2026",
        "url": "https://www.gov.br/cnpq/pt-br/chamadas/abertas-para-submissao",
    },
    {
        "titulo": "CNPq — Eventos de empreendedorismo e inovação",
        "orgao": "CNPq",
        "elegivel": "Organizações de pesquisa e inovação",
        "prazo": "Verificar portal CNPq",
        "prazo_urgencia": "normal",
        "publicado": "04/08/2026",
        "url": "https://www.gov.br/cnpq/pt-br/chamadas/abertas-para-submissao",
    },
    {
        "titulo": "CNPq/ERC — Parceria Brasil-Europa (Conselho Europeu de Pesquisa)",
        "orgao": "CNPq / ERC",
        "elegivel": "Pesquisadores seniores vinculados a ICTs brasileiras",
        "prazo": "Verificar portal CNPq",
        "prazo_urgencia": "normal",
        "publicado": "04/08/2026",
        "url": "https://www.gov.br/cnpq/pt-br/chamadas/abertas-para-submissao",
    },
]

async def _parse_chamadas_cnpq(client: httpx.AsyncClient) -> list[dict]:
    """Tenta fazer parsing das chamadas abertas do CNPq."""
    try:
        r = await client.get(
            "https://www.gov.br/cnpq/pt-br/chamadas/abertas-para-submissao",
            timeout=15,
        )
        if r.status_code != 200:
            return []
        html = r.text
        # Extrai títulos de chamadas (padrão observado na página gov.br/cnpq)
        chamadas: list[dict] = []
        # Padrão: links de chamadas na página
        matches = re.findall(
            r'href="(https://www\.gov\.br/cnpq[^"]*chamada[^"]*)"[^>]*>([^<]{20,300})<',
            html, re.IGNORECASE
        )
        for url, titulo in matches[:8]:
            chamadas.append({
                "titulo": titulo.strip(),
                "url": url,
                "orgao": "CNPq",
                "prazo_urgencia": "normal",
                "fonte": "gov.br/cnpq (parsing HTML)",
            })
        return chamadas
    except Exception as e:
        logger.warning(f"Parsing CNPq falhou: {e}")
        return []

async def buscar_editais_fomento(
    query: str | None = None,
    uf: str | None = None,
    tipo: str | None = None,  # "finep", "cnpq", "todos"
) -> dict[str, Any]:
    """
    Retorna editais de fomento Finep e CNPq abertos.
    Sem API REST — combina curadoria atualizada com parsing HTML.
    """
    async with httpx.AsyncClient(headers={"User-Agent": "Motor4P-UFPR/1.0 (motor4p@ufpr.br)"}) as client:
        # Tenta parsing ao vivo do CNPq
        chamadas_cnpq_live = await _parse_chamadas_cnpq(client)

        # Filtra por query quando disponível
        editais_finep = EDITAIS_NIB_2026
        chamadas_cnpq = chamadas_cnpq_live if chamadas_cnpq_live else CHAMADAS_CNPQ_2026

        if query:
            q = query.lower()
            editais_finep = [e for e in editais_finep if
                q in e["titulo"].lower() or
                (e.get("missao_nib") and q in e["missao_nib"].lower())]
            chamadas_cnpq = [c for c in chamadas_cnpq if q in c["titulo"].lower()]

        # Urgentes (prazo próximo)
        urgentes = [e for e in editais_finep if e.get("prazo_urgencia") == "urgente"]
        proximos = [e for e in editais_finep if e.get("prazo_urgencia") == "proximo"]

        return {
            "disponivel": True,
            "editais_finep": editais_finep if tipo in (None, "finep", "todos") else [],
            "chamadas_cnpq": chamadas_cnpq if tipo in (None, "cnpq", "todos") else [],
            "resumo": {
                "total_finep": len(editais_finep),
                "total_cnpq": len(chamadas_cnpq),
                "valor_total_finep_nib": "R$ 3.300.000.000 (10 editais NIB 2026)",
                "urgentes": len(urgentes),
                "proximos": len(proximos),
                "cnpq_ao_vivo": len(chamadas_cnpq_live) > 0,
            },
            "query": query,
            "uf_filtro": uf,
            "nota_reserva_regional": (
                "Os editais NIB 2026 reservam mínimo de 30% dos recursos para "
                "regiões Norte, Nordeste e Centro-Oeste."
            ),
            "nota_api": (
                "Finep e CNPq não têm API REST de editais. "
                "Chamadas CNPq obtidas por parsing HTML de gov.br/cnpq/chamadas — "
                "sempre verificar prazo atual no portal oficial antes de submeter."
            ),
            "links_diretos": [
                {"label": "Chamadas abertas Finep", "url": "https://www.finep.gov.br/chamadas-publicas/chamadaspublicas?situacao=aberta"},
                {"label": "Chamadas abertas CNPq", "url": "https://www.gov.br/cnpq/pt-br/chamadas/abertas-para-submissao"},
                {"label": "Editais Nova Indústria Brasil (NIB)", "url": "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/noticias/2026/04"},
                {"label": "ABGi — resumo dos editais Finep NIB 2026", "url": "https://abgi-brasil.com/oportunidades-abertas-finep/"},
            ],
            "fontes": ["Finep (curadoria abril/2026)", "CNPq gov.br (parsing ao vivo)", "ABGi Brasil (30/04/2026)"],
        }
