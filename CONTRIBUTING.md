# Contribuindo com o Motor da Inovação

Obrigado pelo interesse! Este é um projeto **100% open source**, artefato de uma
tese de doutorado em Políticas Públicas na UFPR. Contribuições de código,
conectores de dados, documentação e crítica metodológica são bem-vindas.

## 1. Setup local

### Backend (Python / FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python run.py                 # http://localhost:8000/docs
```

### Frontend (React / TypeScript)

```bash
npm install
cp .env.example .env
npm run dev                   # http://localhost:5173
```

### Edge Functions (Supabase CLI)

```bash
npm install -g supabase       # ou: brew install supabase/tap/supabase
supabase login
supabase link --project-ref <ref-do-projeto>

# rodar as funções localmente
supabase functions serve layer-knowledge --env-file supabase/.env.local

# testar
curl -X POST http://localhost:54321/functions/v1/layer-knowledge \
  -H "Content-Type: application/json" \
  -d '{"query":"reologia"}'

# publicar (requer permissão no projeto)
supabase functions deploy layer-knowledge
```

Cada função vive em `supabase/functions/<nome>/index.ts` e deve ser autocontida
(sem estado compartilhado entre funções).

## 2. Convenção de commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(layer-patents): adiciona filtro por IPC brasileiro
fix(ontology): corrige CNAE de cosméticos
docs(readme): documenta setup do Supabase CLI
refactor(empresa): simplifica seção "Vale entrar?"
chore(deps): atualiza httpx
```

Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`.
Escopo: nome da camada, função ou persona afetada. Mensagens em português.

## 3. Propondo um novo conector de dados

Todo conector Python herda de `BaseConnector` (`backend/app/connectors/base.py`),
que já resolve cache TTL, retry exponencial e limite de concorrência.
Use `backend/app/connectors/ipeadata.py` como referência.

Estrutura mínima:

```python
"""
MOTOR 4P UFPR - <Nome> Connector
Conector para <fonte>

Documentação: <url da documentação oficial>
"""
import logging
from typing import List, Dict, Any

from .base import BaseConnector

logger = logging.getLogger(__name__)

MINHA_FONTE_BASE = "https://api.exemplo.gov.br/v1"


class MinhaFonteConnector(BaseConnector):
    """Conector para <fonte> — <que dado oferece>"""

    def __init__(self):
        super().__init__()
        self.base_url = MINHA_FONTE_BASE

    def get_source_name(self) -> str:
        return "Minha Fonte"

    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        logger.info(f"MinhaFonte search: {query}")
        try:
            data = await self.get(
                f"{self.base_url}/recurso",
                params={"q": query},
                use_cache=True,
            )
            return [self._normalize(item) for item in data.get("results", [])]
        except Exception as e:
            logger.error(f"MinhaFonte error: {e}")
            return []
```

Checklist do novo conector:

- [ ] Arquivo em `backend/app/connectors/<fonte>.py`, exportado em `__init__.py`
- [ ] Fonte **pública e gratuita**; sem scraping de área logada
- [ ] Nenhum dado simulado — em caso de falha, retornar vazio e registrar o erro
- [ ] Saída normalizada e documentada (campos, unidades, período)
- [ ] Chave de API, se houver, apenas via variável de ambiente e listada no `.env.example`
- [ ] Indicar a qual camada (`layer-*`) e persona o dado serve

Para conectores consumidos diretamente pela interface, o equivalente é uma edge
function em `supabase/functions/layer-<fonte>/index.ts`.

## 4. Abrindo um Pull Request

1. Faça um fork e crie um branch: `git checkout -b feat/nome-curto`.
2. Rode `npm run build` (frontend) e valide o backend/função alterada.
3. Commit seguindo a convenção acima.
4. Abra o PR preenchendo o template, explicando **o que muda, por quê e como testar**.
5. PRs que adicionem fontes de dados devem citar a documentação oficial da API.

Discussões metodológicas (definição de indicadores, escolhas de classificação)
podem ser abertas como issue antes do código.
