"""
Conector Lattes/CNPq — Plataforma Lattes e LattesData
Duas fontes distintas:

1. LattesData (lattesdata.cnpq.br) — repositório de datasets de pesquisa
   Público, sem autenticação, metadados acessíveis via interface web
   Criado pelo CNPq + Ibict, parceria com DataCite (DOIs para datasets)

2. Extrator Lattes — acesso institucional via VPN CNPq
   Regulamentado pela Resolução Normativa CNPq nº 01/2023
   Requer: ser ICT, IP fixo, formulário + Termo de Responsabilidade assinado
   Enviar habilitação para: atendimento@cnpq.br
   A UFPR é elegível como ICT — caminho para acesso formal

3. IDs públicos dos Currículos Lattes (2026)
   CNPq disponibiliza arquivo com todos os IDs de currículos
   Permite extração via ferramenta própria sem acesso ao Extrator
   URL: memoria.cnpq.br/web/portal-lattes/extracoes-de-dados
"""
import logging
import httpx
import re
from typing import Any

logger = logging.getLogger(__name__)

LATTESDATA_BASE = "https://lattesdata.cnpq.br"
LATTES_PORTAL = "https://lattes.cnpq.br"


async def buscar_lattesdata(query: str | None = None) -> dict[str, Any]:
    """
    Busca datasets no LattesData (repositório público de dados de pesquisa do CNPq).
    Sem API REST documentada — acesso via interface web.
    """
    async with httpx.AsyncClient(
        headers={"User-Agent": "Motor4P-UFPR/1.0 (pesquisa PPGPP/UFPR motor4p@ufpr.br)"},
        follow_redirects=True,
    ) as client:
        datasets: list[dict] = []
        total_estimado: int | None = None
        erro: str | None = None

        # Tenta buscar metadados no LattesData
        try:
            params: dict[str, str] = {}
            if query:
                params["q"] = query
            r = await client.get(
                f"{LATTESDATA_BASE}/consulta",
                params=params if params else {"q": "inovação"},
                timeout=15,
            )
            if r.status_code == 200:
                html = r.text
                # Extrai total de datasets
                total_match = re.search(r"(\d[\d.]*)\s*(dataset|resultado|conjunto)", html, re.IGNORECASE)
                if total_match:
                    total_estimado = int(total_match.group(1).replace(".", ""))
                # Extrai links de datasets
                links = re.findall(r'href="(/dataset/[^"]+)"[^>]*>([^<]{10,200})<', html)
                for href, titulo in links[:8]:
                    datasets.append({
                        "titulo": titulo.strip(),
                        "url": f"{LATTESDATA_BASE}{href}",
                        "fonte": "LattesData/CNPq",
                    })
        except httpx.TimeoutException:
            erro = "Timeout na consulta ao LattesData (>15s)"
        except Exception as e:
            erro = f"Erro ao acessar LattesData: {str(e)[:100]}"
            logger.warning(f"LattesData: {e}")

    return {
        "disponivel": True,
        "fonte": "CNPq — Plataforma Lattes e LattesData",

        # LattesData — repositório público
        "lattesdata": {
            "descricao": "Repositório de datasets de pesquisa do CNPq+Ibict. Acesso público, conteúdo em acesso aberto com DOIs DataCite.",
            "url": LATTESDATA_BASE,
            "url_consulta": f"{LATTESDATA_BASE}/consulta{'?q=' + query if query else ''}",
            "datasets_encontrados": datasets,
            "total_estimado": total_estimado,
            "erro_busca": erro,
        },

        # Extrator Lattes — acesso institucional
        "extrator_lattes": {
            "descricao": "Ferramenta oficial CNPq para extração em lote de currículos e grupos de pesquisa. Requer habilitação institucional.",
            "regulamentacao": "Resolução Normativa CNPq nº 01/2023 (04/10/2023)",
            "elegivel": "ICTs, universidades, institutos de pesquisa, órgãos de governo",
            "requisitos": [
                "Ser Instituição Científica, Tecnológica e de Inovação (ICT)",
                "Possuir endereço IP fixo",
                "Preencher Formulário de Habilitação + Termo de Responsabilidade",
                "Enviar documentos para atendimento@cnpq.br",
                "Acesso via VPN CNPq após habilitação",
            ],
            "dados_disponiveis": [
                "Currículos Lattes (dados ostensivos/públicos)",
                "Diretório dos Grupos de Pesquisa",
                "IDs de currículos (arquivo público — atualizado em 2026)",
            ],
            "url_habilitacao": "https://www.gov.br/pt-br/servicos/obter-acesso-ao-extrator-da-plataforma-lattes",
            "url_procedimentos": "https://memoria.cnpq.br/web/portal-lattes/extracoes-de-dados",
            "contato": "atendimento@cnpq.br",
            "nota_ufpr": (
                "A UFPR é elegível como ICT para solicitar acesso ao Extrator Lattes. "
                "Processo: preencher formulário + Termo de Responsabilidade assinado pelo representante legal da UFPR, "
                "enviar para atendimento@cnpq.br. Após habilitação: acesso via VPN CNPq com IP fixo. "
                "Esta seria a rota para integrar dados de pesquisadores UFPR ao Motor da Inovação."
            ),
        },

        # IDs públicos dos currículos (sem necessidade do Extrator)
        "ids_publicos_2026": {
            "descricao": "CNPq disponibiliza arquivo com todos os IDs de Currículos Lattes — permite extração via ferramenta própria sem VPN.",
            "url": "https://memoria.cnpq.br/web/portal-lattes/extracoes-de-dados",
            "arquivos_2026": [
                "https://dadosabertos.cnpq.br/dataset/lattes_ids_2026_1.zip",
                "https://dadosabertos.cnpq.br/dataset/lattes_ids_2026_2.zip",
                "https://dadosabertos.cnpq.br/dataset/lattes_ids_2026_3.zip",
                "https://dadosabertos.cnpq.br/dataset/lattes_ids_2026_4.zip",
            ],
            "formato": "XML (XSD disponível — atualizado 12/09/2022)",
            "nota": "Com os IDs públicos é possível construir scraper respeitoso (rate limit) para currículos individuais via busca pública do Lattes, sem precisar do Extrator.",
        },

        "links_diretos": [
            {"label": "LattesData — buscar datasets", "url": f"{LATTESDATA_BASE}/consulta"},
            {"label": "Extrator Lattes — habilitação institucional", "url": "https://www.gov.br/pt-br/servicos/obter-acesso-ao-extrator-da-plataforma-lattes"},
            {"label": "IDs públicos dos Currículos 2026", "url": "https://memoria.cnpq.br/web/portal-lattes/extracoes-de-dados"},
            {"label": "Busca pública do Lattes", "url": "https://lattes.cnpq.br/"},
            {"label": "Diretório dos Grupos de Pesquisa", "url": "http://dgp.cnpq.br/dgp/faces/consulta/consulta_parametrizada.jsf"},
        ],

        "achado": (
            "O Lattes não tem API pública aberta, mas há três rotas de acesso: "
            "(1) LattesData — repositório público de datasets com DOI, sem autenticação; "
            "(2) Extrator Lattes — acesso institucional via VPN, a UFPR pode solicitar como ICT; "
            "(3) IDs públicos 2026 — arquivo com todos os IDs de currículo para extração própria. "
            "A rota mais estratégica para o Motor: solicitar acesso ao Extrator via PPGPP/UFPR."
        ),
    }


