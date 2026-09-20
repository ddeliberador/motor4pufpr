# Migrations pendentes — ADR-0001

**Fila vazia.** Nenhuma migration aguardando revisão.

## O que aconteceu com as cinco que estavam aqui

As cinco foram listadas em 17/09/2026 como "aguardando PR". Nenhuma passou pelo
fluxo — quatro foram aplicadas no mesmo dia pelo trilho `drizzle/migrations/`, e a
quinta virou desnecessária:

| Arquivo | Destino |
|---------|---------|
| `20260917000001_create_staging_locations.sql` | aplicada como `drizzle/migrations/0004` |
| `20260917000002_promote_staging_to_gold.sql` | aplicada como `drizzle/migrations/0005`, depois substituída pela `0009` (limiar 55) |
| `20260917000003_rollback_fonte.sql` | aplicada como `drizzle/migrations/0006` |
| `20260917000004_classify_tipo.sql` | aplicada como `drizzle/migrations/0007` |
| `20260917000005_fix_embrapii_tipo.sql` | desnecessária — `Unidade EMBRAPII` em caixa alta tem zero registros no Gold |

Os arquivos foram removidos em vez de arquivados porque o que foi aplicado **não
era igual** ao que estava aqui. Aplicar a versão desta pasta hoje regrediria o
banco em três pontos:

- `...0001` recria a tabela sem os `GRANT` para `authenticated` e `service_role`;
- `...0004` devolve `classify_tipo` com `LIKE '%instituiç%'` no lugar de
  `'%institui%'`, que é o que está em produção;
- os `COMMENT` divergem dos aplicados.

O estado real do banco está versionado em
`supabase/migrations/20260920120100_camada_staging_adr_0001.sql`.

## O fluxo, daqui em diante

1. Quem escreve a migration abre PR com o arquivo em `supabase/migrations/`
2. Revisão no PR (cada arquivo traz dentro as queries de verificação)
3. Merge → aplicar via `supabase db push` ou SQL Editor do painel
4. Confirmar no PR que foi aplicado, com o resultado da query de verificação

O passo 4 é o que faltou em 17/09: sem ele não dá para saber, olhando o
repositório, se uma migration está no banco ou só no disco.

## Sobre os dois trilhos

Hoje convivem `supabase/migrations/` (60+ arquivos, histórico do projeto) e
`drizzle/migrations/` (criado em 17/09, aplicado com `LOVABLE_DB_MIGRATION_URL`).
Manter os dois significa que nenhum dos dois descreve o banco sozinho. A escolha
de qual fica é do mantenedor — este README só registra que a duplicidade existe.

## Referência

- ADR completo: `docs/adr/0001-staging-gold-mapa.md`
- Backlog: `docs/backlog/backlog.md`
