# ADR-0001 — Arquitetura de dados em duas camadas (Staging → Gold)
Data: 2026-09-17  
Status: aceita e implementada (2026-09-17) — ver Adendo  
Decidido por: André Maia, Décio Dalton Deliberador Filho

## Contexto

A tabela `public.research_locations` recebe dados diretamente das Edge Functions
de ingestão (`supabase/functions/locations-ingest/index.ts`). A função
`replaceSource()` faz DELETE + INSERT sem transação — um erro no meio deixa a
fonte parcial ou vazia no Gold (verificado no código, linha ~60 do arquivo).

Com 6.009 registros (medido em 2026-09-17), o diagnóstico real é:

- 3.310 startups (fonte `abstartups_2025`): 88% no centroide do município —
  389 coordenadas distintas para 3.310 registros.
- 96 unidades EMBRAPII: zero lat/lng.
- Apenas 2 entidades duplicadas entre fontes (INATEL/MG e Instituto Atlântico/CE),
  ambas por diferença de casing — problema pequeno hoje, mas sem chave canônica
  vai crescer com novas fontes.
- A qualificação canônica (7 eixos) roda no frontend em `src/components/mapa/dataLake.ts`,
  recalculada a cada page load — não está versionada, não fica gravada por linha.

Query de diagnóstico que gerou esses números (reproduzível):
```sql
SELECT fonte, COUNT(*) as total,
  COUNT(DISTINCT ROUND(latitude::numeric,3)||','||ROUND(longitude::numeric,3)) as coords_distintas
FROM research_locations GROUP BY fonte ORDER BY total DESC;
```

## Decisão

A ingestão passa a gravar em `staging_locations` (nova tabela, não legível por
`anon`). Somente após validação automática (score ≥ 70) ou manual, os registros
são promovidos para `research_locations` (Gold) via RPC plpgsql transacional.
`research_locations` continua sendo a única tabela lida pelo `/mapa`.

## Alternativas consideradas

**Três camadas (Bronze / Silver / Gold):** descartado. `raw_metadata jsonb` já
guarda o payload bruto por linha, e `ingest_runs` já registra proveniência de
execução. Uma tabela Bronze separada duplicaria dado sem ganho neste volume.

**Edge Function orquestrando REST para a promoção:** descartado por falta de
garantia transacional. Falha de rede entre chamadas REST deixa estado
inconsistente — Gold apagado, Staging não promovido. A RPC plpgsql resolve
dentro de uma única transação implícita.

**Manter tudo em uma tabela com flag `staged`:** descartado. Não atende o
requisito de que `anon` nunca veja dado não qualificado (RLS por flag é frágil
a erro de configuração).

## Consequências

**Melhora:**
- Gold nunca é apagado antes de a carga nova ser validada.
- Rollback de fonte possível via RPC sem perda de dados.
- Qualificação versionada (campo `quality_rule_version`) e reproduzível.
- Chave canônica (CNPJ > hash nome+UF) permite deduplicação entre fontes.
- `anon` nunca vê dado não qualificado.

**Piora / passa a dar manutenção:**
- Mais uma tabela para monitorar.
- Migração do `dataLake.ts` (frontend) para coluna `canonical_type` no banco
  precisa ser feita em passos para não deixar o mapa inconsistente.
- Score e limiar documentados aqui e na migration — precisam ser atualizados
  juntos quando a regra mudar.

## Score de qualidade — regra v1.0

| Critério | Pontos | Justificativa |
|----------|--------|---------------|
| Coordenada com precisão real (não centroide) | 30 | Maior peso: coordenada imprecisa é o problema dominante na base atual |
| CNPJ válido (14 dígitos) | 20 | Habilita deduplicação forte e enriquecimento via BrasilAPI |
| URL da fonte presente e válida | 15 | Rastreabilidade mínima para a tese |
| Endereço real no `raw_metadata` | 15 | Complementar à coordenada |
| Nome não-genérico (> 5 chars, sem "n/a") | 10 | Filtra lixo de ingestão |
| Tipo padronizado (< 50 chars) | 10 | Penaliza tipos compostos colados na ingestão |
| **Máximo** | **100** | |

**Limiar de promoção automática:** 70  
**Limiar de fila de revisão manual:** 40–69  
**Retorna ao enriquecimento:** < 40  

Justificativa do limiar 70: com os critérios acima, um registro com coordenada
real + URL já soma 45. Para chegar a 70 precisa de pelo menos mais um campo
(CNPJ ou endereço). Isso exclui os centroides sem enriquecimento mas não bloqueia
fontes confiáveis com dados parciais.

## Verificação

A decisão está valendo quando:

```sql
-- 1. Tabela staging_locations existe e anon não tem acesso
SELECT has_table_privilege('anon', 'staging_locations', 'SELECT'); -- deve retornar false

-- 2. Trigger de score existe em research_locations
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'research_locations'
AND trigger_name = 'trg_quality_score';

-- 3. locations-ingest insere em staging, não em research_locations diretamente
-- grep no código:
-- supabase/functions/locations-ingest/index.ts NÃO deve conter "research_locations"
-- como destino de INSERT após a migração

-- 4. Gold nunca é tocado direto pela ingestão
-- supabase/functions/locations-ingest/index.ts deve conter chamada a
-- promote_staging_to_gold() ou equivalente
```

## Ordem de migração (sem deixar o mapa inconsistente)

1. Criar `staging_locations` — não toca Gold nem frontend
2. Duplicar ingestão: escreve em staging E em `research_locations` — mapa continua
3. Mover classificação de `dataLake.ts` para coluna `canonical_type` no Staging
4. Primeira promoção Staging → Gold com `canonical_type` incluído; atualizar `Mapa.tsx`
5. Remover escrita direta em `research_locations` da ingestão
6. Remover lógica de classificação do `dataLake.ts`

## Adendo (2026-09-17) — implementação e ajustes medidos

Implementado conforme os passos 1–5. O passo 6 (classificação no frontend)
permanece: `dataLake.ts` segue classificando os 7 eixos para os filtros do
/mapa, agora consistente com `classify_tipo()` no banco.

Ajustes decididos na implementação, com números reais:

- **Limiar de promoção 70 → 55.** Distribuição medida no Gold (6.010
  registros): 20 em 0–29, 101 em 30–49, 5.869 em 50–69 e 20 em 70+. Fontes
  sem CNPJ/endereço (OpenAlex, startups) têm teto prático de ~55–65; com 70,
  quase nada seria promovido. Parâmetro segue configurável por chamada.
- **Gatilho de qualificação também na Staging** (`trg_staging_qualify`):
  score, flags, `canonical_type` e `canonical_key` são calculados no banco em
  toda escrita — o conector nunca calcula score.
- **Sem DELETE no Gold pela rotina.** A Staging guarda o histórico (base do
  `rollback_fonte`); o Gold faz upsert pela chave. Registros que saírem de
  uma fonte permanecem no Gold até rollback/prune explícito — aceito para
  preservar histórico e evitar janela de fonte vazia.
- **Backfill executado:** 6.013 registros do Gold copiados para a Staging
  (marcados como promovidos), todos com tipo canônico e chave.
- **Verificação:** registro de teste recebeu score 80, `canonical_type =
  'Universidade'` e chave canônica automaticamente (removido após o teste).
  Confirmação de ponta a ponta pela rota real ocorre na primeira execução do
  cron após a mudança — conferir `ingest_runs`.
