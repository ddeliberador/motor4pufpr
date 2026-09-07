"""
MOTOR 4P UFPR - IBGE Connector
Conector para API do IBGE (CNAE e classificações)

APIs do IBGE para classificações:
- CNAE 2.0: Classificação Nacional de Atividades Econômicas
- Localidades: Estados, municípios, regiões

Documentação: https://servicodados.ibge.gov.br/api/docs
"""
import logging
from typing import List, Dict, Any, Optional

from .base import BaseConnector
from ..core.config import settings

logger = logging.getLogger(__name__)


class IBGEConnector(BaseConnector):
    """
    Conector para APIs do IBGE

    Implementa consulta de classificações econômicas e localidades
    """

    async def get_sidra_table(self, table_id: str, params: Optional[dict] = None) -> Any:
        """
        Busca dados de uma tabela do SIDRA (IBGE)
        Args:
            table_id: ID da tabela SIDRA (ex: '3653' para produção industrial)
            params: Parâmetros opcionais (ex: { 'periodo': '202401', 'localidades': 'PR' })
        Returns:
            Dados da tabela SIDRA em formato JSON
        """
        try:
            url = "https://sidra.ibge.gov.br/geratabela"
            sidra_params = {"format": "json", "name": f"t{table_id}"}
            if params:
                sidra_params.update(params)
            data = await self.get(url, params=sidra_params, use_cache=True)
            return data
        except Exception as e:
            logger.warning(f"Erro ao buscar tabela SIDRA {table_id}: {e}")
            return None


    def __init__(self):
        super().__init__()
        self.base_url = settings.IBGE_API_BASE

    def get_source_name(self) -> str:
        return "IBGE"

    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """Busca CNAE por termo"""
        return await self.search_cnae(query)

    async def search_cnae(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Busca CNAEs por descrição

        Args:
            query: Termo de busca
            limit: Número máximo de resultados

        Returns:
            Lista de CNAEs correspondentes
        """
        logger.info(f"IBGE CNAE search: {query}")

        try:
            # API do IBGE para CNAE
            data = await self.get(
                f"{self.base_url}/cnae/subclasses",
                params={"view": "nivelado"}
            )

            # Filtra por termo de busca
            query_lower = query.lower()
            results = []

            for item in data:
                description = item.get("descricao", "").lower()
                if query_lower in description or any(
                    word in description
                    for word in query_lower.split()
                ):
                    results.append({
                        "code": item.get("id", ""),
                        "description": item.get("descricao", ""),
                        "section": item.get("secao", {}).get("descricao", ""),
                        "division": item.get("divisao", {}).get("descricao", ""),
                        "group": item.get("grupo", {}).get("descricao", ""),
                        "class": item.get("classe", {}).get("descricao", ""),
                    })

                    if len(results) >= limit:
                        break

            return results

        except Exception as e:
            logger.warning(f"IBGE API error, using fallback: {e}")
            return self._search_cnae_fallback(query, limit)

    def _search_cnae_fallback(self, query: str, limit: int) -> List[Dict[str, Any]]:
        """Busca em dados de fallback"""
        query_lower = query.lower()
        results = []

        for code, data in CNAE_DATA.items():
            if query_lower in data["description"].lower() or any(
                kw in query_lower for kw in data.get("keywords", [])
            ):
                results.append({
                    "code": code,
                    "description": data["description"],
                    "section": data.get("section", ""),
                    "division": data.get("division", ""),
                })

                if len(results) >= limit:
                    break

        return results

    async def get_cnae_details(self, code: str) -> Optional[Dict[str, Any]]:
        """Obtém detalhes de um CNAE específico"""
        try:
            data = await self.get(f"{self.base_url}/cnae/subclasses/{code}")
            return {
                "code": data.get("id", ""),
                "description": data.get("descricao", ""),
                "section": data.get("secao", {}).get("descricao", ""),
                "includes": data.get("observacoes", ""),
            }
        except Exception as e:
            logger.warning(f"Error getting CNAE details: {e}")
            if code in CNAE_DATA:
                return CNAE_DATA[code]
            return None

    async def get_states(self) -> List[Dict[str, Any]]:
        """Retorna lista de estados brasileiros"""
        try:
            data = await self.get(f"{self.base_url}/localidades/estados")
            return [
                {
                    "code": state.get("id"),
                    "acronym": state.get("sigla"),
                    "name": state.get("nome"),
                    "region": state.get("regiao", {}).get("nome", "")
                }
                for state in data
            ]
        except Exception as e:
            logger.warning(f"Error getting states: {e}")
            return BRAZILIAN_STATES

    async def get_municipalities_by_state(self, state_code: str) -> List[Dict[str, Any]]:
        """Retorna municípios de um estado"""
        try:
            data = await self.get(
                f"{self.base_url}/localidades/estados/{state_code}/municipios"
            )
            return [
                {
                    "code": mun.get("id"),
                    "name": mun.get("nome")
                }
                for mun in data
            ]
        except Exception as e:
            logger.warning(f"Error getting municipalities: {e}")
            return []


# Dados de CNAE para fallback e mapeamento
CNAE_DATA = {
    # Fabricação de baterias e acumuladores
    "27.22-8-01": {
        "description": "Fabricação de baterias e acumuladores para veículos automotores",
        "section": "C - Indústrias de transformação",
        "division": "27 - Fabricação de máquinas, aparelhos e materiais elétricos",
        "keywords": ["bateria", "acumulador", "energia", "elétrico", "veículo"],
    },
    "27.22-8-02": {
        "description": "Fabricação de pilhas, baterias e acumuladores elétricos, exceto para veículos",
        "section": "C - Indústrias de transformação",
        "division": "27 - Fabricação de máquinas, aparelhos e materiais elétricos",
        "keywords": ["pilha", "bateria", "acumulador", "eletrônico"],
    },

    # Fabricação de computadores
    "26.21-3-00": {
        "description": "Fabricação de equipamentos de informática",
        "section": "C - Indústrias de transformação",
        "division": "26 - Fabricação de equipamentos de informática, produtos eletrônicos e ópticos",
        "keywords": ["computador", "informática", "processamento", "dados"],
    },

    # Fabricação de semicondutores
    "26.10-8-00": {
        "description": "Fabricação de componentes eletrônicos",
        "section": "C - Indústrias de transformação",
        "division": "26 - Fabricação de equipamentos de informática, produtos eletrônicos e ópticos",
        "keywords": ["semicondutor", "chip", "circuito", "integrado", "eletrônico"],
    },

    # Fabricação de instrumentos médicos
    "32.50-7-01": {
        "description": "Fabricação de instrumentos não eletrônicos para uso médico, cirúrgico e odontológico",
        "section": "C - Indústrias de transformação",
        "division": "32 - Fabricação de produtos diversos",
        "keywords": ["médico", "cirúrgico", "instrumento", "saúde", "implante"],
    },
    "32.50-7-02": {
        "description": "Fabricação de mobiliário para uso médico, cirúrgico, odontológico e de laboratório",
        "section": "C - Indústrias de transformação",
        "division": "32 - Fabricação de produtos diversos",
        "keywords": ["médico", "laboratório", "hospitalar"],
    },
    "32.50-7-04": {
        "description": "Fabricação de aparelhos e utensílios para correção de defeitos físicos e aparelhos ortopédicos em geral",
        "section": "C - Indústrias de transformação",
        "division": "32 - Fabricação de produtos diversos",
        "keywords": ["prótese", "ortopédico", "correção", "implante", "biomaterial"],
    },

    # Fabricação de produtos químicos
    "20.19-3-01": {
        "description": "Elaboração de outros produtos químicos inorgânicos não especificados anteriormente",
        "section": "C - Indústrias de transformação",
        "division": "20 - Fabricação de produtos químicos",
        "keywords": ["químico", "inorgânico", "elemento", "composto"],
    },
    "20.99-1-99": {
        "description": "Fabricação de outros produtos químicos não especificados anteriormente",
        "section": "C - Indústrias de transformação",
        "division": "20 - Fabricação de produtos químicos",
        "keywords": ["químico", "material", "substância"],
    },

    # Pesquisa e desenvolvimento
    "72.10-0-00": {
        "description": "Pesquisa e desenvolvimento experimental em ciências físicas e naturais",
        "section": "M - Atividades profissionais, científicas e técnicas",
        "division": "72 - Pesquisa e desenvolvimento científico",
        "keywords": ["pesquisa", "desenvolvimento", "ciência", "inovação", "p&d"],
    },
    "72.20-7-00": {
        "description": "Pesquisa e desenvolvimento experimental em ciências sociais e humanas",
        "section": "M - Atividades profissionais, científicas e técnicas",
        "division": "72 - Pesquisa e desenvolvimento científico",
        "keywords": ["pesquisa", "social", "humanas", "economia"],
    },

    # Energia
    "35.11-5-00": {
        "description": "Geração de energia elétrica",
        "section": "D - Eletricidade e gás",
        "division": "35 - Eletricidade, gás e outras utilidades",
        "keywords": ["energia", "elétrica", "geração", "renovável", "solar", "eólica"],
    },

    # Software e TI
    "62.01-5-00": {
        "description": "Desenvolvimento de programas de computador sob encomenda",
        "section": "J - Informação e comunicação",
        "division": "62 - Atividades dos serviços de tecnologia da informação",
        "keywords": ["software", "programa", "desenvolvimento", "sistema", "aplicativo"],
    },
    "62.02-3-00": {
        "description": "Desenvolvimento e licenciamento de programas de computador customizáveis",
        "section": "J - Informação e comunicação",
        "division": "62 - Atividades dos serviços de tecnologia da informação",
        "keywords": ["software", "licença", "produto", "plataforma"],
    },
    "62.04-0-00": {
        "description": "Consultoria em tecnologia da informação",
        "section": "J - Informação e comunicação",
        "division": "62 - Atividades dos serviços de tecnologia da informação",
        "keywords": ["consultoria", "ti", "tecnologia", "informática", "ia", "inteligência artificial"],
    },

    # Farmacêutico
    "21.21-1-01": {
        "description": "Fabricação de medicamentos alopáticos para uso humano",
        "section": "C - Indústrias de transformação",
        "division": "21 - Fabricação de produtos farmoquímicos e farmacêuticos",
        "keywords": ["medicamento", "fármaco", "remédio", "farmacêutico"],
    },
    "21.10-6-00": {
        "description": "Fabricação de produtos farmoquímicos",
        "section": "C - Indústrias de transformação",
        "division": "21 - Fabricação de produtos farmoquímicos e farmacêuticos",
        "keywords": ["farmoquímico", "princípio ativo", "insumo farmacêutico"],
    },

    # Automação e robótica
    "28.69-1-00": {
        "description": "Fabricação de máquinas e equipamentos para uso industrial específico não especificados anteriormente",
        "section": "C - Indústrias de transformação",
        "division": "28 - Fabricação de máquinas e equipamentos",
        "keywords": ["máquina", "automação", "industrial", "robótica", "manufatura"],
    },
}

# Estados brasileiros
BRAZILIAN_STATES = [
    {"code": 12, "acronym": "AC", "name": "Acre", "region": "Norte"},
    {"code": 27, "acronym": "AL", "name": "Alagoas", "region": "Nordeste"},
    {"code": 16, "acronym": "AP", "name": "Amapá", "region": "Norte"},
    {"code": 13, "acronym": "AM", "name": "Amazonas", "region": "Norte"},
    {"code": 29, "acronym": "BA", "name": "Bahia", "region": "Nordeste"},
    {"code": 23, "acronym": "CE", "name": "Ceará", "region": "Nordeste"},
    {"code": 53, "acronym": "DF", "name": "Distrito Federal", "region": "Centro-Oeste"},
    {"code": 32, "acronym": "ES", "name": "Espírito Santo", "region": "Sudeste"},
    {"code": 52, "acronym": "GO", "name": "Goiás", "region": "Centro-Oeste"},
    {"code": 21, "acronym": "MA", "name": "Maranhão", "region": "Nordeste"},
    {"code": 51, "acronym": "MT", "name": "Mato Grosso", "region": "Centro-Oeste"},
    {"code": 50, "acronym": "MS", "name": "Mato Grosso do Sul", "region": "Centro-Oeste"},
    {"code": 31, "acronym": "MG", "name": "Minas Gerais", "region": "Sudeste"},
    {"code": 15, "acronym": "PA", "name": "Pará", "region": "Norte"},
    {"code": 25, "acronym": "PB", "name": "Paraíba", "region": "Nordeste"},
    {"code": 41, "acronym": "PR", "name": "Paraná", "region": "Sul"},
    {"code": 26, "acronym": "PE", "name": "Pernambuco", "region": "Nordeste"},
    {"code": 22, "acronym": "PI", "name": "Piauí", "region": "Nordeste"},
    {"code": 33, "acronym": "RJ", "name": "Rio de Janeiro", "region": "Sudeste"},
    {"code": 24, "acronym": "RN", "name": "Rio Grande do Norte", "region": "Nordeste"},
    {"code": 43, "acronym": "RS", "name": "Rio Grande do Sul", "region": "Sul"},
    {"code": 11, "acronym": "RO", "name": "Rondônia", "region": "Norte"},
    {"code": 14, "acronym": "RR", "name": "Roraima", "region": "Norte"},
    {"code": 42, "acronym": "SC", "name": "Santa Catarina", "region": "Sul"},
    {"code": 35, "acronym": "SP", "name": "São Paulo", "region": "Sudeste"},
    {"code": 28, "acronym": "SE", "name": "Sergipe", "region": "Nordeste"},
    {"code": 17, "acronym": "TO", "name": "Tocantins", "region": "Norte"},
]
