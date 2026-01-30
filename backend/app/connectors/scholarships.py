"""
International Scholarships Connector
Agrega dados de bolsas internacionais de múltiplas fontes
"""

import httpx
from typing import Dict, List, Any
from .base import BaseConnector


class InternationalScholarshipsConnector(BaseConnector):
    """Connector para APIs de bolsas internacionais"""
    
    def __init__(self):
        super().__init__()
        self.timeout = 30.0
        # APIs públicas de bolsas
        self.scholarship_db_url = "https://api.scholarshipdb.net"  # Exemplo
        self.study_portals_url = "https://api.studyportals.com"  # Exemplo
    
    async def search_international_scholarships(self, term: str, field: str = None) -> Dict[str, Any]:
        """
        Busca bolsas internacionais relacionadas ao termo
        
        Args:
            term: Termo de busca
            field: Campo de estudo específico
            
        Returns:
            Dict com bolsas internacionais
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Busca em múltiplas fontes
                eu_scholarships = await self._search_europe_scholarships(client, term, field)
                us_scholarships = await self._search_us_scholarships(client, term, field)
                global_scholarships = await self._search_global_scholarships(client, term, field)
                
                all_scholarships = eu_scholarships + us_scholarships + global_scholarships
                
                return {
                    "source": "International Scholarships",
                    "scholarships": all_scholarships[:50],  # Limita a 50
                    "total": len(all_scholarships),
                    "by_region": {
                        "europe": len(eu_scholarships),
                        "north_america": len(us_scholarships),
                        "global": len(global_scholarships)
                    }
                }
        except Exception as e:
            return self._handle_error(e, "International Scholarships")
    
    async def _search_europe_scholarships(self, client: httpx.AsyncClient, term: str, field: str) -> List[Dict]:
        """Busca bolsas na Europa"""
        scholarships = []
        
        # Dados mock - adaptar para APIs reais como Erasmus+, DAAD, etc
        europe_programs = [
            {
                "name": "Erasmus Mundus Joint Master",
                "institution": "European Union",
                "country": "Multiple EU Countries",
                "level": "Master",
                "field": field or term,
                "value_yearly": "€25,000 - €29,000",
                "duration_months": 24,
                "deadline": "Varies by program",
                "link": "https://www.eacea.ec.europa.eu/scholarships/erasmus-mundus-catalogue_en"
            },
            {
                "name": "DAAD Scholarships",
                "institution": "German Academic Exchange Service",
                "country": "Germany",
                "level": "Master/PhD",
                "field": field or term,
                "value_yearly": "€850 - €1,200/month",
                "duration_months": 24,
                "deadline": "October",
                "link": "https://www.daad.de/en/"
            },
            {
                "name": "Chevening Scholarships",
                "institution": "UK Government",
                "country": "United Kingdom",
                "level": "Master",
                "field": field or term,
                "value_yearly": "Full tuition + stipend",
                "duration_months": 12,
                "deadline": "November",
                "link": "https://www.chevening.org/"
            }
        ]
        
        return [s for s in europe_programs if term.lower() in s["field"].lower()]
    
    async def _search_us_scholarships(self, client: httpx.AsyncClient, term: str, field: str) -> List[Dict]:
        """Busca bolsas nos EUA"""
        scholarships = []
        
        # Dados mock - adaptar para APIs reais como Fulbright, etc
        us_programs = [
            {
                "name": "Fulbright Foreign Student Program",
                "institution": "U.S. Department of State",
                "country": "United States",
                "level": "Master/PhD",
                "field": field or term,
                "value_yearly": "Full funding",
                "duration_months": 24,
                "deadline": "May-October",
                "link": "https://foreign.fulbrightonline.org/"
            },
            {
                "name": "Hubert H. Humphrey Fellowship",
                "institution": "U.S. Department of State",
                "country": "United States",
                "level": "Professional Development",
                "field": field or term,
                "value_yearly": "Full funding",
                "duration_months": 10,
                "deadline": "Varies",
                "link": "https://www.humphreyfellowship.org/"
            }
        ]
        
        return [s for s in us_programs if term.lower() in s["field"].lower()]
    
    async def _search_global_scholarships(self, client: httpx.AsyncClient, term: str, field: str) -> List[Dict]:
        """Busca bolsas globais e de organizações internacionais"""
        
        global_programs = [
            {
                "name": "UNESCO Fellowships",
                "institution": "UNESCO",
                "country": "Multiple Countries",
                "level": "PhD/Postdoc",
                "field": field or term,
                "value_yearly": "Varies",
                "duration_months": 12,
                "deadline": "Varies",
                "link": "https://en.unesco.org/fellowships"
            },
            {
                "name": "Joint Japan/World Bank Graduate Scholarship",
                "institution": "World Bank",
                "country": "Multiple Countries",
                "level": "Master",
                "field": field or term,
                "value_yearly": "Full funding",
                "duration_months": 24,
                "deadline": "April",
                "link": "https://www.worldbank.org/en/programs/scholarships"
            }
        ]
        
        return [s for s in global_programs if term.lower() in s["field"].lower()]
