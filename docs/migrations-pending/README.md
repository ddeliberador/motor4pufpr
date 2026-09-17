# Migrations pendentes — ADR-0001

Arquivos SQL prontos para aplicar no Supabase, aguardando revisão via PR.

**Não aplicar direto** — o fluxo é:
1. André Maia abre PR com o arquivo de migration
2. Revisão aqui (queries de verificação estão dentro de cada arquivo)
3. Merge → aplicar via `supabase db push` ou SQL Editor do painel

## Ordem de aplicação

| Ordem | Arquivo | Issue | Depende de |
|-------|---------|-------|------------|
| 1 | `20260917000001_create_staging_locations.sql` | ARQ-01 | — |
| 2 | `20260917000002_promote_staging_to_gold.sql` | ARQ-02 | 1 |
| 3 | `20260917000003_rollback_fonte.sql` | ARQ-03 | 1, 2 |
| 4 | `20260917000004_classify_tipo.sql` | ARQ-05 | 1 |
| 5 | `20260917000005_fix_embrapii_tipo.sql` | QLD-01 | — (independente) |

## Como aplicar um arquivo

```bash
# Via Supabase CLI (requer supabase login)
supabase db push

# Ou copiar o conteúdo do arquivo e colar no SQL Editor do painel Supabase
# Projeto: 980435df-379c-4f49-964c-17fd72b669fc
```

## Referência

- ADR completo: `docs/adr/0001-staging-gold-mapa.md`
- Backlog: `docs/backlog/backlog.md`
