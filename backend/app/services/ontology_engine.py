"""
MOTOR 4P UFPR - Ontology Engine
Motor de Tradução Ontológica

Este é o CORAÇÃO do sistema:
Traduz objetos tecnológicos em códigos de classificação multi-camada

Objeto Tecnológico → {
    Áreas CNPq (ciência)
    IPC/CPC (patentes)
    NCM (comércio exterior)
    CNAE (atividades econômicas)
}
"""
import logging
from typing import List, Dict, Any, Optional, Tuple
from unidecode import unidecode
from rapidfuzz import fuzz, process

from ..models.schemas import OntologyMapping

logger = logging.getLogger(__name__)


class OntologyEngine:
    """
    Motor de Tradução Ontológica

    Responsável por mapear objetos tecnológicos para códigos de classificação
    em múltiplas ontologias do sistema de inovação brasileiro.
    """

    def __init__(self):
        self.ipc_index = self._build_ipc_index()
        self.ncm_index = self._build_ncm_index()
        self.cnae_index = self._build_cnae_index()
        self.cnpq_index = self._build_cnpq_index()
        self.keyword_mappings = self._build_keyword_mappings()

    def translate(self, query: str) -> OntologyMapping:
        """
        Traduz um objeto tecnológico para códigos de classificação

        Args:
            query: Descrição do objeto tecnológico (ex: "baterias de sódio-íon")

        Returns:
            OntologyMapping com códigos em todas as classificações
        """
        logger.info(f"Translating: {query}")

        # Normaliza query
        query_normalized = self._normalize(query)
        keywords = self._extract_keywords(query_normalized)

        # Busca em cada ontologia
        ipc_codes = self._find_ipc_codes(query_normalized, keywords)
        ncm_codes = self._find_ncm_codes(query_normalized, keywords)
        cnae_codes = self._find_cnae_codes(query_normalized, keywords)
        cnpq_areas = self._find_cnpq_areas(query_normalized, keywords)

        # Expande termos de busca
        search_terms = self._expand_search_terms(query, keywords)

        # Calcula confiança do mapeamento
        confidence = self._calculate_confidence(ipc_codes, ncm_codes, cnae_codes, cnpq_areas)

        return OntologyMapping(
            query=query,
            ipc_codes=ipc_codes,
            ncm_codes=ncm_codes,
            cnae_codes=cnae_codes,
            cnpq_areas=cnpq_areas,
            search_terms=search_terms,
            confidence=confidence
        )

    def _normalize(self, text: str) -> str:
        """Normaliza texto para busca"""
        return unidecode(text.lower().strip())

    def _extract_keywords(self, text: str) -> List[str]:
        """Extrai palavras-chave relevantes"""
        # Remove stopwords em português
        stopwords = {
            'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'com', 'por',
            'uma', 'um', 'o', 'a', 'os', 'as', 'que', 'na', 'no', 'nas', 'nos'
        }

        words = text.split()
        keywords = [w for w in words if w not in stopwords and len(w) > 2]

        return keywords

    def _find_ipc_codes(
        self,
        query: str,
        keywords: List[str]
    ) -> List[Dict[str, str]]:
        """
        Encontra códigos IPC (International Patent Classification)
        """
        results = []
        seen = set()

        # Busca por keywords diretas no mapeamento
        for keyword in keywords:
            if keyword in self.keyword_mappings:
                for ipc in self.keyword_mappings[keyword].get("ipc", []):
                    if ipc not in seen and ipc in self.ipc_index:
                        seen.add(ipc)
                        results.append({
                            "code": ipc,
                            "description": self.ipc_index[ipc]["description"],
                            "match_type": "keyword"
                        })

        # Busca fuzzy no índice IPC
        for code, data in self.ipc_index.items():
            if code in seen:
                continue

            description_normalized = self._normalize(data["description"])

            # Match exato de qualquer keyword
            for kw in keywords:
                if kw in description_normalized:
                    seen.add(code)
                    results.append({
                        "code": code,
                        "description": data["description"],
                        "match_type": "description"
                    })
                    break

        # Limita resultados
        return results[:10]

    def _find_ncm_codes(
        self,
        query: str,
        keywords: List[str]
    ) -> List[Dict[str, str]]:
        """
        Encontra códigos NCM (Nomenclatura Comum do Mercosul)
        """
        results = []
        seen = set()

        # Busca por keywords diretas
        for keyword in keywords:
            if keyword in self.keyword_mappings:
                for ncm in self.keyword_mappings[keyword].get("ncm", []):
                    if ncm not in seen and ncm in self.ncm_index:
                        seen.add(ncm)
                        results.append({
                            "code": ncm,
                            "description": self.ncm_index[ncm]["description"],
                            "match_type": "keyword"
                        })

        # Busca fuzzy no índice NCM
        for code, data in self.ncm_index.items():
            if code in seen:
                continue

            description_normalized = self._normalize(data["description"])

            for kw in keywords:
                if kw in description_normalized:
                    seen.add(code)
                    results.append({
                        "code": code,
                        "description": data["description"],
                        "match_type": "description"
                    })
                    break

        return results[:10]

    def _find_cnae_codes(
        self,
        query: str,
        keywords: List[str]
    ) -> List[Dict[str, str]]:
        """
        Encontra códigos CNAE (Classificação Nacional de Atividades Econômicas)
        """
        results = []
        seen = set()

        # Busca por keywords
        for keyword in keywords:
            if keyword in self.keyword_mappings:
                for cnae in self.keyword_mappings[keyword].get("cnae", []):
                    if cnae not in seen and cnae in self.cnae_index:
                        seen.add(cnae)
                        results.append({
                            "code": cnae,
                            "description": self.cnae_index[cnae]["description"],
                            "match_type": "keyword"
                        })

        # Busca fuzzy
        for code, data in self.cnae_index.items():
            if code in seen:
                continue

            description_normalized = self._normalize(data["description"])

            for kw in keywords:
                if kw in description_normalized:
                    seen.add(code)
                    results.append({
                        "code": code,
                        "description": data["description"],
                        "match_type": "description"
                    })
                    break

        return results[:10]

    def _find_cnpq_areas(
        self,
        query: str,
        keywords: List[str]
    ) -> List[Dict[str, str]]:
        """
        Encontra áreas do conhecimento CNPq
        """
        results = []
        seen = set()

        # Busca por keywords
        for keyword in keywords:
            if keyword in self.keyword_mappings:
                for code in self.keyword_mappings[keyword].get("cnpq", []):
                    if code not in seen and code in self.cnpq_index:
                        seen.add(code)
                        results.append({
                            "code": code,
                            "name": self.cnpq_index[code]["name"],
                            "level": self.cnpq_index[code]["level"],
                            "match_type": "keyword"
                        })

        # Busca fuzzy
        for code, data in self.cnpq_index.items():
            if code in seen:
                continue

            name_normalized = self._normalize(data["name"])

            for kw in keywords:
                if kw in name_normalized:
                    seen.add(code)
                    results.append({
                        "code": code,
                        "name": data["name"],
                        "level": data["level"],
                        "match_type": "description"
                    })
                    break

        return results[:10]

    def _expand_search_terms(
        self,
        original_query: str,
        keywords: List[str]
    ) -> List[str]:
        """
        Expande termos de busca com sinônimos e variações
        """
        terms = [original_query]
        terms.extend(keywords)

        # Adiciona sinônimos conhecidos
        for kw in keywords:
            if kw in SYNONYMS:
                terms.extend(SYNONYMS[kw])

        # Remove duplicatas mantendo ordem
        seen = set()
        unique_terms = []
        for term in terms:
            if term not in seen:
                seen.add(term)
                unique_terms.append(term)

        return unique_terms[:20]

    def _calculate_confidence(
        self,
        ipc_codes: List[Dict],
        ncm_codes: List[Dict],
        cnae_codes: List[Dict],
        cnpq_areas: List[Dict]
    ) -> float:
        """
        Calcula confiança do mapeamento

        Baseado em:
        - Quantidade de códigos encontrados em cada ontologia
        - Proporção de matches por keyword vs description
        """
        scores = []

        for codes_list in [ipc_codes, ncm_codes, cnae_codes, cnpq_areas]:
            if not codes_list:
                scores.append(0)
            else:
                # Pontuação por quantidade (max 1.0)
                qty_score = min(len(codes_list) / 3, 1.0)

                # Bonus por match por keyword
                keyword_matches = sum(
                    1 for c in codes_list
                    if c.get("match_type") == "keyword"
                )
                keyword_score = keyword_matches / len(codes_list) if codes_list else 0

                scores.append((qty_score + keyword_score) / 2)

        # Média das pontuações
        return sum(scores) / len(scores) if scores else 0

    def _build_ipc_index(self) -> Dict[str, Dict[str, str]]:
        """Constrói índice de códigos IPC"""
        return IPC_INDEX

    def _build_ncm_index(self) -> Dict[str, Dict[str, str]]:
        """Constrói índice de códigos NCM"""
        return NCM_INDEX

    def _build_cnae_index(self) -> Dict[str, Dict[str, str]]:
        """Constrói índice de códigos CNAE"""
        return CNAE_INDEX

    def _build_cnpq_index(self) -> Dict[str, Dict[str, Any]]:
        """Constrói índice de áreas CNPq"""
        return CNPQ_INDEX

    def _build_keyword_mappings(self) -> Dict[str, Dict[str, List[str]]]:
        """Constrói mapeamento de keywords para códigos"""
        return KEYWORD_MAPPINGS


