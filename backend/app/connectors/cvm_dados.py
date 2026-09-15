"""
Conector CVM — Dados Abertos (companhias abertas, fundos, ofertas)
Fonte: dados.cvm.gov.br (CKAN) + repositório /dados/CIA_ABERTA/
Confirmado: portal CKAN com Action API de metadados + arquivos CSV/ZIP em lote
Documentado em: dados.cvm.gov.br
"""
import logging
import httpx
from typing import Any

logger = logging.getLogger(__name__)

CVM_CKAN_BASE = "https://dados.cvm.gov.br"

# Datasets principais confirmados (14/09/2026)
DATASETS_CURADOS = [
    {
        "categoria": "Companhias Abertas",
        "descricao": "Cadastro, DFP (Demonstrações Financeiras Padronizadas), FCA (Formulário Cadastral), FRE (Formulário de Referência)",
        "url_base": f"{CVM_CKAN_BASE}/dados/CIA_ABERTA/",
        "tipos": ["CAD", "DFP", "FCA", "FRE", "ITR", "IPE"],
        "nota": "Arquivos CSV/ZIP organizados por tipo e ano. Contém CNPJ, razão social, setor CNAE, sede.",
    },
    {
        "categoria": "Fundos de Investimento",
        "descricao": "Cadastro de fundos, composição de carteira, informes mensais",
        "url_base": f"{CVM_CKAN_BASE}/dados/FI/",
        "tipos": ["CAD", "INF_DIARIO", "EXTRATO_FI"],
        "nota": "Fundos de Venture Capital (FIP/FIEE) relevantes para ecossistema de inovação.",
    },
    {
        "categoria": "Ofertas Públicas",
        "descricao": "Prospectos de IPO, debêntures, CRI, CRA — volume de captação no mercado",
        "url_base": f"{CVM_CKAN_BASE}/dados/OFERTA/",
        "tipos": ["OFR_DIST"],
        "nota": "Sinal de mercado de capitais para empresas de inovação.",
    },
]


async def buscar_empresas_cvm(
    query: str | None = None,
    uf: str | None = None,
    cnae: str | None = None,
) -> dict[str, Any]:
    """
    Retorna metadados dos dados CVM e datasets disponíveis.
    Para lista de companhias abertas por CNAE/UF: download do CAD_CIA_ABERTA.csv
    """
    async with httpx.AsyncClient(headers={"User-Agent": "Motor4P-UFPR/1.0 (motor4p@ufpr.br)"}) as client:
        # Tenta Action API do CKAN CVM
        datasets_ckan: list[dict] = []
        try:
            r = await client.get(
                f"{CVM_CKAN_BASE}/api/3/action/package_search",
                params={"q": query or "companhia aberta", "rows": 5},
                timeout=12,
            )
            if r.status_code == 200:
                data = r.json()
                if data.get("success"):
                    datasets_ckan = [
                        {
                            "titulo": p.get("title", ""),
                            "descricao": (p.get("notes", "") or "")[:200],
                            "url": f"{CVM_CKAN_BASE}/dataset/{p.get('name', '')}",
                            "recursos": len(p.get("resources", [])),
                        }
                        for p in data["result"].get("results", [])[:5]
                    ]
        except Exception as e:
            logger.warning(f"CVM CKAN search: {e}")

        # URL direta do CSV de companhias abertas (arquivo principal)
        cad_url = f"{CVM_CKAN_BASE}/dados/CIA_ABERTA/CAD/DADOS/cad_cia_aberta.csv"

        return {
            "disponivel": True,
            "fonte": "CVM — Comissão de Valores Mobiliários (dados abertos)",
            "url_portal": CVM_CKAN_BASE,
            "url_cad_companhias": cad_url,
            "datasets_curados": DATASETS_CURADOS,
            "datasets_ckan": datasets_ckan,
            "uf_filtro": uf,
            "cnae_filtro": cnae,
            "query": query,
            "colunas_filtro": {
                "uf": "SG_UF_CONST (sigla do estado sede)",
                "cnae": "CD_ATIV_ECON_PRINC (CNAE da atividade principal)",
                "nome": "DENOM_SOCIAL ou DENOM_COMERC",
                "situacao": "SIT_REG (Ativo/Cancelado/etc)",
            },
            "nota_tecnica": (
                "CVM expõe API CKAN de metadados e arquivos CSV diretos. "
                "O arquivo CAD_CIA_ABERTA.csv tem ~1.200 companhias abertas ativas. "
                "Para cruzar com inovação: filtrar por CNAE das divisões 26, 27, 28, 62, 63, 72. "
                "AVISO: apenas empresas de capital aberto — representa ~0,01% das empresas brasileiras."
            ),
            "links_diretos": [
                {"label": "Cadastro de Companhias Abertas (CSV)", "url": cad_url},
                {"label": "Portal CVM Dados Abertos", "url": CVM_CKAN_BASE},
                {"label": "Fundos de Investimento em Participações (FIP)", "url": f"{CVM_CKAN_BASE}/dados/FI/CAD/DADOS/"},
                {"label": "Prospectos de Ofertas Públicas", "url": f"{CVM_CKAN_BASE}/dados/OFERTA/"},
            ],
        }
