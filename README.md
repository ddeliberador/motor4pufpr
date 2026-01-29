# MOTOR 4P UFPR

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
├── src/                        # Frontend React (TypeScript)
│   ├── components/            # Componentes React
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

### Frontend
- React 18
- TypeScript
- Vite
- TailwindCSS
- Shadcn/ui
- Framer Motion

## Autores

- **Decio Dalton Deliberador Filho** - Doutorando
- **Walter Tadahiro Shima** - Orientador

Doutorado em Políticas Públicas - Universidade Federal do Paraná (UFPR)

## Licença

Este projeto é desenvolvido como parte de pesquisa acadêmica na UFPR.
