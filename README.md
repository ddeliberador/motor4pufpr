# MOTOR 4P UFPR — Motor da Inovação

> A Camada Ausente da Política Industrial Brasileira

Infraestrutura computacional para conectar **P**esquisa, **P**rodução, **P**olítica e **P**atentes no sistema de inovação brasileiro.

## Sobre o Projeto

O MOTOR 4P UFPR é uma proposta de infraestrutura computacional pública que, dado um objeto tecnológico, constrói automaticamente sua trajetória no sistema de inovação, identificando:

- **Incidência Científica**: Grupos de pesquisa, artigos, instituições
- **Incidência Tecnológica**: Patentes nacionais e internacionais
- **Incidência Produtiva**: Dados de comércio exterior (importação/exportação)
- **Incidência Institucional**: Instrumentos públicos de fomento disponíveis
- **Indicadores Estruturais**: C2T, GT, P2C, CD, ILT

### Indicadores Propostos

| Código | Nome | Descrição |
|--------|------|-----------|
| **C2T** | Maturidade Ciência → Tecnologia | Mede conversão de produção científica em outputs tecnológicos |
| **GT** | Gargalo de Tradução | Identifica obstáculos na cadeia de tradução tecnológica |
| **P2C** | Aderência Política → Capacidade | Avalia alinhamento entre políticas e capacidade instalada |
| **CD** | Concentração e Dependência | Mede dependência de tecnologia e insumos externos |
| **ILT** | Índice de Lacuna de Tradução | Índice composto da situação de tradução tecnológica |

## Arquitetura

O sistema é composto por três camadas. Detalhamento completo em [ARCHITECTURE.md](ARCHITECTURE.md).

### 1. Backend Python / FastAPI (Railway)

Motor analítico do projeto:

- **Motor ontológico** (`backend/app/services/ontology_engine.py`): traduz um termo livre em códigos oficiais — CNAE, NCM, IPC e áreas CNPq — com dicionário de sinônimos e expansão multilíngue.
- **Indicadores estruturais**: cálculo metodológico de C2T, GT, P2C, CD e ILT.
- **Conectores** (`backend/app/connectors/`): ~30 conectores para APIs públicas, todos herdando de `BaseConnector` (cache, retry, concorrência controlada).

### 2. Edge Functions (Supabase)

Camadas de dados em Deno/TypeScript, executadas em paralelo pelo orquestrador `motor-search`:

| Função | Papel |
|---|---|
| `motor-search` | Orquestrador: dispara as camadas, agrega e calcula os índices |
| `layer-knowledge` | OpenAlex — artigos, instituições, conceitos |
| `layer-technology` | TRL, emprego (CAGED/IPEAData), GitHub |
| `layer-policy` | Portal da Transparência, PNCP, emendas, orçamento |
| `layer-policies` | Lei do Bem, Lei da Informática, FAPs, ecossistema |
| `layer-programs` | Missões NIB/PBIA, dados.gov.br, SIDRA |
| `layer-patents` | EPO OPS e soberania tecnológica |
| `layer-sidra` | SIDRA/IBGE — PIB, PINTEC |
| `layer-cnpq` | Bolsas e fomento CNPq |
| `layer-international` | Comparações internacionais |
| `layer-oportunidades` | Editais e chamadas com verba aberta |
| `competitor-search` | Empresas e referências nacionais e globais |
| `ict-search` | ICTs nacionais |
| `enrichment-search`, `market-analysis`, `motor-analysis`, `policy-simulator`, `research-agent`, `research-gaps`, `smart-insights` | Análises derivadas e apoio de IA |

### 3. Frontend React / TypeScript

Uma leitura dos mesmos dados para cada persona:

- **Pesquisador** — `src/components/pesquisador/`
- **Empresa** — `src/components/empresa/`
- **Governo** — `src/components/governo/`
- **Universidade / ICT** — `src/components/universidade/`
- Seleção de persona, localização e CNAE em `src/components/mvp/`

### Fluxo de uma busca

```text
Frontend (persona + termo + localização)
   → motor-search (edge function)
       → tradução ontológica (backend Python)
       → layer-* em paralelo
       → agregação e cálculo dos índices
   → resposta única JSON → painel da persona
```

## Estrutura do Projeto

