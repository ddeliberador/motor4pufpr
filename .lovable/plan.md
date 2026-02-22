

# MOTOR 4P v2 — Fase 1: Interface por Personas

## Resumo

Reestruturar a home do Motor 4P para iniciar com a pergunta "Qual e o seu papel no Sistema de Inovacao?" e criar dashboards dedicados por persona. Cada persona tera linguagem, KPIs, recomendacoes e IA contextual adaptados ao seu perfil.

## O que muda para o usuario

1. **Nova Home** com 4 botoes grandes de persona (Pesquisador, Universidade, Empresario, Governo)
2. **Dashboards dedicados** com KPIs e linguagem especificos por perfil
3. **IA contextual** com prompts diferentes para cada persona
4. **PDFs personalizados** com titulo e foco por perfil

## Arquitetura de Navegacao

```text
/                    -> Nova Home (selecao de persona)
/pesquisador         -> Dashboard Pesquisador (atual MVP refatorado)
/universidade        -> Dashboard Universidade
/empresa             -> Dashboard Empresarial
/governo             -> Dashboard Governamental
/camada-ausente      -> Pagina conceitual (atual home movida)
```

## Implementacao Detalhada

### 1. Nova Home — `src/pages/Index.tsx`

Substituir pagina em branco por tela de selecao de persona:
- Header do Motor 4P
- Titulo: "Qual e o seu papel no Sistema de Inovacao?"
- 4 cards grandes clicaveis com icone, titulo, subtitulo e exemplos de perguntas
- Cada card navega para `/pesquisador`, `/universidade`, `/empresa` ou `/governo`
- Link secundario para "Conhecer o conceito" -> `/camada-ausente`

### 2. Tipo de Persona — `src/types/persona.ts`

Criar tipo compartilhado:
```text
type Persona = "pesquisador" | "universidade" | "empresa" | "governo"
```

Com configuracoes de:
- Label e icone
- KPIs prioritarios
- Prompt de IA customizado
- Perguntas estrategicas exibidas no topo
- Titulo do PDF

### 3. Configuracao por Persona — `src/config/personas.ts`

Arquivo com todas as diferencas entre personas:

**Pesquisador:**
- Pergunta: "Onde ha bolsas? Quem pesquisa isso?"
- KPIs: Grupos ativos, Bolsas abertas, Patentes recentes, Tendencia global
- IA: "Gerar Estrategia de Pesquisa" (fontes, parceiros, gaps)
- Secoes prioritarias: Cientifica, Bolsas, Internacional

**Universidade:**
- Pergunta: "Onde estamos posicionados? Estamos captando recursos?"
- KPIs: Ranking por area, Captacao, Patentes por depto, Parcerias
- IA: "Gerar Estrategia Institucional" (investimento, parcerias)
- Secoes prioritarias: Cientifica, Institucional, Internacional

**Empresario:**
- Pergunta: "Qual maturidade? Quem lidera? Qual financiamento?"
- KPIs: TRL estimado, Empresas atuantes, Linhas abertas, Patentes
- IA: "Gerar Inteligencia Competitiva" (riscos, maturidade, lideres)
- Secoes prioritarias: Tecnologica, Empresas, Institucional

**Governo:**
- Pergunta: "Onde investir? Qual regiao esta atrasada?"
- KPIs: Incidencia por estado, Financiamento, Dependencia externa
- IA: "Gerar Diagnostico de Politica Publica" (lacunas, impacto)
- Secoes prioritarias: Todas com foco em distribuicao regional

### 4. Dashboard Unificado — `src/pages/PersonaDashboard.tsx`

Componente unico que recebe a persona como parametro de rota e adapta:
- Barra lateral com pergunta estrategica no topo
- Ordem e destaque das secoes de resultados
- Botao de IA com label e prompt customizado
- Secoes opcionais por persona (ex: Bolsas so aparece destacado para Pesquisador)

Reutiliza toda a logica existente do MvpEngine (hooks, API, componentes), apenas reorganizando a apresentacao.

### 5. Edge Function Atualizada — `supabase/functions/research-agent/index.ts`

Adicionar campo `persona` no payload e ajustar o system prompt:
- Pesquisador: foco em estrategia de pesquisa, fontes, parceiros
- Universidade: foco em posicionamento institucional, captacao
- Empresa: foco em maturidade tecnologica, concorrencia, financiamento
- Governo: foco em lacunas regionais, impacto, dependencia

### 6. Rotas — `src/App.tsx`

```text
/                   -> Index (selecao de persona)
/pesquisador        -> PersonaDashboard (persona="pesquisador")
/universidade       -> PersonaDashboard (persona="universidade")
/empresa            -> PersonaDashboard (persona="empresa")
/governo            -> PersonaDashboard (persona="governo")
/camada-ausente     -> CamadaAusente (pagina conceitual existente)
/mvp                -> Redirect para /pesquisador (retrocompatibilidade)
```

### 7. Componentes Novos

- `src/components/mvp/PersonaSelector.tsx` — Cards de selecao na home
- `src/components/mvp/StrategicQuestion.tsx` — Pergunta estrategica no topo dos resultados
- `src/config/personas.ts` — Configuracoes por persona

### 8. Componentes Reutilizados (sem alteracao)

- Sidebar (recebe config de persona para label do botao IA)
- StatCard, IndicatorsCard, NetworkGraph, NodeDetailPanel
- AIAnalysisPanel (recebe prompt customizado)
- CnaeSelectionModal

### 9. Arquivos Modificados

- `src/App.tsx` — novas rotas
- `src/pages/Index.tsx` — nova home com selecao de persona
- `src/pages/MvpEngine.tsx` — refatorado para `PersonaDashboard.tsx`
- `src/components/mvp/AIAnalysisPanel.tsx` — aceitar label e persona customizados
- `src/components/mvp/Sidebar.tsx` — aceitar config de persona
- `supabase/functions/research-agent/index.ts` — prompt por persona
- `src/components/mvp/index.ts` — exportar novos componentes

## Fora do escopo (Fases 2 e 3)

- **Fase 2**: Motor de Recomendacao (match automatico entre camadas) — requer backend adicional
- **Fase 3**: Simulacao Estrategica (modelagem preditiva) — requer modelos de dados novos
- Score TRL estimado — requer algoritmo dedicado no backend
- Simulador de Politica Publica — requer modelagem economica

Essas fases serao implementadas em iteracoes futuras apos a Fase 1 estar validada.

