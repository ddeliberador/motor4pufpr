"""
MOTOR 4P UFPR - CNPq Connector
Conector para dados do CNPq (Grupos de Pesquisa)

O CNPq não possui API REST pública oficial. Os dados são acessados via:
1. Portal de dados abertos (CSV): http://memoria2.cnpq.br/web/guest/dados_abertos
2. Extrator Lattes (acesso institucional)
3. Web scraping do Diretório de Grupos

Este conector implementa:
- Busca simulada com dados estruturados para MVP
- Preparação para integração futura com dados reais
"""
import logging
from typing import List, Dict, Any, Optional
from unidecode import unidecode
from rapidfuzz import fuzz

from .base import BaseConnector
from ..models.schemas import ResearchGroup

logger = logging.getLogger(__name__)


# =============================================================================
# Dados de referência para mapeamento de áreas CNPq
# =============================================================================

CNPQ_AREAS = {
    # Engenharias
    "30000009": {"name": "Engenharias", "level": 1},
    "30100003": {"name": "Engenharia Civil", "level": 2},
    "30200008": {"name": "Engenharia de Minas", "level": 2},
    "30300002": {"name": "Engenharia de Materiais e Metalúrgica", "level": 2},
    "30400007": {"name": "Engenharia Elétrica", "level": 2},
    "30500001": {"name": "Engenharia Mecânica", "level": 2},
    "30600006": {"name": "Engenharia Química", "level": 2},
    "30700000": {"name": "Engenharia Sanitária", "level": 2},
    "30800005": {"name": "Engenharia de Produção", "level": 2},

    # Ciências Exatas e da Terra
    "10000003": {"name": "Ciências Exatas e da Terra", "level": 1},
    "10100008": {"name": "Matemática", "level": 2},
    "10200002": {"name": "Probabilidade e Estatística", "level": 2},
    "10300007": {"name": "Ciência da Computação", "level": 2},
    "10400001": {"name": "Astronomia", "level": 2},
    "10500006": {"name": "Física", "level": 2},
    "10600000": {"name": "Química", "level": 2},
    "10700005": {"name": "Geociências", "level": 2},
    "10800000": {"name": "Oceanografia", "level": 2},

    # Ciências Biológicas
    "20000006": {"name": "Ciências Biológicas", "level": 1},
    "20100000": {"name": "Biologia Geral", "level": 2},
    "20200005": {"name": "Genética", "level": 2},
    "20300000": {"name": "Botânica", "level": 2},
    "20400004": {"name": "Zoologia", "level": 2},
    "20500009": {"name": "Ecologia", "level": 2},
    "20600003": {"name": "Morfologia", "level": 2},
    "20700008": {"name": "Fisiologia", "level": 2},
    "20800002": {"name": "Bioquímica", "level": 2},
    "20900007": {"name": "Biofísica", "level": 2},
    "21000005": {"name": "Farmacologia", "level": 2},
    "21100000": {"name": "Imunologia", "level": 2},
    "21200004": {"name": "Microbiologia", "level": 2},
    "21300009": {"name": "Parasitologia", "level": 2},

    # Ciências da Saúde
    "40000001": {"name": "Ciências da Saúde", "level": 1},
    "40100006": {"name": "Medicina", "level": 2},
    "40200000": {"name": "Odontologia", "level": 2},
    "40300005": {"name": "Farmácia", "level": 2},
    "40400000": {"name": "Enfermagem", "level": 2},
    "40500004": {"name": "Nutrição", "level": 2},
    "40600009": {"name": "Saúde Coletiva", "level": 2},
    "40700003": {"name": "Fonoaudiologia", "level": 2},
    "40800008": {"name": "Fisioterapia e Terapia Ocupacional", "level": 2},
    "40900002": {"name": "Educação Física", "level": 2},

    # Ciências Agrárias
    "50000006": {"name": "Ciências Agrárias", "level": 1},
    "50100000": {"name": "Agronomia", "level": 2},
    "50200005": {"name": "Recursos Florestais e Engenharia Florestal", "level": 2},
    "50300000": {"name": "Engenharia Agrícola", "level": 2},
    "50400004": {"name": "Zootecnia", "level": 2},
    "50500009": {"name": "Medicina Veterinária", "level": 2},
    "50600003": {"name": "Recursos Pesqueiros e Engenharia de Pesca", "level": 2},
    "50700008": {"name": "Ciência e Tecnologia de Alimentos", "level": 2},

    # Ciências Sociais Aplicadas
    "60000007": {"name": "Ciências Sociais Aplicadas", "level": 1},
    "60100001": {"name": "Direito", "level": 2},
    "60200006": {"name": "Administração", "level": 2},
    "60300000": {"name": "Economia", "level": 2},
    "60400005": {"name": "Arquitetura e Urbanismo", "level": 2},
    "60500000": {"name": "Planejamento Urbano e Regional", "level": 2},
    "60600004": {"name": "Demografia", "level": 2},
    "60700009": {"name": "Ciência da Informação", "level": 2},
    "60800003": {"name": "Museologia", "level": 2},
    "60900008": {"name": "Comunicação", "level": 2},
    "61000006": {"name": "Serviço Social", "level": 2},
    "61100000": {"name": "Economia Doméstica", "level": 2},
    "61200005": {"name": "Desenho Industrial", "level": 2},
    "61300000": {"name": "Turismo", "level": 2},

    # Ciências Humanas
    "70000000": {"name": "Ciências Humanas", "level": 1},
    "70100005": {"name": "Filosofia", "level": 2},
    "70200000": {"name": "Sociologia", "level": 2},
    "70300004": {"name": "Antropologia", "level": 2},
    "70400009": {"name": "Arqueologia", "level": 2},
    "70500003": {"name": "História", "level": 2},
    "70600008": {"name": "Geografia", "level": 2},
    "70700002": {"name": "Psicologia", "level": 2},
    "70800007": {"name": "Educação", "level": 2},
    "70900001": {"name": "Ciência Política", "level": 2},
    "71000000": {"name": "Teologia", "level": 2},

    # Linguística, Letras e Artes
    "80000002": {"name": "Linguística, Letras e Artes", "level": 1},
    "80100007": {"name": "Linguística", "level": 2},
    "80200001": {"name": "Letras", "level": 2},
    "80300006": {"name": "Artes", "level": 2},
}

