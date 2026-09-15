"""
Conector FAPESP BV (Biblioteca Virtual da FAPESP)
Fonte: bv.fapesp.br — maior FAP do Brasil, projetos de 1992 até o presente
Sem API REST documentada — busca via URL pública da interface web (parâmetros observados)
Dados disponíveis: auxílios e bolsas por área do conhecimento, instituição, pesquisador, município
Documentado em: https://bv.fapesp.br/pt/76/a-biblioteca-virtual/
"""
import logging
import httpx
import os
import re
from typing import Any

logger = logging.getLogger(__name__)

BV_BASE = "https://bv.fapesp.br"

# URLs de busca observadas na interface (sem API oficial documentada)
BV_SEARCH_URL = f"{BV_BASE}/pt/pesquisa-bolsas-e-auxilios/"

async def buscar_projetos_fapesp(
    query: str,
    uf: str | None = None,
    area: str | None = None,
) -> dict[str, Any]:
    """
    Busca projetos FAPESP por palavra-chave.
    Sem API oficial — usa endpoint de busca da interface web.
    Retorna metadados e links quando parsing HTML não está disponível.
    """
    async with httpx.AsyncClient(
        headers={
            "User-Agent": "Motor4P-UFPR/1.0 (pesquisa academica PPGPP/UFPR motor4p@ufpr.br)",
            "Accept": "text/html,application/xhtml+xml",
        },
        follow_redirects=True,
    ) as client:
        projetos: list[dict] = []
        total_estimado: int | None = None
        erro: str | None = None

        try:
            # Endpoint de busca observado na interface BV-FAPESP
            r = await client.get(
                BV_SEARCH_URL,
                params={"q": query, "filtro": area or "", "page": 1},
                timeout=15,
            )
            if r.status_code == 200:
                html = r.text
                # Extrai total de resultados (padrão observado: "X auxílios e bolsas")
                total_match = re.search(r"(\d[\d.]*)\s+(aux[íi]lios|bolsas|projetos|resultados)", html, re.IGNORECASE)
                if total_match:
                    total_estimado = int(total_match.group(1).replace(".", ""))

                # Extrai títulos e links de projetos (estrutura HTML da BV)
                # Padrão: <a href="/pt/bolsas/NNN/titulo-do-projeto/">Título</a>
                links = re.findall(r'href="(/pt/(?:bolsas|auxilios)/\d+/[^"]+)"[^>]*>([^<]{10,200})<', html)
                for href, titulo in links[:10]:
                    projetos.append({
                        "titulo": titulo.strip(),
                        "url": f"{BV_BASE}{href}",
                        "fonte": "BV-FAPESP",
                    })
        except httpx.TimeoutException:
            erro = "Timeout na busca à BV-FAPESP (>15s)"
        except Exception as e:
            erro = f"Erro na busca BV-FAPESP: {str(e)[:100]}"
            logger.warning(f"BV-FAPESP: {e}")

        # Sempre retorna links diretos curados mesmo sem resultado de busca
        return {
            "disponivel": True,
            "fonte": "FAPESP — Biblioteca Virtual (BV-FAPESP)",
            "url_busca": f"{BV_SEARCH_URL}?q={query}",
            "url_portal": BV_BASE,
            "query": query,
            "uf_filtro": uf,
            "nota_api": (
                "BV-FAPESP não tem API REST documentada. "
                "Dados acessados via interface web — parsing pode falhar em atualizações do site. "
                "Para integração formal, contatar: bv@fapesp.br"
            ),
            "projetos_encontrados": projetos,
            "total_estimado": total_estimado,
            "erro_busca": erro,
            "links_diretos": [
                {
                    "label": f"Buscar '{query}' na BV-FAPESP",
                    "url": f"{BV_SEARCH_URL}?q={query}",
                },
                {
                    "label": "Projetos recentes FAPESP",
                    "url": f"{BV_BASE}/pt/559/",
                },
                {
                    "label": "Chamada PIPE — até R$ 2M para startups (SP)",
                    "url": "https://fapesp.br/pipe",
                },
                {
                    "label": "Chamada PITE — parceria empresa-universidade",
                    "url": "https://fapesp.br/pite",
                },
            ],
            "modalidades_principais": [
                {"sigla": "PIPE", "nome": "Pesquisa Inovativa em Pequenas Empresas", "valor": "até R$ 2M", "url": "https://fapesp.br/pipe"},
                {"sigla": "PITE", "nome": "Parceria para Inovação Tecnológica (empresa + universidade)", "valor": "variável", "url": "https://fapesp.br/pite"},
                {"sigla": "Temático", "nome": "Projeto Temático — grandes projetos colaborativos", "valor": "variável", "url": "https://fapesp.br/tematico"},
                {"sigla": "Regular", "nome": "Auxílio à Pesquisa Regular", "valor": "até R$ 300k", "url": "https://fapesp.br/regular"},
            ],
            "periodo_cobertura": "1992 até o presente",
            "total_projetos_base": "200.000+ projetos financiados",
        }