async def buscar_grupos_pesquisa(
    query: str | None = None,
    uf: str | None = None,
    area: str | None = None,
) -> dict[str, Any]:
    """
    Acessa o Diretório dos Grupos de Pesquisa do CNPq via busca pública.
    Sem API REST — interface web com parâmetros de URL conhecidos.
    """
    dgp_url = "http://dgp.cnpq.br/dgp/faces/consulta/consulta_parametrizada.jsf"

    # DGP não tem API REST — retorna link de busca parametrizado
    params: list[str] = []
    if query:
        params.append(f"tituloDoProjeto={query}")
    if uf:
        params.append(f"uf={uf}")
    if area:
        params.append(f"areaTematica={area}")

    return {
        "disponivel": True,
        "fonte": "CNPq — Diretório dos Grupos de Pesquisa (DGP)",
        "url_busca": dgp_url,
        "url_busca_parametrizada": dgp_url + ("?" + "&".join(params) if params else ""),
        "query": query,
        "uf": uf,
        "area": area,
        "grupos_encontrados": [],
        "erro": None,
        "nota": (
            "O DGP não expõe API REST. Dados de grupos de pesquisa por tema e UF "
            "estão disponíveis via interface web. "
            "Para extração em lote: Extrator Lattes (requer habilitação institucional). "
            "Complemento: OpenAlex já retorna grupos de pesquisa por instituição via coautorias."
        ),
        "links_diretos": [
            {"label": "Diretório dos Grupos de Pesquisa — Busca", "url": dgp_url},
            {"label": f"Grupos em {uf}" if uf else "Grupos por UF", "url": f"http://dgp.cnpq.br/dgp/faces/consulta/consulta_parametrizada.jsf{'?uf=' + uf if uf else ''}"},
        ],
    }
