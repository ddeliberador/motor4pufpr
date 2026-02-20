

# Agente Pesquisador IA para o Motor 4P

## Objetivo
Criar um agente de IA pesquisador especializado em pesquisa cientifica, integrado ao fluxo de busca do Motor 4P, que enriquece e cruza os dados das bases publicas de forma inteligente.

## Nota sobre o modelo
O projeto ja possui acesso ao Lovable AI (chave LOVABLE_API_KEY pre-configurada), que inclui modelos OpenAI (gpt-5-mini, gpt-5) e Google Gemini. Usaremos o modelo `google/gemini-3-flash-preview` (modelo padrao, rapido e capaz) para o agente, pois e mais performatico e nao requer configuracao adicional. Caso prefira usar exclusivamente a chave OpenAI que voce adicionou, podemos ajustar.

## Arquitetura

O agente sera implementado como uma edge function que:
1. Recebe os dados brutos da busca (resultados das bases publicas + CNAEs selecionados)
2. Analisa e cruza os dados usando IA
3. Retorna insights estrategicos, lacunas identificadas e recomendacoes

## Implementacao

### 1. Edge Function: `research-agent`
**Arquivo:** `supabase/functions/research-agent/index.ts`

- Recebe: query do usuario, dados das bases (cientifica, tecnologica, produtiva, institucional), CNAEs selecionados
- System prompt especializado em:
  - Analise de ecossistemas de inovacao brasileiros
  - Conhecimento de bases CNPq, INPI, COMEX Stat, Finep, CAPES, INEP
  - Cruzamento inteligente entre camadas (cientifica, tecnologica, produtiva, institucional)
  - Identificacao de lacunas, gargalos e oportunidades
- Retorna analise estruturada com:
  - Diagnostico geral do cenario
  - Cruzamentos entre camadas (ex: grupos de pesquisa vs patentes vs exportacao)
  - Lacunas identificadas (onde ha pesquisa mas nao ha producao, etc.)
  - Oportunidades estrategicas
  - Recomendacoes de politica publica

### 2. Atualizacao do `supabase/config.toml`
- Registrar a nova funcao com `verify_jwt = false`

### 3. Hook: `useResearchAgent`
**Arquivo:** `src/hooks/useResearchAgent.ts`

- Chama a edge function apos os resultados da busca estarem disponiveis
- Gerencia estados de loading e erro
- Suporte a streaming para exibicao progressiva da analise

### 4. Componente: `AIAnalysisPanel`
**Arquivo:** `src/components/mvp/AIAnalysisPanel.tsx`

- Painel expansivel nos resultados da busca (apos o header de resultados)
- Botao "Analisar com IA" para disparar a analise
- Exibicao da analise em markdown com secoes:
  - Diagnostico do Cenario
  - Cruzamento de Dados
  - Lacunas e Gargalos
  - Oportunidades
  - Recomendacoes
- Indicador de loading com streaming
- Renderizacao em markdown (usando formatacao simples ou react-markdown)

### 5. Integracao no `MvpEngine.tsx`
- Adicionar o `AIAnalysisPanel` apos o header de resultados
- Passar os dados da busca e CNAEs selecionados para o componente

## Fluxo do Usuario
1. Usuario pesquisa um objeto tecnologico (ex: "baterias de litio")
2. Seleciona CNAEs relevantes
3. Resultados das bases publicas sao exibidos normalmente
4. No topo dos resultados, aparece o botao "Analisar com Agente IA"
5. Ao clicar, o agente analisa todos os dados cruzados e exibe insights em tempo real (streaming)

## Detalhes Tecnicos

- **Modelo:** `google/gemini-3-flash-preview` via Lovable AI Gateway
- **Gateway:** `https://ai.gateway.lovable.dev/v1/chat/completions`
- **Autenticacao:** `LOVABLE_API_KEY` (ja configurada automaticamente)
- **Streaming:** SSE para exibicao progressiva dos tokens
- **Dados enviados ao agente:** resumo dos resultados (stats, indicadores, CNAEs, top grupos, top patentes, balanca comercial, instrumentos)