# =============================================================================
# ÍNDICES E MAPEAMENTOS
# =============================================================================

# Classificação Internacional de Patentes (IPC)
IPC_INDEX = {
    # Baterias e energia
    "H01M": {"description": "Processos ou meios para conversão direta de energia química em elétrica (baterias)"},
    "H01M10/05": {"description": "Acumuladores com eletrólitos não aquosos"},
    "H01M10/054": {"description": "Acumuladores de íons de sódio"},
    "H01M10/052": {"description": "Acumuladores de íons de lítio"},
    "H01M4": {"description": "Eletrodos para baterias"},
    "H01M4/58": {"description": "Eletrodos de materiais compostos"},
    "H02J": {"description": "Circuitos para armazenamento de energia elétrica"},
    "H02J7": {"description": "Circuitos para carga ou despolarização de baterias"},

    # Semicondutores e eletrônica
    "H01L": {"description": "Dispositivos semicondutores"},
    "H01L21": {"description": "Processos de fabricação de semicondutores"},
    "H01L29": {"description": "Dispositivos semicondutores para amplificação ou geração"},
    "G06F": {"description": "Processamento elétrico de dados digitais"},
    "G06N": {"description": "Sistemas de computação baseados em modelos computacionais específicos"},
    "G06N3/02": {"description": "Redes neurais"},
    "G06N20": {"description": "Aprendizado de máquina"},

    # Biomateriais e medicina
    "A61L": {"description": "Métodos ou aparelhos para esterilização de materiais; materiais para bandagens, curativos, absorventes ou artigos cirúrgicos"},
    "A61L27": {"description": "Materiais para próteses ou revestimento de próteses"},
    "A61L31": {"description": "Materiais para outros artigos cirúrgicos"},
    "A61F": {"description": "Filtros implantáveis nos vasos sanguíneos; próteses"},
    "A61F2": {"description": "Filtros implantáveis nos vasos sanguíneos; próteses; dispositivos ortopédicos"},
    "A61K": {"description": "Preparações para finalidades médicas, odontológicas ou de higiene"},
    "A61P": {"description": "Atividade terapêutica específica de compostos químicos ou preparações medicinais"},

    # Química e materiais
    "C01": {"description": "Química inorgânica"},
    "C01G": {"description": "Compostos contendo metais não abrangidos em outras classes"},
    "C07": {"description": "Química orgânica"},
    "C08": {"description": "Compostos macromoleculares orgânicos"},
    "C09": {"description": "Corantes, tintas, polidores, resinas naturais"},
    "C22": {"description": "Metalurgia; ligas ferrosas e não ferrosas"},
    "C23": {"description": "Revestimento de materiais metálicos"},

    # Nanotecnologia
    "B82": {"description": "Nanotecnologia"},
    "B82Y": {"description": "Usos ou aplicações específicas de nanoestruturas"},
    "B82Y30": {"description": "Nanotecnologia para materiais ou ciência de superfícies"},
    "B82Y40": {"description": "Fabricação ou processamento de nanoestruturas"},

    # Energia renovável
    "H02S": {"description": "Geração de energia elétrica por conversão de radiação infravermelha, luz visível ou ultravioleta"},
    "H02S10": {"description": "Células fotovoltaicas (PV)"},
    "F03D": {"description": "Motores a vento"},
    "C25B": {"description": "Processos eletrolíticos para produção de compostos ou metais"},
    "C25B1/04": {"description": "Produção de hidrogênio por eletrólise"},
}

