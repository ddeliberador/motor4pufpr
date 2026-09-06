# Arquitetura — Motor da Inovação (Motor 4P UFPR)

O sistema é composto por **três camadas independentes e auditáveis**.

## 1. Backend Python / FastAPI (Railway)

Responsável pela **inteligência analítica**: tradução ontológica e cálculo de indicadores.

- `backend/app/services/ontology_engine.py` — traduz um termo livre (ex.: "reologia",
  "baterias de sódio") em códigos oficiais: **CNAE** (atividade econômica), **NCM**
  (comércio exterior), **IPC** (patentes) e **áreas CNPq** (classificação científica).
  Inclui dicionário de sinônimos e expansão multilíngue.
- `backend/app/services/` — motores de incidência e cálculo dos indicadores
  estruturais (C2T, GT, P2C, CD, ILT).
- `backend/app/connectors/` — ~30 conectores Python para APIs públicas
  (OpenAlex, IBGE, IPEAData, COMEX, PNCP, CNPq, TSE, DATASUS, TCU, etc.),
  todos herdando de `BaseConnector` (cache TTL, retry exponencial, concorrência limitada).
- `backend/app/api/routes/` — endpoints REST (`/api/v1/incidence/search`,
  `/api/v1/incidence/ontology`, ...).

## 2. Edge Functions (Supabase / Lovable Cloud)

Responsáveis pela **coleta paralela de dados** em tempo real. Cada função é um
conector isolado, em Deno/TypeScript, que consulta bases públicas e devolve um
recorte normalizado.

| Função | Papel |
|---|---|
| `motor-search` | Orquestrador: chama as camadas em paralelo, agrega e calcula índices |
| `layer-knowledge` | OpenAlex — produção científica, instituições, conceitos |
| `layer-technology` | TRL, emprego (CAGED/IPEAData), GitHub, capacidades técnicas |
| `layer-policy` | Portal da Transparência, PNCP, emendas, execução orçamentária |
| `layer-policies` | Lei do Bem, Lei da Informática, FAPs, ecossistema de incentivos |
| `layer-programs` | Missões NIB/PBIA, dados.gov.br, SIDRA |
| `layer-patents` | EPO OPS e soberania tecnológica em patentes |
| `layer-sidra` | SIDRA/IBGE — PIB, PINTEC, produção industrial |
| `layer-cnpq` | Bolsas e fomento CNPq por instituição |
| `layer-international` | Comparações internacionais |
| `layer-oportunidades` | Mural de editais e chamadas com verba aberta |
| `competitor-search` | Empresas e referências nacionais/globais |
| `ict-search` | ICTs nacionais (institutos e universidades) |
| `enrichment-search`, `market-analysis`, `motor-analysis`, `policy-simulator`, `research-agent`, `research-gaps`, `smart-insights` | Análises derivadas e apoio de IA |

## 3. Frontend React / TypeScript

Interface por **persona**, cada uma com leitura própria dos mesmos dados:

- `src/components/pesquisador/` — Pesquisador
- `src/components/empresa/` — Empresa
- `src/components/governo/` — Governo
- `src/components/universidade/` — Universidade / ICT
- `src/components/mvp/` — seleção de persona, localização (UF/município) e CNAE
- `src/components/shared/`, `src/components/ui/` — componentes comuns e design system

## Fluxo de uma busca

```text
Usuário (frontend, persona + termo + localização)
        │
        ▼
supabase/functions/motor-search  (orquestrador)
        │  busca o mapeamento ontológico no backend Python (Railway)
        │  → CNAE / NCM / IPC / áreas CNPq + termos expandidos
        │
        ├──► layer-knowledge    ┐
        ├──► layer-technology   │
        ├──► layer-policy       │  execução em paralelo
        ├──► layer-programs     │  (Promise.all, com timeouts)
        ├──► layer-patents      │
        └──► layer-* demais     ┘
        │
        ▼
Agregação: normalização, entity resolution, cálculo de índices
(GT, CD, AUE, EI / C2T, P2C, ILT) + geração de oportunidades
        │
        ▼
Resposta única JSON → painéis da persona escolhida
```

## Onde fica cada tipo de lógica

- **Semântica e classificação oficial** (o que o termo significa em CNAE/NCM/IPC/CNPq):
  `backend/app/services/ontology_engine.py`.
- **Cálculo metodológico dos indicadores estruturais**: serviços do backend Python;
  os índices de tela derivados em tempo real ficam no `motor-search`.
- **Acesso a cada fonte de dados**: um conector por fonte — em Python
  (`backend/app/connectors/*.py`) quando usado pelo motor analítico, ou em
  Edge Function (`supabase/functions/layer-*`) quando consumido diretamente pela interface.
- **Apresentação e linguagem por público**: exclusivamente no frontend, por persona.

Princípio: **nenhuma regra de tradução ontológica dentro das edge functions** e
**nenhum cálculo de indicador dentro dos componentes React**.
