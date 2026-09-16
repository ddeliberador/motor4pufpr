"""Issue #17 — /incidence/search sempre devolvia success:false.

Duas causas, ambas cobertas aqui:
1. IncidenceResult sem os campos scholarships/education/github_projects
   (corrigido em 974cd9d);
2. GitHubConnector, INEPConnector e InternationalScholarshipsConnector sem
   os métodos abstratos de BaseConnector — não instanciavam, e o except do
   engine engolia o erro devolvendo vazio.
"""
import httpx
import pytest
from fastapi.testclient import TestClient

from app.connectors.base import BaseConnector
from app.connectors.capes import CAPESConnector
from app.connectors.github import GitHubConnector
from app.connectors.inep import INEPConnector
from app.connectors.scholarships import InternationalScholarshipsConnector
from app.main import app
from tests.conftest import API_KEY

REPOSITORIO = {
    "name": "h2-electrolyzer",
    "full_name": "exemplo/h2-electrolyzer",
    "description": "Simulador de eletrolisador PEM",
    "language": "Python",
    "stargazers_count": 42,
    "forks_count": 7,
    "open_issues_count": 1,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z",
    "html_url": "https://github.com/exemplo/h2-electrolyzer",
    "topics": ["hydrogen"],
    "license": {"name": "MIT"},
}


def responde_github(request: httpx.Request):
    if request.url.host == "api.github.com" and request.url.path == "/search/repositories":
        return httpx.Response(200, json={"total_count": 1, "items": [REPOSITORIO]})
    return None


@pytest.mark.parametrize(
    "conector, fonte",
    [
        (GitHubConnector, "GitHub"),
        (INEPConnector, "INEP"),
        (InternationalScholarshipsConnector, "International Scholarships"),
        (CAPESConnector, "CAPES"),
    ],
)
def test_conectores_instanciam_e_nomeiam_a_fonte(conector, fonte):
    instancia = conector()
    assert isinstance(instancia, BaseConnector)
    assert instancia.get_source_name() == fonte


def test_handle_error_devolve_dict_com_a_fonte():
    # capes/github/inep/scholarships chamam isto no except; antes não existia
    resultado = GitHubConnector()._handle_error(RuntimeError("fonte fora do ar"), "GitHub")
    assert resultado["source"] == "GitHub"
    assert "fonte fora do ar" in resultado["error"]


@pytest.mark.anyio
async def test_search_do_github_usa_a_busca_de_repositorios(sem_rede):
    sem_rede.append(responde_github)
    projetos = await GitHubConnector().search("hidrogenio verde")
    assert [p["full_name"] for p in projetos] == ["exemplo/h2-electrolyzer"]


def test_incidence_search_responde_success_true(sem_rede):
    sem_rede.append(responde_github)
    cliente = TestClient(app)

    resposta = cliente.get(
        "/api/v1/incidence/search",
        params={"query": "hidrogenio verde", "limit": 3},
        headers={"X-API-Key": API_KEY},
    )

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["success"] is True, corpo.get("error")
    dados = corpo["data"]
    assert dados["query"] == "hidrogenio verde"
    # os três blocos que a issue #17 apontava como sempre vazios
    assert dados["github_projects"]["total"] == 1
    assert dados["github_projects"]["projects"][0]["full_name"] == "exemplo/h2-electrolyzer"
    assert dados["stats"]["github_projects"] == 1
    assert "institutions" in dados["education"]
    assert "international" in dados["scholarships"]


def test_incidence_search_exige_api_key(sem_rede):
    resposta = TestClient(app).get("/api/v1/incidence/search", params={"query": "hidrogenio verde"})
    assert resposta.status_code == 401
