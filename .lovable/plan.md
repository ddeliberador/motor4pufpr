# Plano — Tornar o pipeline Staging → Gold efetivamente funcional

## Diagnóstico (verificado no banco agora)

A estrutura em camadas **existe e as peças funcionam**, mas o processo de qualificação **não está sendo usado de fato**:

- **Gold (research_locations):** 6.010 registros, todos com `quality_score` calculado pelo gatilho automático. Funcionando.
- **Staging (staging_locations):** apenas 3 registros de teste (1 promovido, 2 abaixo do limiar). A coleta diária e as ingestões gravam **direto no Gold**, sem passar pela Staging.
- **Gatilho de qualidade:** existe só no Gold. Na Staging, o `quality_score` não é calculado automaticamente — depende de quem insere.
- **Limiar de 70 inalcançável para a maioria das fontes:** distribuição real no Gold é 20 registros 0–29, 101 em 30–49, 5.869 em 50–69 e só 20 em 70+. Sem CNPJ e endereço (realidade de OpenAlex, startups etc.), o teto prático é ~55–65. Com o limiar atual, quase nada seria promovido.

## O que o plano entrega

1. **Gatilho de qualidade na Staging** — migration que aplica `trg_quality_score` também em `staging_locations` (INSERT/UPDATE), para o score ser sempre calculado no banco, nunca dependendo do conector.
2. **Classificação canônica automática** — gatilho na Staging que preenche `canonical_type` via `classify_tipo()` e gera `canonical_key` (fonte + nome normalizado + uf) na ingestão.
3. **Revisão do limiar de promoção** — ajustar o padrão de `promote_staging_to_gold` de 70 para **55** (teto realista das fontes sem CNPJ/endereço), mantendo o parâmetro configurável por chamada. Registro da decisão no Diário e no ADR-0001.
4. **Rota de ingestão via Staging** — alterar a coleta diária/ingestão protegida para gravar na Staging e chamar `promote_staging_to_gold()` ao final, em vez de inserir direto no Gold. Assim a camada de qualificação passa a ser o caminho real dos dados.
5. **Backfill da Staging** — popular a Staging com o histórico das fontes já presentes no Gold (marcadas como promovidas), para que `rollback_fonte()` tenha base real de restauração.
6. **Documentação e Diário** — atualizar `docs/operacao/ingestao-locais.md` e registrar cada etapa no Diário de Construção (eh_mapa_inovacao=true).

## Detalhes técnicos

- Migrações novas via ferramenta de migration (DDL); backfill via SQL de dados. Preferência vigente: SQL em `docs/migrations-pending/` para revisão antes de aplicar — confirmar se este plano já conta como aprovação para aplicar direto.
- Nenhuma mudança destrutiva: nada é removido do Gold; o backfill só copia para a Staging.
- O mapa e o frontend não mudam — continuam lendo do Gold.
- Verificação ao final: inserir registro de teste na Staging, conferir score/canonical_type automáticos, rodar promoção e confirmar idempotência (segunda chamada retorna promoted=0).