# Nomenclatura Comum do Mercosul (NCM)
NCM_INDEX = {
    # Baterias e acumuladores
    "8507.60.00": {"description": "Acumuladores de íons de lítio"},
    "8507.80.00": {"description": "Outros acumuladores elétricos"},
    "8507.90.00": {"description": "Partes de acumuladores elétricos"},
    "8506.50.00": {"description": "Pilhas de lítio"},
    "8506.80.00": {"description": "Outras pilhas e baterias de pilhas, elétricas"},

    # Computadores e eletrônicos
    "8471.30.00": {"description": "Máquinas automáticas para processamento de dados portáteis"},
    "8471.41.00": {"description": "Outras máquinas automáticas para processamento de dados"},
    "8471.50.00": {"description": "Unidades de processamento"},
    "8542.31.00": {"description": "Processadores e controladores"},
    "8542.32.00": {"description": "Memórias"},
    "8542.33.00": {"description": "Amplificadores"},
    "8542.39.00": {"description": "Outros circuitos integrados"},

    # Instrumentos médicos
    "9018.90.00": {"description": "Outros instrumentos para medicina, cirurgia, odontologia ou veterinária"},
    "9021.10.00": {"description": "Artigos e aparelhos ortopédicos"},
    "9021.21.00": {"description": "Dentes artificiais"},
    "9021.29.00": {"description": "Outros artigos e aparelhos de prótese dentária"},
    "9021.31.00": {"description": "Próteses articulares"},
    "9021.39.00": {"description": "Outras partes artificiais do corpo"},

    # Químicos
    "2825.10.00": {"description": "Hidrazina e hidroxilamina e seus sais inorgânicos"},
    "2826.90.00": {"description": "Outros fluoretos"},
    "2836.99.00": {"description": "Outros carbonatos"},
    "3824.99.00": {"description": "Outros produtos químicos e preparações das indústrias químicas"},

    # Equipamentos de energia
    "8501.31.00": {"description": "Motores e geradores de corrente contínua até 750 W"},
    "8501.61.00": {"description": "Geradores de corrente alternada até 75 kVA"},
    "8541.40.00": {"description": "Dispositivos fotossensíveis semicondutores (células solares)"},
}

