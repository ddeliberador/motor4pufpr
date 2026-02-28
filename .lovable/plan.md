

# Motor 4P -- Reestruturação em 4 Camadas Analíticas

## Visao Geral

Migrar o sistema de um unico agregador flat (`motor-search`) para uma arquitetura de **4 camadas analiticas** com calculo de indices cruzados e entrega prescritiva por persona. Cada camada tera sua propria edge function, um orquestrador central e os paineis de persona serao redesenhados para seguir fluxos especificos com entregas concretas.

---

## Fase 1 -- Edge Functions por Camada

Criar 4 novas edge functions especializadas, cada uma responsavel por uma camada analitica:

### 1.1 `layer-knowledge` (Camada 1 -- Producao de Conhecimento)
- **Fontes**: OpenAlex (papers, coautoria, instituicoes), CAPES (datasets de bolsas/programas), dados.gov.br filtrado por INEP
- **Variaveis estruturadas**: Papers por ano, citacoes, instituicoes BR, especializacao tematica (concepts OpenAlex), coautoria internacional, datasets de pos-graduacao
- **Outputs calculados**:
  - Densidade cientifica = papers / paises atuantes
  - Concentracao institucional = HHI das top 10 instituicoes
  - Indice de especializacao tematica = distribuicao de concepts

### 1.2 `layer-technology` (Camada 2 -- Tecnologia)
- **Fontes**: GitHub (repos, stars, forks, linguagens), dados.gov.br filtrado por INPI (patentes), dados.gov.br filtrado por RAIS/MTE (emprego formal por CNAE)
- **Variaveis**: Repos por linguagem, stars agregadas, datasets de patentes por IPC, datasets de emprego no setor
- **Outputs calculados**:
  - Densidade tecnologica = repos + datasets patente
  - Maturidade tecnologica estimada (TRL proxy baseado em sinais: papers alto + repos alto + contratos = TRL 5-6; papers alto + repos baixo = TRL 2-3)
  - Indice Ciencia-para-Patente = papers / datasets_patente

### 1.3 `layer-policy` (Camada 3 -- Instrumentos de Politica)
- **Fontes**: PNCP (licitacoes), Portal da Transparencia (convenios, sancoes), SICONFI/Tesouro (execucao orcamentaria), Querido Diario (diarios oficiais), dados.gov.br filtrado por BNDES/FNDCT/Finep
- **Variaveis**: Volume de compras publicas (valor + qtd), convenios federais, sancoes, execucao orcamentaria UF, mencoes em diarios oficiais
- **Outputs calculados**:
  - Intensidade instrumental = (contratos + convenios) / papers
  - Capacidade fiscal setorial = valor total por UF
  - Efetividade do gasto = valor instrumental / output cientifico

### 1.4 `layer-international` (Camada 4 -- Insercao Internacional)
- **Fontes**: OpenAlex (coautoria internacional, distribuicao por pais), dados.gov.br filtrado por COMEX/MDIC (exportacao/importacao), BCB (cambio, credito PJ)
- **Variaveis**: Papers por pais, share BR vs global, datasets de balanca comercial por NCM, indicadores macro
- **Outputs calculados**:
  - Indice de Dependencia Externa = % producao estrangeira
  - Competitividade internacional = share BR em top 10
  - Insercao global = paises com coautoria / total paises

### 1.5 `motor-search` (Orquestrador -- refatorar)
- Chama as 4 camadas em paralelo
- Recebe os outputs estruturados de cada camada
- Calcula os **indices cruzados** (GT, CD, AUE, EI) usando dados de MULTIPLAS camadas
- Retorna o resultado unificado com a nova estrutura

---

## Fase 2 -- Indices Cruzados (Cross-Layer)

Refatorar os indices para cruzar camadas explicitamente:

| Indice | Formula | Camadas Cruzadas |
|--------|---------|-----------------|
| GT (Gap Tecnologico) | knowledge.papers / (policy.contracts + technology.repos) | 1 x 2 x 3 |
| CD (Dependencia Comercial) | international.foreign_share | 4 (com contexto de 1) |
| AUE (Alinhamento U-E) | instituicoes_em_papers AND em_contratos / total_instituicoes | 1 x 3 |
| EI (Efetividade Instrumental) | policy.valor_total / knowledge.papers | 3 x 1 |

Cada indice sera retornado com: `value`, `label`, `description`, `formula`, `layers_used`, `alert_level` (normal/warning/critical).

---

## Fase 3 -- Entrega por Persona (UI)

