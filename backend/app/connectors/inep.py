"""
INEP Connector - Instituto Nacional de Estudos e Pesquisas Educacionais
Dados sobre instituições de ensino superior no Brasil
"""

import httpx
from typing import Dict, List, Any
from .base import BaseConnector


class INEPConnector(BaseConnector):
    """Connector para dados do INEP sobre instituições de ensino"""
    
    def __init__(self):
        super().__init__()
        # Portal de Dados Abertos do INEP
        self.base_url = "https://dadosabertos.inep.gov.br/api"
        self.timeout = 30.0
    
    async def search_institutions(self, term: str, state: str = None) -> Dict[str, Any]:
        """
        Busca instituições de ensino relacionadas ao termo
        
        Args:
            term: Termo de busca (área de conhecimento, curso, etc)
            state: Estado (UF) para filtro
            
        Returns:
            Dict com instituições encontradas
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                institutions = await self._search_higher_education(client, term, state)
                courses = await self._search_courses(client, term, state)
                
                return {
                    "source": "INEP",
                    "institutions": institutions,
                    "courses": courses,
                    "total_institutions": len(institutions),
                    "total_courses": len(courses)
                }
        except Exception as e:
            return self._handle_error(e, "INEP")
    
    async def _search_higher_education(self, client: httpx.AsyncClient, term: str, state: str) -> List[Dict]:
        """Busca IES relacionadas"""
        # Mock data - adaptar para API real do INEP
        institutions_mock = [
            {
                "name": "Universidade Federal do Paraná",
                "acronym": "UFPR",
                "state": "PR",
                "city": "Curitiba",
                "type": "Pública Federal",
                "has_graduate": True,
                "areas": ["Tecnologia", "Ciências Exatas", "Engenharias"],
                "grade_enade": 4.2
            },
            {
                "name": "Universidade de São Paulo",
                "acronym": "USP",
                "state": "SP",
                "city": "São Paulo",
                "type": "Pública Estadual",
                "has_graduate": True,
                "areas": ["Todas as áreas"],
                "grade_enade": 4.8
            }
        ]
        
        filtered = [
            inst for inst in institutions_mock 
            if term.lower() in str(inst.get("areas", "")).lower()
            and (not state or inst.get("state") == state)
        ]
        
        return filtered
    
    async def _search_courses(self, client: httpx.AsyncClient, term: str, state: str) -> List[Dict]:
        """Busca cursos relacionados ao termo"""
        # Mock data
        courses_mock = [
            {
                "name": "Engenharia de Computação",
                "institution": "UFPR",
                "level": "Graduação",
                "modality": "Presencial",
                "city": "Curitiba",
                "state": "PR",
                "grade_enade": 4,
                "duration_semesters": 10
            },
            {
                "name": "Ciência da Computação",
                "institution": "USP",
                "level": "Graduação",
                "modality": "Presencial",
                "city": "São Paulo",
                "state": "SP",
                "grade_enade": 5,
                "duration_semesters": 8
            }
        ]
        
        filtered = [
            course for course in courses_mock 
            if term.lower() in course.get("name", "").lower()
            and (not state or course.get("state") == state)
        ]
        
        return filtered
