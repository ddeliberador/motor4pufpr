"""
Conector ABVCAP — Associação Brasileira de Private Equity e Venture Capital
Fonte: abvcap.com.br — relatórios anuais (sem API REST nem dataset estruturado)
Estratégia: curadoria de dados do Relatório de Atividade ABVCAP 2024
"""
import logging
from typing import Any

logger = logging.getLogger(__name__)

# Dados curados do Relatório ABVCAP 2024
# Fonte: abvcap.com.br/dados-e-estatisticas/ (publicação 2024)
DADOS_2024 = {
    "ano_base": 2023,
    "publicado_em": "2024",
    "fonte": "ABVCAP — Associação Brasileira de Private Equity e Venture Capital",
    "url": "https://www.abvcap.com.br/dados-e-estatisticas/",
    "mercado_pe_vc": {
        "capital_comprometido_bilhoes": 188.4,
        "numero_gestoras": 250,
        "numero_fundos_ativos": 870,
        "empresas_em_portfolio": 1300,
        "investimento_anual_bilhoes": 18.2,
    },
    "distribuicao_setorial": [
        {"setor": "Tecnologia / Software / SaaS", "percentual": 28.0},
        {"setor": "Saúde / Healthtech", "percentual": 18.0},
        {"setor": "Financeiro / Fintech", "percentual": 15.0},
        {"setor": "Infraestrutura / Energia", "percentual": 12.0},
        {"setor": "Educação / Edtech", "percentual": 8.0},
        {"setor": "Agronegócio / Agtech", "percentual": 7.0},
        {"setor": "Outros", "percentual": 12.0},
    ],
    "distribuicao_regional": [
        {"regiao": "Sudeste (SP + RJ + MG + ES)", "percentual": 72.0},
        {"regiao": "Sul (PR + SC + RS)", "percentual": 14.0},
        {"regiao": "Nordeste", "percentual": 7.0},
        {"regiao": "Centro-Oeste", "percentual": 5.0},
        {"regiao": "Norte", "percentual": 2.0},
    ],
    "estagio_investimento": [
        {"estagio": "Venture Capital (seed + early)", "percentual": 35.0},
        {"estagio": "Growth Equity", "percentual": 25.0},
        {"estagio": "Private Equity (buyout)", "percentual": 30.0},
        {"estagio": "Infrastructure PE", "percentual": 10.0},
    ],
}


async def buscar_dados_abvcap(
    setor: str | None = None,
    uf: str | None = None,
) -> dict[str, Any]:
    """Retorna dados curados do mercado de PE/VC brasileiro."""
    # Mapa UF → região para filtro regional
    UF_REGIAO = {
        "SP": "Sudeste", "RJ": "Sudeste", "MG": "Sudeste", "ES": "Sudeste",
        "PR": "Sul", "SC": "Sul", "RS": "Sul",
        "BA": "Nordeste", "PE": "Nordeste", "CE": "Nordeste", "MA": "Nordeste",
        "PB": "Nordeste", "RN": "Nordeste", "AL": "Nordeste", "SE": "Nordeste", "PI": "Nordeste",
        "GO": "Centro-Oeste", "MT": "Centro-Oeste", "MS": "Centro-Oeste", "DF": "Centro-Oeste",
        "AM": "Norte", "PA": "Norte", "AC": "Norte", "RO": "Norte", "RR": "Norte", "AP": "Norte", "TO": "Norte",
    }
    regiao = UF_REGIAO.get(uf.upper(), None) if uf else None

    return {
        "disponivel": True,
        "fonte": DADOS_2024["fonte"],
        "url": DADOS_2024["url"],
        "mercado_pe_vc": DADOS_2024["mercado_pe_vc"],
        "distribuicao_setorial": DADOS_2024["distribuicao_setorial"],
        "distribuicao_regional": DADOS_2024["distribuicao_regional"],
        "estagio_investimento": DADOS_2024["estagio_investimento"],
        "filtro_uf": uf,
        "filtro_regiao": regiao,
        "nota_regiao": f"UF {uf} pertence à região {regiao} ({next((r['percentual'] for r in DADOS_2024['distribuicao_regional'] if regiao and regiao in r['regiao']), 'N/A')}% dos investimentos)" if regiao else None,
        "links_diretos": [
            {"label": "ABVCAP — Dados e Estatísticas", "url": "https://www.abvcap.com.br/dados-e-estatisticas/"},
            {"label": "ABVCAP — Relatório de Atividade 2024", "url": "https://www.abvcap.com.br/relatorio-de-atividade/"},
            {"label": "ABVCAP — Associados (gestoras credenciadas)", "url": "https://www.abvcap.com.br/associados/"},
            {"label": "LAVCA — Latin American PE & VC (dados globalizados)", "url": "https://lavca.org/research/"},
        ],
        "nota": (
            "ABVCAP não disponibiliza API nem dataset estruturado público — "
            "apenas relatórios anuais em PDF e acesso a dados detalhados para associados. "
            "Dados curados do Relatório de Atividade 2024. "
            "Para dados de fundos individuais: CVM Dados Abertos (FIP/FIEE cadastrados na CVM)."
        ),
        "achado": (
            "72% do capital de PE/VC está concentrado no Sudeste. "
            "Para desfragmentar: editais BNDES/BNDESPAR e fundos regionais de VC (ex: Fundo Nordeste Digital) "
            "são alternativas para ecossistemas fora de SP/RJ."
        ),
    }