```
MOTOR 4P UFPR/
├── backend/                    # API FastAPI (Python)
│   ├── app/
│   │   ├── api/routes/        # Endpoints REST
│   │   ├── connectors/        # Conectores de APIs públicas
│   │   ├── core/              # Configurações
│   │   ├── models/            # Schemas Pydantic
│   │   ├── services/          # Motores (ontologia, incidência, indicadores)
│   │   └── main.py            # Ponto de entrada
│   ├── requirements.txt
│   └── run.py
│
├── supabase/functions/         # Edge Functions (Deno/TypeScript)
│   ├── motor-search/          # Orquestrador
│   └── layer-*/               # Camadas de dados
│
├── src/                        # Frontend React (TypeScript)
│   ├── components/            # Componentes React (por persona)
│   ├── hooks/                 # Hooks customizados
│   ├── lib/                   # Utilitários e API client
│   ├── pages/                 # Páginas da aplicação
│   └── App.tsx
│
└── README.md
```

## Fontes de Dados

| Fonte | API | O que oferece |
|-------|-----|---------------|
| CNPq | Dados Abertos | Grupos de pesquisa, bolsas |
| INPI | API Patentes | Patentes brasileiras |
| OpenAlex | REST API | 240M+ artigos científicos |
| COMEX Stat | REST API | Importação/exportação por NCM |
| BNDES | CKAN API | Financiamentos aprovados |
| IBGE | REST API | Classificações CNAE |

## Como Executar

### Pré-requisitos

- Python 3.11+
- Node.js 18+
- npm ou yarn
- Supabase CLI (para as edge functions)

### Backend (FastAPI)

```bash
# Entre na pasta do backend
cd backend

# Crie ambiente virtual
python -m venv venv

# Ative o ambiente virtual
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Instale dependências
pip install -r requirements.txt

# Copie e configure variáveis de ambiente
cp .env.example .env

# Execute o servidor
python run.py
# ou
uvicorn app.main:app --reload --port 8000
```

O backend estará disponível em: http://localhost:8000

- Documentação Swagger: http://localhost:8000/docs
- Documentação ReDoc: http://localhost:8000/redoc

### Frontend (React)

```bash
# Na pasta raiz do projeto
npm install

# Copie e configure variáveis de ambiente
cp .env.example .env

# Execute o servidor de desenvolvimento
npm run dev
```

O frontend estará disponível em: http://localhost:5173

### Edge Functions (Supabase CLI)

```bash
# Instale a CLI
npm install -g supabase
# ou: brew install supabase/tap/supabase

supabase login
supabase link --project-ref <ref-do-projeto>

# Execute uma função localmente
supabase functions serve layer-knowledge --env-file supabase/.env.local

# Teste
curl -X POST http://localhost:54321/functions/v1/layer-knowledge \
  -H "Content-Type: application/json" \
  -d '{"query":"reologia"}'

# Publique (requer permissão no projeto)
supabase functions deploy layer-knowledge
```

Cada função é autocontida em `supabase/functions/<nome>/index.ts`.

## Endpoints da API

### Principais

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/v1/health` | Health check |
| GET/POST | `/api/v1/incidence/search` | Busca incidência completa |
| GET | `/api/v1/incidence/ontology` | Apenas tradução ontológica |
| GET | `/api/v1/incidence/examples` | Exemplos de busca |
| GET | `/api/v1/incidence/indicators/methodology` | Metodologia dos indicadores |

### Exemplo de Uso

```bash
# Busca incidência para "baterias de sódio"
curl "http://localhost:8000/api/v1/incidence/search?query=baterias%20de%20s%C3%B3dio"

# Apenas tradução ontológica
curl "http://localhost:8000/api/v1/incidence/ontology?query=inteligencia%20artificial"
```

## Tecnologias

### Backend
- FastAPI
- Pydantic
- httpx (async HTTP)
- Python 3.11+

### Edge Functions
- Deno / TypeScript
- Supabase Functions

### Frontend
- React 18
- TypeScript
- Vite
- TailwindCSS
- Shadcn/ui
- Framer Motion

## Compromisso Open Source

O Motor da Inovação é um projeto 100% open source, desenvolvido como parte de uma tese de doutorado em Políticas Públicas na UFPR. Toda a infraestrutura — frontend, backend, conectores de dados e modelos analíticos — é pública e auditável.

Veja também: [CONTRIBUTING.md](CONTRIBUTING.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) · [SECURITY.md](SECURITY.md)

## Autores

- **Decio Dalton Deliberador Filho** - Doutorando
- **Walter Tadahiro Shima** - Orientador

Doutorado em Políticas Públicas - Universidade Federal do Paraná (UFPR)

## Como citar

Consulte o arquivo [CITATION.cff](CITATION.cff) — o GitHub gera automaticamente a citação em APA/BibTeX a partir dele.

## Licença

Distribuído sob a **Licença MIT**. Veja o arquivo [LICENSE](LICENSE) para o texto completo.

Copyright (c) 2026 Decio Dalton Deliberador Filho.
