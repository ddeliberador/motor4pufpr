# Runbook: Ingestão de Locais de Pesquisa
**Rotina:** `locations-refresh` (pg_cron) → `locations-ingest` (Edge Function)  
**Horário:** 03:00 UTC diário  
**O que toca:** `staging_locations` (Staging), `research_locations` (Gold) via `promote_staging_to_gold()`, `ingest_runs`, `ingest_jobs`  
**Código:** `supabase/functions/locations-ingest/index.ts` e `supabase/functions/locations-refresh/index.ts`

---

## O que a rotina faz (ADR-0001 — Staging → Gold)

1. `locations-refresh` dispara às 03:00 UTC via pg_cron
2. Para cada fonte ativa: chama `locations-ingest` com `{ source: "<fonte>" }`
3. `locations-ingest` coleta da API externa, deduplica dentro do lote e **grava na Staging** (`staging_locations`)
4. O gatilho `trg_staging_qualify` calcula **quality_score**, **quality_flags**, **canonical_type** (`classify_tipo`) e **canonical_key** em cada linha — o conector nunca calcula score
5. Ao final do lote, a função chama `promote_staging_to_gold(p_fonte, p_promoted_by='locations-ingest')`, que promove ao Gold os registros com **score ≥ 55** (limiar padrão; configurável por chamada) dentro de uma transação, com upsert pela chave `(fonte, lower(nome), coalesce(uf,''))`
6. Registros abaixo do limiar ficam na Staging como fila de revisão (`skipped_review` na resposta)
7. Resultado gravado em `ingest_runs` (ok, found, inserted, error, duration_ms)

**Fontes ativas:** `openalex`, `embrapii`, `inep_censo_superior`, `mcti_formict`  
**Fontes manuais (não no cron):** `abstartups_2025`, `otd_cgee`, `sinapad`, `lisp_brasil_mapeamento`  
**Carga manual:** `bulk-ingest` aceita `staging_locations` (recomendado) além de `research_locations`.

### Decisões registradas

- **Limiar 55 (não 70):** fontes sem CNPJ/endereço (OpenAlex, startups) têm teto prático de ~55–65. Com 70, quase nada seria promovido (só 20 de 6.010 registros no Gold atingiam 70+).
- **Histórico preservado:** a Staging nunca é limpa pela rotina — é a base do `rollback_fonte(p_fonte, p_snapshot_at)`. Registros que saírem de uma fonte permanecem no Gold até rollback/prune explícito.
- **Falha nunca silenciosa:** se a fonte falhar, nada é gravado e o erro vai para `ingest_runs` e para o Diário de Construção.

---

## Como rodar na mão

```bash
# Via curl (requer a chave de ingestão configurada como secret)
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/locations-ingest \
  -H "x-ingest-key: $LOCATIONS_INGEST_KEY" \
  -H "Content-Type: application/json" \
  -d '{"source": "openalex"}'
```

A resposta inclui `staged` (gravados na Staging), `promoted` (promovidos ao Gold) e `skipped_review` (abaixo do limiar, aguardando revisão).

### Promoção manual (SQL Editor)

```sql
-- Promover uma fonte com o limiar padrão (55)
SELECT * FROM public.promote_staging_to_gold('embrapii');

-- Limiar customizado
SELECT * FROM public.promote_staging_to_gold('openalex', 60);

-- Rollback de uma fonte para o estado de ontem
SELECT public.rollback_fonte('openalex');
```

---

## Como saber que falhou

```sql
-- Últimas execuções por fonte
SELECT fonte, ok, found, inserted, error, duration_ms, started_at
FROM ingest_runs
ORDER BY started_at DESC
LIMIT 20;

-- Fila de revisão (abaixo do limiar, não promovidos)
SELECT fonte, count(*)
FROM staging_locations
WHERE promoted_at IS NULL
GROUP BY fonte;

-- Fontes com falhas consecutivas
SELECT * FROM ingest_jobs WHERE consecutive_failures > 0;
```

---

## O que fazer quando falha

| Sintoma | Causa provável | Ação |
|---------|---------------|------|
| `ok = false`, `error` contém "HTTP 503" | API externa fora do ar | Aguardar e retentar manualmente |
| `ok = false`, `error` contém "ZIP" ou "Range" | INEP mudou URL ou estrutura do ZIP | Verificar URL atual no site INEP e atualizar `INEP_ANOS` no código |
| `ok = false`, `error` contém "PDF" | MCTI moveu PDF do FORMICT | Verificar URLs em `FORMICT_PDFS` no código |
| `staged > 0`, `promoted = 0` | Todos abaixo do limiar de 55 | Inspecionar `quality_flags` na Staging; avaliar enriquecimento ou limiar |
| `error` contém "promover" | RPC `promote_staging_to_gold` falhou | Verificar se o índice único do Gold existe e se a função tem GRANT para service_role |
| Fonte pausada (`paused = true`) | Muitas falhas consecutivas | Investigar causa, corrigir, atualizar `ingest_jobs SET paused = false` |

---

## Verificação do pipeline (feita em 17/09/2026)

- Gatilho da Staging calculou score 80, `canonical_type = 'Universidade'` e `canonical_key` em registro de teste (removido após o teste).
- Backfill: 6.013 registros do Gold copiados para a Staging (marcados como promovidos), todos com tipo canônico e chave.
- Promoção via RPC validada anteriormente (1 registro promovido no teste inicial).
- Confirmação de ponta a ponta pela rota real: primeira execução do cron após a mudança — conferir `ingest_runs` e o Diário.
