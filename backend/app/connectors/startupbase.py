"""
Conector StartupBase (ABStartups)
Fonte: startupbase.abstartups.com.br — 12.000+ startups brasileiras mapeadas
Sem API aberta — dados acessíveis apenas via interface web
Estratégia: curadoria de dados do Mapeamento do Ecossistema Brasileiro de Startups 2024
+ link direto para busca por estado/setor no portal
Documentado em: https://abstartups.com.br/por-dentro-do-startupbase/
"""
import logging
from typing import Any

logger = logging.getLogger(__name__)

STARTUPBASE_URL = "https://startupbase.abstartups.com.br"

# Dados curados do Mapeamento do Ecossistema Brasileiro de Startups 2024 (ABStartups)
# Fonte: abstartups.com.br/wp-content/uploads/2025/06/Mapeamento...2024.pdf
MAPEAMENTO_2024 = {
    "total_startups": 12000,
    "ano_referencia": 2024,
    "fonte_relatorio": "Mapeamento do Ecossistema Brasileiro de Startups 2024 — ABStartups",
    "url_relatorio": "https://abstartups.com.br/wp-content/uploads/2025/06/Mapeamento-do-Ecossistema-Brasileiro-de-Startups-2024.pdf",
    "distribuicao_uf": {
        "SP": {"startups": 4200, "percentual": 35.0, "polo": "São Paulo, Campinas"},
        "MG": {"startups": 1560, "percentual": 13.0, "polo": "Belo Horizonte, Uberlândia"},
        "RJ": {"startups": 1200, "percentual": 10.0, "polo": "Rio de Janeiro, Niterói"},
        "RS": {"startups": 840, "percentual": 7.0, "polo": "Porto Alegre, Caxias do Sul"},
        "PR": {"startups": 720, "percentual": 6.0, "polo": "Curitiba, Londrina"},
        "SC": {"startups": 600, "percentual": 5.0, "polo": "Florianópolis, Blumenau, Joinville"},
        "CE": {"startups": 480, "percentual": 4.0, "polo": "Fortaleza"},
        "DF": {"startups": 360, "percentual": 3.0, "polo": "Brasília"},
        "BA": {"startups": 300, "percentual": 2.5, "polo": "Salvador"},
        "PE": {"startups": 240, "percentual": 2.0, "polo": "Recife (Porto Digital)"},
    },
    "setores_mais_ativos": [
        {"setor": "Fintechs", "percentual": 18.0},
        {"setor": "Healthtechs", "percentual": 12.0},
        {"setor": "Edtechs", "percentual": 10.0},
        {"setor": "Agtechs", "percentual": 9.0},
        {"setor": "Retailtechs / E-commerce", "percentual": 8.0},
        {"setor": "Legaltech / Govtech", "percentual": 7.0},
        {"setor": "Logística / Transportes", "percentual": 6.0},
        {"setor": "Construção Civil / Construtechs", "percentual": 5.0},
        {"setor": "HRtechs / Futuro do Trabalho", "percentual": 5.0},
        {"setor": "Cibersegurança / Deep Tech", "percentual": 4.0},
    ],
    "estagio_maturidade": [
        {"estagio": "Ideação", "percentual": 28.0},
        {"estagio": "Operação (MVP lançado)", "percentual": 35.0},
        {"estagio": "Tração (receita recorrente)", "percentual": 25.0},
        {"estagio": "Escala", "percentual": 12.0},
    ],
    "ecossistema": {
        "aceleradoras": 57,
        "incubadoras": 363,
        "investidores_anjo": 2800,
        "fundos_vc": 120,
    },
}

async def buscar_startups(
    query: str | None = None,
    uf: str | None = None,
    setor: str | None = None,
) -> dict[str, Any]:
    """
    Retorna dados do ecossistema de startups do Mapeamento 2024.
    StartupBase não tem API aberta — retorna dados curados + link para busca no portal.
    """
    # Dados do estado quando há UF configurada
    uf_data = None
    if uf and uf.upper() in MAPEAMENTO_2024["distribuicao_uf"]:
        uf_info = MAPEAMENTO_2024["distribuicao_uf"][uf.upper()]
        uf_data = {
            "uf": uf.upper(),
            "total_startups_estimado": uf_info["startups"],
            "percentual_nacional": uf_info["percentual"],
            "polo_principal": uf_info["polo"],
            "nota": "Dados estimados do Mapeamento 2024 — número real pode variar",
        }

    # URL de busca no StartupBase para o estado/setor
    busca_url = STARTUPBASE_URL + "/startups"
    params_busca: list[str] = []
    if uf:
        params_busca.append(f"state={uf.upper()}")
    if query:
        params_busca.append(f"q={query}")
    if setor:
        params_busca.append(f"sector={setor}")
    if params_busca:
        busca_url += "?" + "&".join(params_busca)

    return {
        "disponivel": True,
        "fonte": "StartupBase — ABStartups (Associação Brasileira de Startups)",
        "url_portal": STARTUPBASE_URL,
        "url_busca": busca_url,
        "url_busca_por_estado": f"{STARTUPBASE_URL}/startups?state={uf.upper()}" if uf else f"{STARTUPBASE_URL}/startups",
        "query": query,
        "uf_filtro": uf,
        "dados_uf": uf_data,
        "mapeamento_nacional": MAPEAMENTO_2024,
        "nota_api": (
            "StartupBase não tem API REST aberta para consulta programática. "
            "Dados de contagem e distribuição geográfica curados do Mapeamento 2024. "
            "Para lista detalhada de startups: acessar o portal diretamente. "
            "Para acesso via API: contatar ABStartups (contato@abstartups.com.br)."
        ),
        "links_diretos": [
            {"label": f"Startups em {uf}" if uf else "Buscar startups", "url": busca_url},
            {"label": "Mapeamento do Ecossistema 2024 (PDF)", "url": MAPEAMENTO_2024["url_relatorio"]},
            {"label": "Estatísticas do ecossistema", "url": f"{STARTUPBASE_URL}/statistics"},
            {"label": "Aceleradoras e incubadoras", "url": f"{STARTUPBASE_URL}/accelerators"},
        ],
        "achado": (
            "StartupBase é o banco de dados oficial de startups da ABStartups (12.000+ startups) "
            "mas não expõe API aberta. Para integração completa, seria necessário acordo formal com a ABStartups. "
            "Alternativas com dados mais abertos: Crunchbase (pago), Distrito Insights (pago), "
            "dados.gov.br/Marco Legal das Startups (LC 182/2021 — cadastro no Simples Nacional)."
        ),
    }