# CNAE - Classificação Nacional de Atividades Econômicas
CNAE_INDEX = {
    "27.22-8": {"description": "Fabricação de baterias e acumuladores para veículos automotores"},
    "26.10-8": {"description": "Fabricação de componentes eletrônicos"},
    "26.21-3": {"description": "Fabricação de equipamentos de informática"},
    "26.31-1": {"description": "Fabricação de equipamentos transmissores de comunicação"},
    "32.50-7": {"description": "Fabricação de instrumentos e materiais para uso médico e odontológico"},
    "21.10-6": {"description": "Fabricação de produtos farmoquímicos"},
    "21.21-1": {"description": "Fabricação de medicamentos para uso humano"},
    "20.19-3": {"description": "Fabricação de produtos químicos inorgânicos"},
    "20.99-1": {"description": "Fabricação de outros produtos químicos"},
    "72.10-0": {"description": "Pesquisa e desenvolvimento experimental em ciências físicas e naturais"},
    "72.20-7": {"description": "Pesquisa e desenvolvimento experimental em ciências sociais e humanas"},
    "62.01-5": {"description": "Desenvolvimento de programas de computador sob encomenda"},
    "62.02-3": {"description": "Desenvolvimento e licenciamento de programas de computador customizáveis"},
    "62.04-0": {"description": "Consultoria em tecnologia da informação"},
    "35.11-5": {"description": "Geração de energia elétrica"},
    "28.69-1": {"description": "Fabricação de máquinas e equipamentos para uso industrial"},
}

