"""
MOTOR 4P UFPR - OpenAlex Connector
Conector para API do OpenAlex (artigos científicos)

OpenAlex é um catálogo aberto de pesquisa científica global com:
- 240M+ artigos científicos
- API REST gratuita (100k req/dia com API key)
- Excelente cobertura do Brasil e Global South
- Licença CC0

Documentação: https://docs.openalex.org/
"""
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from .base import BaseConnector
from ..models.schemas import ScientificPaper
from ..core.config import settings

logger = logging.getLogger(__name__)


class OpenAlexConnector(BaseConnector):
    """
    Conector para API do OpenAlex

    Implementa busca de artigos científicos com:
    - Busca por texto (título, abstract, fulltext)
    - Filtros por país, instituição, ano
    - Agregações estatísticas
    """

    def __init__(self):
        super().__init__()
        self.base_url = "https://api.openalex.org"
        self.headers = {
            "User-Agent": f"Motor4P-UFPR/1.0 (mailto:{settings.OPENALEX_EMAIL or 'research@ufpr.br'})"
        }

    def get_source_name(self) -> str:
        return "OpenAlex"

    async def search(
        self,
        query: str,
        country_code: Optional[str] = "BR",
        from_year: Optional[int] = None,
        to_year: Optional[int] = None,
        limit: int = 50,
        include_international: bool = True
    ) -> List[ScientificPaper]:
        """
        Busca artigos científicos no OpenAlex

        Args:
            query: Termo de busca
            country_code: Código do país (ex: "BR" para Brasil)
            from_year: Ano inicial
            to_year: Ano final
            limit: Número máximo de resultados
            include_international: Se True, inclui artigos de outros países também

        Returns:
            Lista de artigos científicos
        """
        logger.info(f"OpenAlex search: {query} (country={country_code}, limit={limit})")

        # Monta filtros
        filters = []

        if country_code and not include_international:
            filters.append(f"institutions.country_code:{country_code}")

        if from_year:
            filters.append(f"from_publication_date:{from_year}-01-01")

        if to_year:
            filters.append(f"to_publication_date:{to_year}-12-31")

        # Parâmetros da requisição
        params = {
            "search": query,
            "per_page": min(limit, 100),  # OpenAlex limita a 100 por página
            "sort": "cited_by_count:desc",  # Ordena por citações
            "select": "id,title,authorships,publication_year,primary_location,cited_by_count,concepts,open_access,doi"
        }

        if filters:
            params["filter"] = ",".join(filters)

        try:
            data = await self.get(
                f"{self.base_url}/works",
                params=params,
                headers=self.headers
            )

            papers = []
            for work in data.get("results", []):
                paper = self._parse_work(work)
                if paper:
                    papers.append(paper)

            logger.info(f"OpenAlex found {len(papers)} papers")
            return papers

        except Exception as e:
            logger.error(f"OpenAlex search error: {e}")
            # Em caso de erro, retorna lista vazia
            return []

    def _parse_work(self, work: Dict[str, Any]) -> Optional[ScientificPaper]:
        """Converte resposta do OpenAlex para ScientificPaper"""
        try:
            # Extrai autores e instituições
            authors = []
            institutions = set()

            for authorship in work.get("authorships", []):
                author_name = authorship.get("author", {}).get("display_name", "")
                if author_name:
                    authors.append({
                        "name": author_name,
                        "position": authorship.get("author_position", "")
                    })

                for inst in authorship.get("institutions", []):
                    inst_name = inst.get("display_name")
                    if inst_name:
                        institutions.add(inst_name)

            # Extrai journal
            journal = None
            primary_location = work.get("primary_location", {})
            if primary_location:
                source = primary_location.get("source", {})
                if source:
                    journal = source.get("display_name")

            # Extrai conceitos
            concepts = []
            for concept in work.get("concepts", [])[:5]:  # Top 5 conceitos
                concepts.append({
                    "name": concept.get("display_name", ""),
                    "score": concept.get("score", 0)
                })

            # Extrai open access
            oa_info = work.get("open_access", {})
            is_open_access = oa_info.get("is_oa", False)

            return ScientificPaper(
                id=work.get("id", "").replace("https://openalex.org/", ""),
                title=work.get("title", "Título não disponível"),
                authors=authors,
                institutions=list(institutions),
                publication_year=work.get("publication_year", 0),
                journal=journal,
                doi=work.get("doi"),
                citations_count=work.get("cited_by_count", 0),
                concepts=concepts,
                is_open_access=is_open_access,
                url=work.get("id"),
                source="openalex"
            )

        except Exception as e:
            logger.warning(f"Error parsing OpenAlex work: {e}")
            return None

    async def get_work_details(self, work_id: str) -> Optional[ScientificPaper]:
        """Obtém detalhes de um artigo específico"""
        try:
            data = await self.get(
                f"{self.base_url}/works/{work_id}",
                headers=self.headers
            )
            return self._parse_work(data)
        except Exception as e:
            logger.error(f"Error getting work details: {e}")
            return None

    async def get_institution_works(
        self,
        institution_id: str,
        query: Optional[str] = None,
        limit: int = 50
    ) -> List[ScientificPaper]:
        """Busca artigos de uma instituição específica"""
        params = {
            "filter": f"institutions.id:{institution_id}",
            "per_page": min(limit, 100),
            "sort": "publication_year:desc"
        }

        if query:
            params["search"] = query

        try:
            data = await self.get(
                f"{self.base_url}/works",
                params=params,
                headers=self.headers
            )

            return [
                self._parse_work(work)
                for work in data.get("results", [])
                if self._parse_work(work)
            ]

        except Exception as e:
            logger.error(f"Error getting institution works: {e}")
            return []

    async def search_brazilian_institutions(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Busca instituições brasileiras no OpenAlex"""
        params = {
            "search": query,
            "filter": "country_code:BR",
            "per_page": limit
        }

        try:
            data = await self.get(
                f"{self.base_url}/institutions",
                params=params,
                headers=self.headers
            )

            return [
                {
                    "id": inst.get("id", "").replace("https://openalex.org/", ""),
                    "name": inst.get("display_name", ""),
                    "type": inst.get("type", ""),
                    "works_count": inst.get("works_count", 0),
                    "cited_by_count": inst.get("cited_by_count", 0),
                    "country": "BR"
                }
                for inst in data.get("results", [])
            ]

        except Exception as e:
            logger.error(f"Error searching institutions: {e}")
            return []

    async def get_aggregations(
        self,
        query: str,
        country_code: Optional[str] = "BR"
    ) -> Dict[str, Any]:
        """
        Obtém agregações estatísticas para uma query

        Retorna:
        - Total de trabalhos
        - Distribuição por ano
        - Top instituições
        - Top conceitos
        """
        params = {
            "search": query,
            "group_by": "publication_year"
        }

        if country_code:
            params["filter"] = f"institutions.country_code:{country_code}"

        try:
            data = await self.get(
                f"{self.base_url}/works",
                params=params,
                headers=self.headers
            )

            # Processa agregações
            by_year = {}
            for group in data.get("group_by", []):
                year = group.get("key")
                count = group.get("count", 0)
                if year:
                    by_year[str(year)] = count

            return {
                "total": data.get("meta", {}).get("count", 0),
                "by_year": by_year
            }

        except Exception as e:
            logger.error(f"Error getting aggregations: {e}")
            return {"total": 0, "by_year": {}}

    async def get_global_comparison(self, query: str, top_n: int = 10) -> List[Dict[str, Any]]:
        """
        Compara produção científica do Brasil com outros países

        Retorna ranking de países por número de publicações no tema
        """
        params = {
            "search": query,
            "group_by": "institutions.country_code"
        }

        try:
            data = await self.get(
                f"{self.base_url}/works",
                params=params,
                headers=self.headers
            )

            countries = []
            for group in data.get("group_by", [])[:top_n]:
                country_code = group.get("key", "")
                count = group.get("count", 0)

                # Mapeia código para nome e emoji
                country_info = COUNTRY_INFO.get(country_code, {})

                countries.append({
                    "country_code": country_code,
                    "country_name": country_info.get("name", country_code),
                    "flag_emoji": country_info.get("flag", "🏳️"),
                    "papers_count": count
                })

            return countries

        except Exception as e:
            logger.error(f"Error getting global comparison: {e}")
            return []


# Mapeamento de códigos de país para nomes e emojis
COUNTRY_INFO = {
    "BR": {"name": "Brasil", "flag": "🇧🇷"},
    "US": {"name": "Estados Unidos", "flag": "🇺🇸"},
    "CN": {"name": "China", "flag": "🇨🇳"},
    "DE": {"name": "Alemanha", "flag": "🇩🇪"},
    "GB": {"name": "Reino Unido", "flag": "🇬🇧"},
    "JP": {"name": "Japão", "flag": "🇯🇵"},
    "FR": {"name": "França", "flag": "🇫🇷"},
    "KR": {"name": "Coreia do Sul", "flag": "🇰🇷"},
    "IT": {"name": "Itália", "flag": "🇮🇹"},
    "CA": {"name": "Canadá", "flag": "🇨🇦"},
    "AU": {"name": "Austrália", "flag": "🇦🇺"},
    "ES": {"name": "Espanha", "flag": "🇪🇸"},
    "IN": {"name": "Índia", "flag": "🇮🇳"},
    "NL": {"name": "Holanda", "flag": "🇳🇱"},
    "CH": {"name": "Suíça", "flag": "🇨🇭"},
    "SE": {"name": "Suécia", "flag": "🇸🇪"},
    "PL": {"name": "Polônia", "flag": "🇵🇱"},
    "BE": {"name": "Bélgica", "flag": "🇧🇪"},
    "AT": {"name": "Áustria", "flag": "🇦🇹"},
    "DK": {"name": "Dinamarca", "flag": "🇩🇰"},
    "PT": {"name": "Portugal", "flag": "🇵🇹"},
    "MX": {"name": "México", "flag": "🇲🇽"},
    "AR": {"name": "Argentina", "flag": "🇦🇷"},
    "CL": {"name": "Chile", "flag": "🇨🇱"},
    "CO": {"name": "Colômbia", "flag": "🇨🇴"},
    "RU": {"name": "Rússia", "flag": "🇷🇺"},
    "TW": {"name": "Taiwan", "flag": "🇹🇼"},
    "SG": {"name": "Singapura", "flag": "🇸🇬"},
    "IL": {"name": "Israel", "flag": "🇮🇱"},
    "NO": {"name": "Noruega", "flag": "🇳🇴"},
    "FI": {"name": "Finlândia", "flag": "🇫🇮"},
    "IE": {"name": "Irlanda", "flag": "🇮🇪"},
    "NZ": {"name": "Nova Zelândia", "flag": "🇳🇿"},
    "ZA": {"name": "África do Sul", "flag": "🇿🇦"},
}
