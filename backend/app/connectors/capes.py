"""
CAPES Data Portal Connector
Acessa dados abertos da CAPES sobre bolsas e programas de pós-graduação
"""

import httpx
from typing import Dict, List, Any
from .base import BaseConnector


class CAPESConnector(BaseConnector):
    """Connector para a Plataforma Sucupira e Dados Abertos CAPES"""
    
    def __init__(self):
        super().__init__()
        # Portal de Dados Abertos da CAPES
        self.base_url = "https://dadosabertos.capes.gov.br/api"
        self.timeout = 30.0
    
    async def search_scholarships(self, term: str) -> Dict[str, Any]:
        """
        Busca bolsas relacionadas ao termo de pesquisa
        
        Args:
            term: Termo de busca
            
        Returns:
            Dict com bolsas encontradas
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Busca em programas de pós-graduação
                programs = await self._search_graduate_programs(client, term)
                
                # Busca bolsas vigentes
                scholarships = await self._search_active_scholarships(client, term)
                
                return {
                    "source": "CAPES",
                    "graduate_programs": programs,
                    "scholarships": scholarships,
                    "total_programs": len(programs),
                    "total_scholarships": len(scholarships)
                }
        except Exception as e:
            return self._handle_error(e, "CAPES")
    
    async def _search_graduate_programs(self, client: httpx.AsyncClient, term: str) -> List[Dict]:
        """Busca programas de pós-graduação relacionados"""
        try:
            # Endpoint fictício - adaptar conforme API real da CAPES
            response = await client.get(
                f"{self.base_url}/programas",
                params={"nome": term, "limit": 20}
            )
            
            if response.status_code == 200:
                data = response.json()
                return self._parse_programs(data)
            return []
        except Exception:
            return []
    
    async def _search_active_scholarships(self, client: httpx.AsyncClient, term: str) -> List[Dict]:
        """Busca bolsas ativas relacionadas ao tema"""
        try:
            # Endpoint fictício - adaptar conforme API real
            response = await client.get(
                f"{self.base_url}/bolsas",
                params={"area": term, "status": "ativa"}
            )
            
            if response.status_code == 200:
                data = response.json()
                return self._parse_scholarships(data)
            return []
        except Exception:
            return []
    
    def _parse_programs(self, data: Any) -> List[Dict]:
        """Parse dos dados de programas"""
        programs = []
        
        if isinstance(data, list):
            for item in data[:20]:
                programs.append({
                    "name": item.get("nome_programa"),
                    "institution": item.get("instituicao"),
                    "level": item.get("nivel"),  # Mestrado/Doutorado
                    "area": item.get("area_avaliacao"),
                    "grade": item.get("nota"),
                    "scholarships_available": item.get("bolsas_disponiveis", 0)
                })
        
        return programs
    
    def _parse_scholarships(self, data: Any) -> List[Dict]:
        """Parse dos dados de bolsas"""
        scholarships = []
        
        if isinstance(data, list):
            for item in data[:30]:
                scholarships.append({
                    "type": item.get("modalidade"),  # Mestrado, Doutorado, Pós-doc
                    "institution": item.get("instituicao"),
                    "program": item.get("programa"),
                    "area": item.get("area_conhecimento"),
                    "duration_months": item.get("duracao_meses"),
                    "value_monthly": item.get("valor_mensal"),
                    "country": "Brasil"
                })
        
        return scholarships
