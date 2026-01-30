"""
GitHub Connector
Busca projetos open source relacionados ao tema de pesquisa
"""

import httpx
from typing import Dict, List, Any
from .base import BaseConnector


class GitHubConnector(BaseConnector):
    """Connector para GitHub API - projetos relacionados"""
    
    def __init__(self):
        super().__init__()
        self.base_url = "https://api.github.com"
        self.timeout = 30.0
    
    async def search_projects(self, term: str) -> Dict[str, Any]:
        """
        Busca repositórios GitHub relacionados ao termo
        
        Args:
            term: Termo de busca
            
        Returns:
            Dict com repositórios encontrados
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                headers = {
                    "Accept": "application/vnd.github.v3+json",
                    "User-Agent": "Motor4P-UFPR"
                }
                
                # Busca repositórios
                response = await client.get(
                    f"{self.base_url}/search/repositories",
                    params={
                        "q": f"{term} language:python stars:>10",
                        "sort": "stars",
                        "order": "desc",
                        "per_page": 20
                    },
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    projects = self._parse_repositories(data.get("items", []))
                    
                    return {
                        "source": "GitHub",
                        "projects": projects,
                        "total": data.get("total_count", 0),
                        "showing": len(projects)
                    }
                
                return {"source": "GitHub", "projects": [], "total": 0}
                
        except Exception as e:
            return self._handle_error(e, "GitHub")
    
    def _parse_repositories(self, items: List[Dict]) -> List[Dict]:
        """Parse dos dados de repositórios"""
        projects = []
        
        for repo in items:
            projects.append({
                "name": repo.get("name"),
                "full_name": repo.get("full_name"),
                "description": repo.get("description", "")[:200],
                "language": repo.get("language"),
                "stars": repo.get("stargazers_count", 0),
                "forks": repo.get("forks_count", 0),
                "open_issues": repo.get("open_issues_count", 0),
                "created_at": repo.get("created_at"),
                "updated_at": repo.get("updated_at"),
                "url": repo.get("html_url"),
                "topics": repo.get("topics", [])[:5],
                "license": repo.get("license", {}).get("name") if repo.get("license") else None
            })
        
        return projects