# Palavras-chave para mapeamento de áreas
AREA_KEYWORDS = {
    "energia": ["30400007", "10600000", "30600006"],  # Eng Elétrica, Química, Eng Química
    "bateria": ["30400007", "10600000", "30300002"],  # Eng Elétrica, Química, Materiais
    "sódio": ["10600000", "30300002"],  # Química, Materiais
    "lítio": ["10600000", "30300002"],  # Química, Materiais
    "material": ["30300002", "10600000"],  # Materiais, Química
    "eletrodo": ["30400007", "10600000"],  # Eng Elétrica, Química
    "eletroquímica": ["10600000", "30400007"],  # Química, Eng Elétrica
    "inteligência artificial": ["10300007", "30800005"],  # Computação, Eng Produção
    "machine learning": ["10300007"],  # Computação
    "aprendizado de máquina": ["10300007"],  # Computação
    "automação": ["30400007", "30500001", "30800005"],  # Elétrica, Mecânica, Produção
    "robótica": ["30400007", "30500001"],  # Elétrica, Mecânica
    "industrial": ["30800005", "30500001"],  # Produção, Mecânica
    "biomaterial": ["30300002", "40000001", "20800002"],  # Materiais, Saúde, Bioquímica
    "implante": ["40100006", "30300002"],  # Medicina, Materiais
    "prótese": ["40100006", "30300002"],  # Medicina, Materiais
    "regeneração": ["20000006", "40100006"],  # Biológicas, Medicina
    "tecido": ["20000006", "40100006"],  # Biológicas, Medicina
    "biocompatível": ["30300002", "40000001"],  # Materiais, Saúde
    "nanotecnologia": ["10600000", "30300002", "10500006"],  # Química, Materiais, Física
    "semicondutor": ["10500006", "30400007"],  # Física, Eng Elétrica
    "fotovoltaico": ["30400007", "10500006"],  # Eng Elétrica, Física
    "solar": ["30400007", "10500006"],  # Eng Elétrica, Física
    "hidrogênio": ["10600000", "30600006"],  # Química, Eng Química
    "célula combustível": ["10600000", "30400007"],  # Química, Eng Elétrica
    "agricultura": ["50100000", "50300000"],  # Agronomia, Eng Agrícola
    "biotecnologia": ["20000006", "50700008"],  # Biológicas, Alimentos
    "fármaco": ["40300005", "21000005"],  # Farmácia, Farmacologia
    "medicamento": ["40300005", "21000005"],  # Farmácia, Farmacologia
}


