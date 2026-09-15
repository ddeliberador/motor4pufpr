"""
Conector Lei do Bem / MCTI — Incentivo Fiscal à P&D Empresarial
Fonte: gov.br/mcti — Relatório anual (PDF/Excel)
Sem API REST — dados curados do Relatório Lei do Bem ano-base 2024 (publicado 16/07/2026)
"""
import logging
from typing import Any

logger = logging.getLogger(__name__)

# Dados reais publicados pelo MCTI em 16/07/2026 — Ano-base 2024
DADOS_2024 = {
    "ano_base": 2024,
    "publicado_em": "16/07/2026",
    "fonte": "MCTI — Relatório Lei do Bem Ano-base 2024",
    "url": "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/lei-do-bem",
    "empresas_beneficiadas": 4252,
    "investimento_pd_total_bilhoes": 51.59,
    "renunci_fiscal_bilhoes": 11.98,
    "percentual_deducao_basico": 60,
    "percentual_deducao_maximo": 80,
    "aliquota_irpj_csll": 34,
    "setores_mais_usuarios": [
        {"setor": "Veículos automotores", "empresas": 380},
        {"setor": "Fabricação de produtos farmacêuticos", "empresas": 290},
        {"setor": "Atividades de TI (desenvolvimento de software)", "empresas": 620},
        {"setor": "Petróleo e derivados (inclui P&D da Petrobras)", "empresas": 45},
        {"setor": "Fabricação de equipamentos eletroeletrônicos", "empresas": 210},
        {"setor": "Pesquisa e desenvolvimento", "empresas": 185},
    ],
    "condicoes_elegibilidade": [
        "Empresa com fins lucrativos",
        "Tributada pelo Lucro Real (IRPJ + CSLL)",
        "Realizar atividades de P&D básica, aplicada ou desenvolvimento experimental",
        "Entregar formulário FORMP&D ao MCTI até 31/agosto de cada ano",
        "Não beneficiar simultaneamente o mesmo gasto pela Lei de Informática",
    ],
    "beneficios_adicionais": [
        {"descricao": "Isenção de IPI na compra de equipamentos para P&D", "base_legal": "Art. 17, IX, Lei 11.196/2005"},
        {"descricao": "Dedução adicional de 20% nos gastos com pesquisadores contratados exclusivamente para P&D", "base_legal": "Art. 19-A"},
        {"descricao": "Redução a zero do IRRF sobre remessas ao exterior para pesquisa", "base_legal": "Art. 17, VIII"},
        {"descricao": "Depreciação acelerada de equipamentos para P&D", "base_legal": "Art. 17, IV"},
    ],
}


def calcular_beneficio(faturamento: float, percentual_pd: float = 3.0) -> dict[str, Any]:
    """Calcula o benefício fiscal estimado da Lei do Bem."""
    if faturamento <= 0 or percentual_pd <= 0:
        return {"erro": "Valores inválidos"}
    investimento = faturamento * (percentual_pd / 100)
    deducao_min = investimento * (DADOS_2024["percentual_deducao_basico"] / 100)
    deducao_max = investimento * (DADOS_2024["percentual_deducao_maximo"] / 100)
    economia_ir = deducao_min * (DADOS_2024["aliquota_irpj_csll"] / 100)
    return {
        "faturamento": faturamento,
        "percentual_pd": percentual_pd,
        "investimento_pd": investimento,
        "deducao_min": deducao_min,
        "deducao_max": deducao_max,
        "economia_ir_estimada": economia_ir,
        "aliquota_combinada": f"{DADOS_2024['aliquota_irpj_csll']}% (IRPJ 25% + CSLL 9%)",
    }


async def buscar_lei_do_bem(
    faturamento: float | None = None,
    percentual_pd: float = 3.0,
) -> dict[str, Any]:
    """Retorna dados da Lei do Bem e calcula benefício quando informado o faturamento."""
    resultado: dict[str, Any] = {
        "disponivel": True,
        "fonte": DADOS_2024["fonte"],
        "url": DADOS_2024["url"],
        "dados_anuais": DADOS_2024,
        "links_diretos": [
            {"label": "Portal Lei do Bem — MCTI", "url": "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/lei-do-bem"},
            {"label": "Formulário FORMP&D (entrega até 31/agosto)", "url": "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/lei-do-bem/formulario-formpd"},
            {"label": "IN RFB 2.332/2026 — atualização de regras", "url": "https://www.in.gov.br/en/web/dou/-/instrucao-normativa-rfb-n-2.332-de-2026"},
            {"label": "Relatório completo ano-base 2024", "url": "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/lei-do-bem/formulario-formpd/resultado-da-lei-do-bem-ano-base-2024"},
        ],
        "nota": "Dados curados do Relatório MCTI publicado em 16/07/2026. Atualização anual em julho/agosto.",
    }
    if faturamento and faturamento > 0:
        resultado["calculo"] = calcular_beneficio(faturamento, percentual_pd)
    return resultado