# Áreas do conhecimento CNPq
CNPQ_INDEX = {
    "10300007": {"name": "Ciência da Computação", "level": 2},
    "10500006": {"name": "Física", "level": 2},
    "10600000": {"name": "Química", "level": 2},
    "20800002": {"name": "Bioquímica", "level": 2},
    "30300002": {"name": "Engenharia de Materiais e Metalúrgica", "level": 2},
    "30400007": {"name": "Engenharia Elétrica", "level": 2},
    "30500001": {"name": "Engenharia Mecânica", "level": 2},
    "30600006": {"name": "Engenharia Química", "level": 2},
    "30800005": {"name": "Engenharia de Produção", "level": 2},
    "40100006": {"name": "Medicina", "level": 2},
    "40200000": {"name": "Odontologia", "level": 2},
    "40300005": {"name": "Farmácia", "level": 2},
    "50700008": {"name": "Ciência e Tecnologia de Alimentos", "level": 2},
    "60300000": {"name": "Economia", "level": 2},
}

# Mapeamento de keywords para códigos
KEYWORD_MAPPINGS = {
    # Baterias e energia
    "bateria": {
        "ipc": ["H01M", "H01M10/05", "H01M4"],
        "ncm": ["8507.60.00", "8507.80.00"],
        "cnae": ["27.22-8"],
        "cnpq": ["30400007", "10600000", "30300002"],
    },
    "sodio": {
        "ipc": ["H01M10/054", "C01G"],
        "ncm": ["8507.80.00", "2836.99.00"],
        "cnae": ["27.22-8", "20.19-3"],
        "cnpq": ["10600000", "30300002"],
    },
    "litio": {
        "ipc": ["H01M10/052", "H01M4"],
        "ncm": ["8507.60.00", "8506.50.00"],
        "cnae": ["27.22-8"],
        "cnpq": ["10600000", "30300002"],
    },
    "energia": {
        "ipc": ["H02J", "H02S", "H01M"],
        "ncm": ["8541.40.00", "8501.61.00"],
        "cnae": ["35.11-5", "27.22-8"],
        "cnpq": ["30400007", "10500006"],
    },
    "solar": {
        "ipc": ["H02S10", "H02S"],
        "ncm": ["8541.40.00"],
        "cnae": ["35.11-5"],
        "cnpq": ["30400007", "10500006"],
    },

    # Computação e IA
    "inteligencia": {
        "ipc": ["G06N", "G06N3/02", "G06N20"],
        "ncm": ["8471.50.00", "8542.31.00"],
        "cnae": ["62.01-5", "62.04-0"],
        "cnpq": ["10300007"],
    },
    "artificial": {
        "ipc": ["G06N", "G06N3/02", "G06N20"],
        "ncm": ["8471.50.00", "8542.31.00"],
        "cnae": ["62.01-5", "62.04-0"],
        "cnpq": ["10300007"],
    },
    "machine": {
        "ipc": ["G06N20"],
        "ncm": ["8471.50.00"],
        "cnae": ["62.01-5"],
        "cnpq": ["10300007"],
    },
    "learning": {
        "ipc": ["G06N20", "G06N3/02"],
        "ncm": ["8471.50.00"],
        "cnae": ["62.01-5"],
        "cnpq": ["10300007"],
    },
    "computador": {
        "ipc": ["G06F"],
        "ncm": ["8471.30.00", "8471.41.00"],
        "cnae": ["26.21-3", "62.01-5"],
        "cnpq": ["10300007"],
    },
    "semicondutor": {
        "ipc": ["H01L", "H01L21"],
        "ncm": ["8542.31.00", "8542.32.00", "8542.39.00"],
        "cnae": ["26.10-8"],
        "cnpq": ["10500006", "30400007"],
    },
    "chip": {
        "ipc": ["H01L", "H01L29"],
        "ncm": ["8542.31.00", "8542.39.00"],
        "cnae": ["26.10-8"],
        "cnpq": ["10500006", "30400007"],
    },

    # Biomateriais e saúde
    "biomaterial": {
        "ipc": ["A61L", "A61L27", "A61L31"],
        "ncm": ["9021.39.00", "3824.99.00"],
        "cnae": ["32.50-7", "20.99-1"],
        "cnpq": ["30300002", "40100006", "20800002"],
    },
    "implante": {
        "ipc": ["A61F2", "A61L27"],
        "ncm": ["9021.31.00", "9021.39.00"],
        "cnae": ["32.50-7"],
        "cnpq": ["40100006", "30300002"],
    },
    "protese": {
        "ipc": ["A61F2", "A61L27"],
        "ncm": ["9021.31.00", "9021.39.00"],
        "cnae": ["32.50-7"],
        "cnpq": ["40100006", "40200000"],
    },
    "medico": {
        "ipc": ["A61K", "A61P", "A61L"],
        "ncm": ["9018.90.00", "9021.39.00"],
        "cnae": ["32.50-7", "21.21-1"],
        "cnpq": ["40100006", "40300005"],
    },
    "farmaco": {
        "ipc": ["A61K", "A61P"],
        "ncm": ["3004.90.00"],
        "cnae": ["21.10-6", "21.21-1"],
        "cnpq": ["40300005", "20800002"],
    },

    # Nanotecnologia
    "nano": {
        "ipc": ["B82", "B82Y", "B82Y30"],
        "ncm": ["3824.99.00"],
        "cnae": ["20.99-1", "72.10-0"],
        "cnpq": ["10500006", "10600000", "30300002"],
    },
    "nanotecnologia": {
        "ipc": ["B82", "B82Y30", "B82Y40"],
        "ncm": ["3824.99.00"],
        "cnae": ["20.99-1", "72.10-0"],
        "cnpq": ["10500006", "10600000", "30300002"],
    },

    # Químicos
    "quimico": {
        "ipc": ["C01", "C07", "C08"],
        "ncm": ["2825.10.00", "3824.99.00"],
        "cnae": ["20.19-3", "20.99-1"],
        "cnpq": ["10600000", "30600006"],
    },
    "polimero": {
        "ipc": ["C08"],
        "ncm": ["3901.90.00", "3824.99.00"],
        "cnae": ["20.99-1"],
        "cnpq": ["10600000", "30300002"],
    },

    # Automação
    "automacao": {
        "ipc": ["G05B", "B25J"],
        "ncm": ["8479.50.00", "8537.10.00"],
        "cnae": ["28.69-1", "62.01-5"],
        "cnpq": ["30400007", "30800005"],
    },
    "robotica": {
        "ipc": ["B25J", "G05B"],
        "ncm": ["8479.50.00"],
        "cnae": ["28.69-1"],
        "cnpq": ["30400007", "30500001"],
    },
    "industrial": {
        "ipc": ["G05B", "B25J"],
        "ncm": ["8479.50.00", "8537.10.00"],
        "cnae": ["28.69-1", "30800005"],
        "cnpq": ["30800005", "30500001"],
    },
}

# Sinônimos para expansão de busca
SYNONYMS = {
    "bateria": ["acumulador", "célula", "armazenamento de energia"],
    "sodio": ["na-ion", "sodium", "sódio-íon"],
    "litio": ["li-ion", "lithium", "lítio-íon"],
    "inteligencia": ["ia", "ai", "aprendizado de máquina", "machine learning"],
    "artificial": ["ia", "ai", "ml"],
    "biomaterial": ["biocompatível", "bioativo", "scaffold"],
    "implante": ["prótese", "dispositivo implantável"],
    "nano": ["nanomaterial", "nanopartícula", "nanoestrutura"],
    "automacao": ["automatização", "controle automático"],
    "robotica": ["robô", "manipulador", "cobot"],
    # Disciplinas científicas transversais
    "reologia": ["rheology", "comportamento reológico", "propriedades reológicas"],
    "reologico": ["rheology", "rheological", "comportamento reológico"],
    "reologica": ["rheology", "rheological", "propriedades reológicas"],
    "viscosidade": ["viscosity", "viscosímetro", "reologia"],
    "escoamento": ["flow", "fluid flow", "reologia"],
}
