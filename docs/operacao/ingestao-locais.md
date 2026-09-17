# Runbook: Ingestão de Locais de Pesquisa
**Rotina:** `locations-refresh` (pg_cron) → `locations-ingest` (Edge Function)  
**Horário:** 03:00 UTC diário  
**O que toca:** tabela `research_locations` (Gold), tabela `ingest_runs`, tabela `ingest_jobs`  
**Código:** `supabase/functions/locations-ingest/index.ts` e `supabase/functions/locations-refresh/index.ts`

---

## O que a rotina faz

1. `locations-refresh` dispara às 03:00 UTC via pg_cron
2. Para cada fonte ativa em `ingest_jobs` (onde `paused = false`): chama `locations-ingest` com `{ source: "<fonte>" }`
3. `locations-ingest` coleta da API externa, deduplica dentro do lote e faz DELETE + INSERT na tabela Gold
4. Resultado gravado em `ingest_runs` (ok, found, inserted, error, duration_ms)

**Fontes ativas:** `openalex`, `embrapii`, `inep_censo_superior`, `mcti_formict`  
**Fontes manuais (não no cron):** `abstartups_2025`, `otd_cgee`, `sinapad`, `lisp_brasil_mapeamento`

---

## Como rodar na mão

```bash
# Via curl (requer a chave de ingestão configurada no Supabase)
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/locations-ingest \
  -H "x-ingest-key: $LOCATIONS_INGEST_KEY" \
  -H "Content-Type: application/json" \
  -d '{"source": "openalex"}'
```

Ou via painel Supabase → Edge Functions → locations-ingest → Invoke.

---

## Como saber que falhou

```sql
-- Últimas execuções por fonte
SELECT fonte, ok, found, inserted, error, duration_ms, started_at
FROM ingest_runs
ORDER BY started_at DESC
LIMIT 20;

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
| `inserted = 0`, `found > 0` | Falha no DELETE ou INSERT | Verificar `ingest_runs.error`; verificar se `research_locations` está com RLS impedindo |
| Fonte pausada (`paused = true`) | Muitas falhas consecutivas | Investigar causa, corrigir, atualizar `ingest_jobs SET paused = false` |

---

## Risco atual (ADR-0001 pendente)

A ingestão atual faz `DELETE + INSERT` sem transação. Um erro no meio deixa
a fonte vazia no Gold. Até o ADR-0001 ser implementado, monitorar `ingest_runs`
após cada execução e ter snapshot manual antes de grandes mudanças.