class CNPqConnector(BaseConnector):
    """
    Conector para dados do CNPq

    Implementa busca por grupos de pesquisa usando:
    1. Mapeamento de palavras-chave para áreas CNPq
    2. Base de dados simulada para MVP (preparada para dados reais)
    """

    def __init__(self):
        super().__init__()
        self.base_url = "http://dgp.cnpq.br"

    def get_source_name(self) -> str:
        return "CNPq - Diretório de Grupos de Pesquisa"

    def map_query_to_areas(self, query: str) -> List[Dict[str, str]]:
        """Mapeia query para áreas CNPq relevantes"""
        query_normalized = unidecode(query.lower())
        matched_areas = set()

        for keyword, area_codes in AREA_KEYWORDS.items():
            if keyword in query_normalized:
                matched_areas.update(area_codes)

        # Se não encontrou nenhuma, tenta match por similaridade
        if not matched_areas:
            for keyword, area_codes in AREA_KEYWORDS.items():
                if fuzz.partial_ratio(keyword, query_normalized) > 70:
                    matched_areas.update(area_codes)

        # Converte para lista de dicts com nome da área
        result = []
        for code in matched_areas:
            if code in CNPQ_AREAS:
                result.append({
                    "code": code,
                    "name": CNPQ_AREAS[code]["name"],
                    "level": CNPQ_AREAS[code]["level"]
                })

        return result

    async def search(
        self,
        query: str,
        areas: Optional[List[str]] = None,
        states: Optional[List[str]] = None,
        limit: int = 50
    ) -> List[ResearchGroup]:
        """
        Busca grupos de pesquisa

        Args:
            query: Termo de busca
            areas: Filtro por códigos de área CNPq
            states: Filtro por estados (siglas)
            limit: Número máximo de resultados

        Returns:
            Lista de grupos de pesquisa
        """
        logger.info(f"CNPq search: {query}")

        # Mapeia query para áreas se não especificadas
        if not areas:
            mapped_areas = self.map_query_to_areas(query)
            areas = [a["code"] for a in mapped_areas]

        # Para o MVP, retornamos dados simulados estruturados
        # Em produção, isso seria substituído por chamadas reais à API/dados
        groups = self._generate_simulated_groups(query, areas, states, limit)

        return groups

    def _generate_simulated_groups(
        self,
        query: str,
        areas: List[str],
        states: Optional[List[str]],
        limit: int
    ) -> List[ResearchGroup]:
        """
        Gera grupos simulados para MVP

        Em produção, será substituído por dados reais do:
        - Extrator Lattes (acesso institucional)
        - Web scraping do DGP
        - Arquivos CSV do portal de dados abertos
        """
        # Base de instituições brasileiras de pesquisa
        institutions = [
            {"name": "Universidade de São Paulo", "acronym": "USP", "state": "SP", "city": "São Paulo"},
            {"name": "Universidade Estadual de Campinas", "acronym": "UNICAMP", "state": "SP", "city": "Campinas"},
            {"name": "Universidade Federal do Rio de Janeiro", "acronym": "UFRJ", "state": "RJ", "city": "Rio de Janeiro"},
            {"name": "Universidade Federal de Minas Gerais", "acronym": "UFMG", "state": "MG", "city": "Belo Horizonte"},
            {"name": "Universidade Federal do Paraná", "acronym": "UFPR", "state": "PR", "city": "Curitiba"},
            {"name": "Universidade Federal do Rio Grande do Sul", "acronym": "UFRGS", "state": "RS", "city": "Porto Alegre"},
            {"name": "Universidade Federal de Santa Catarina", "acronym": "UFSC", "state": "SC", "city": "Florianópolis"},
            {"name": "Universidade Federal de Pernambuco", "acronym": "UFPE", "state": "PE", "city": "Recife"},
            {"name": "Universidade de Brasília", "acronym": "UnB", "state": "DF", "city": "Brasília"},
            {"name": "Universidade Federal do Ceará", "acronym": "UFC", "state": "CE", "city": "Fortaleza"},
            {"name": "Universidade Federal da Bahia", "acronym": "UFBA", "state": "BA", "city": "Salvador"},
            {"name": "Universidade Estadual Paulista", "acronym": "UNESP", "state": "SP", "city": "São Paulo"},
            {"name": "Pontifícia Universidade Católica do Rio de Janeiro", "acronym": "PUC-Rio", "state": "RJ", "city": "Rio de Janeiro"},
            {"name": "Instituto Nacional de Pesquisas Espaciais", "acronym": "INPE", "state": "SP", "city": "São José dos Campos"},
            {"name": "Empresa Brasileira de Pesquisa Agropecuária", "acronym": "Embrapa", "state": "DF", "city": "Brasília"},
            {"name": "Centro Brasileiro de Pesquisas Físicas", "acronym": "CBPF", "state": "RJ", "city": "Rio de Janeiro"},
            {"name": "Instituto Tecnológico de Aeronáutica", "acronym": "ITA", "state": "SP", "city": "São José dos Campos"},
            {"name": "Fundação Oswaldo Cruz", "acronym": "Fiocruz", "state": "RJ", "city": "Rio de Janeiro"},
        ]

        # Templates de nomes de grupos baseados na query
        query_lower = query.lower()
        group_templates = []

        if "bateria" in query_lower or "energia" in query_lower or "sódio" in query_lower:
            group_templates = [
                "Grupo de Materiais para Energia",
                "Laboratório de Armazenamento de Energia",
                "Núcleo de Eletroquímica Aplicada",
                "Centro de Pesquisa em Baterias",
                "Grupo de Materiais Funcionais",
                "Laboratório de Conversão de Energia",
                "Grupo de Sistemas Eletroquímicos",
                "Núcleo de Materiais Avançados para Energia",
                "Laboratório de Células e Baterias",
                "Centro de Energia Sustentável",
            ]
        elif "inteligência artificial" in query_lower or "ia" in query_lower or "machine learning" in query_lower:
            group_templates = [
                "Laboratório de Inteligência Artificial",
                "Grupo de IA e Automação",
                "Centro de IA Aplicada",
                "Núcleo de Machine Learning Industrial",
                "Grupo de Sistemas Inteligentes",
                "Laboratório de Aprendizado de Máquina",
                "Centro de Computação Cognitiva",
                "Grupo de Visão Computacional",
                "Núcleo de Deep Learning",
                "Laboratório de IA para Indústria",
            ]
        elif "biomaterial" in query_lower or "implante" in query_lower or "biocompat" in query_lower:
            group_templates = [
                "Laboratório de Biomateriais e Bioengenharia",
                "Grupo de Materiais Biocompatíveis",
                "Centro de Pesquisa em Biomateriais",
                "Núcleo de Engenharia de Tecidos",
                "Laboratório de Polímeros Biodegradáveis",
                "Grupo de Implantes e Próteses",
                "Centro de Regeneração Tecidual",
                "Laboratório de Biomecânica",
                "Núcleo de Materiais para Saúde",
                "Grupo de Dispositivos Biomédicos",
            ]
        else:
            # Templates genéricos
            group_templates = [
                f"Grupo de Pesquisa em {query.title()}",
                f"Laboratório de {query.title()}",
                f"Núcleo de Estudos em {query.title()}",
                f"Centro de Pesquisa em {query.title()}",
                f"Grupo de Desenvolvimento de {query.title()}",
            ]

        # Gera grupos
        groups = []
        import random
        random.seed(hash(query))  # Seed baseado na query para consistência

        # Filtra instituições por estado se especificado
        filtered_institutions = institutions
        if states:
            filtered_institutions = [i for i in institutions if i["state"] in states]
            if not filtered_institutions:
                filtered_institutions = institutions

        for i, template in enumerate(group_templates[:limit]):
            inst = filtered_institutions[i % len(filtered_institutions)]

            # Determina área baseada no mapeamento
            area_name = "Área não especificada"
            if areas and areas[0] in CNPQ_AREAS:
                area_name = CNPQ_AREAS[areas[0]]["name"]

            # Simula colaboração internacional para alguns grupos
            international = None
            if random.random() > 0.6:
                international_partners = [
                    "Parceria com MIT",
                    "Colaboração com Fraunhofer",
                    "Projeto conjunto com ETH Zurich",
                    "Colaboração com CNRS (França)",
                    "Parceria com Stanford",
                    "Projeto com Max Planck Institute",
                    "Colaboração com University of Tokyo",
                    "Parceria com Cambridge",
                ]
                international = random.choice(international_partners)

            group = ResearchGroup(
                id=f"cnpq_{hash(template + inst['acronym']) % 10000000:07d}",
                name=template,
                institution=inst["name"],
                institution_acronym=inst["acronym"],
                state=inst["state"],
                city=inst["city"],
                area=area_name,
                researchers_count=random.randint(5, 25),
                students_count=random.randint(3, 40),
                year_created=random.randint(1995, 2023),
                international_collaboration=international,
                source="cnpq"
            )
            groups.append(group)

        return groups

    async def get_group_details(self, group_id: str) -> Optional[ResearchGroup]:
        """Obtém detalhes de um grupo específico"""
        # Em produção, buscaria detalhes do DGP
        logger.info(f"Getting CNPq group details: {group_id}")
        return None

    def get_areas_by_keywords(self, keywords: List[str]) -> List[Dict[str, str]]:
        """Retorna áreas CNPq relacionadas a palavras-chave"""
        areas = set()
        for keyword in keywords:
            keyword_lower = keyword.lower()
            if keyword_lower in AREA_KEYWORDS:
                areas.update(AREA_KEYWORDS[keyword_lower])

        return [
            {"code": code, "name": CNPQ_AREAS[code]["name"]}
            for code in areas
            if code in CNPQ_AREAS
        ]