Reestruturar cada painel para seguir o fluxo prescrito com entregas concretas:

### 3.1 Pesquisador (`PesquisadorPanel.tsx`)
**Fluxo de tabs**:
1. Estrutura Cientifica (Camada 1) -- papers, instituicoes, saturacao
2. Tecnologia Associada (Camada 2) -- repos, TRL, patentes
3. Instrumentos Disponiveis (Camada 3) -- PNCP, convenios, bolsas
4. Lacunas Estruturais (cruzamento) -- gaps detectados por indices
5. Prescricao IA -- gera 3 agendas, 3 parceiros, 3 fontes de financiamento

### 3.2 Universidade (`UniversidadePanel.tsx`)
**Fluxo de tabs**:
1. Posicionamento Cientifico (Camada 1) -- ranking, share, especializacao
2. Conversao Ciencia-Tecnologia (Camada 1 x 2) -- indice de conversao
3. Insercao Internacional (Camada 4) -- coautoria, competitividade
4. Diagnostico Institucional (cruzamento geral)
5. Prescricao IA -- indice de conversao estrutural, areas fortes/frageis, 3 parcerias

### 3.3 Empresa (`EmpresaPanel.tsx`)
**Fluxo de tabs**:
1. Estado da Arte Cientifico (Camada 1) -- mapa do campo
2. Estado Tecnologico (Camada 2) -- TRL, repos, patentes
3. Instrumentos de Apoio (Camada 3) -- PNCP, convenios, subvencoes
4. Risco e Oportunidade (Camada 4 + indices) -- dependencia, competitividade
5. Prescricao IA -- 3 parceiros academicos, 3 instrumentos, diagnostico de dependencia

### 3.4 Governo (`GovernoPanel.tsx`)
**Fluxo de tabs**:
1. Estrutura Sistemica (todas as camadas) -- visao consolidada
2. Dependencia Externa (Camada 4) -- mapa de dependencia
3. Efetividade Instrumental (Camada 3 x 1) -- gasto vs output
4. Mapa Relacional (grafo de nos e arestas)
5. Prescricao IA -- investir/reestruturar/criar/reduzir, setores criticos, alavancas

---

## Fase 4 -- Motor de Analise IA (Refatorar `motor-analysis`)

Atualizar o prompt da IA para:
- Receber dados **por camada** (nao flat)
- Gerar entregas concretas por persona (3 agendas, 3 parceiros, etc.)
- Referenciar indices cruzados explicitamente
- Cada prescricao deve indicar **qual camada** sustenta a recomendacao

---

## Detalhamento Tecnico

### Estrutura de dados retornada pelo orquestrador:

```text
{
  query: string,
  layers: {
    knowledge: { papers, institutions, international, concepts, density, concentration, specialization },
    technology: { github_repos, patent_datasets, employment_datasets, trl_estimate, tech_density },
    policy: { contracts, convenios, sanctions, gazettes, fiscal_capacity, instrumental_intensity },
    international: { country_distribution, br_share, comex_datasets, macro_indicators, dependency_index }
  },
  indices: { gt, cd, aue, ei },  // cada um com layers_used e alert_level
  stats: { ... },
  meta: { ... }
}
```

### Arquivos a criar:
- `supabase/functions/layer-knowledge/index.ts`
- `supabase/functions/layer-technology/index.ts`
- `supabase/functions/layer-policy/index.ts`
- `supabase/functions/layer-international/index.ts`

### Arquivos a editar:
- `supabase/functions/motor-search/index.ts` -- refatorar para orquestrador
- `supabase/functions/motor-analysis/index.ts` -- prompts com dados por camada
- `src/hooks/useMotorSearch.ts` -- tipos atualizados para nova estrutura
- `src/components/governo/GovernoPanel.tsx` -- fluxo de 5 tabs
- `src/components/pesquisador/PesquisadorPanel.tsx` -- fluxo de 5 tabs
- `src/components/universidade/UniversidadePanel.tsx` -- fluxo de 5 tabs
- `src/components/empresa/EmpresaPanel.tsx` -- fluxo de 5 tabs
- `src/components/governo/StrategicIndices.tsx` -- mostrar `layers_used`
- `supabase/config.toml` -- registrar as 4 novas functions

### Regras de implementacao:
- Se uma fonte nao retorna dados estruturados, marcar como `{ structured: false, datasets: [...] }`
- Nao exibir metadados vazios na UI
- Toda resposta da IA deve cruzar pelo menos 2 camadas
- Indices sempre mostram de quais camadas vem o calculo

