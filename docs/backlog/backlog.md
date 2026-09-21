# Backlog — Motor da Inovação
Última atualização: 2026-09-21 · Formato: `[ ] ID | item | por que importa | dono | estado`

---

## Arquitetura de dados

- [ ] ARQ-01 | Criar tabela `staging_locations` com RLS (anon sem acesso) | fundação do ADR-0001 | Décio | aguardando aprovação do ADR
- [ ] ARQ-02 | Duplicar escrita da ingestão (staging + gold em paralelo) | migração sem quebrar mapa | Décio | bloqueado por ARQ-01
- [ ] ARQ-03 | RPC `promote_staging_to_gold()` em plpgsql transacional | garantia de atomicidade | Décio | bloqueado por ARQ-01
- [ ] ARQ-04 | Mover classificação canônica de `dataLake.ts` para coluna `canonical_type` | tirar lógica do frontend | Décio | bloqueado por ARQ-02
- [ ] ARQ-05 | Painel de qualidade em `/gestao-pesquisa` → aba "Qualidade" | visibilidade da fila de revisão | Décio | bloqueado por ARQ-01
- [ ] ARQ-06 | Enriquecimento passivo: BrasilAPI/CNPJ para registros com centroide | resolver 2.921 startups sem coord real | Décio | bloqueado por ARQ-03
- [ ] ARQ-07 | Migrar 6.009 registros atuais para Staging como histórico retroativo | consistência da base | Décio | bloqueado por ARQ-03

## Qualidade da base

- [ ] QLD-01 | Deduplicar tipos ("Unidade EMBRAPII" vs "Unidade Embrapii" — 171 registros) | limpeza imediata, baixo risco | Décio | pronto pra fazer
- [ ] QLD-02 | Geocodificar as 2.921 startups com centroide (via Nominatim ou BrasilAPI) | maior problema visual do mapa | Décio | bloqueado por ARQ-06
- [ ] QLD-03 | Adicionar campo de busca por nome/município em `PanoramaEstadualTab` | UX do mapa | Décio | independente

## Segurança (ciclo André Maia — pendências)

- [ ] SEG-01 | CI/CD: workflow GitHub Actions (npm ci + vitest + npm audit + pip-audit) | fecha lacuna apontada no relatório 2 | André Maia | aguardando issue
- [ ] SEG-02 | pytest no backend — `backend/tests/test_auth.py` | cobertura mínima de autenticação | Décio | aguardando issue
- [ ] SEG-03 | Tags de versão no GitHub (`git tag v0.1.0 a0f2e7e`) | rastreabilidade de auditoria | Décio | pronto pra fazer
- [ ] SEG-04 | Proteção de branch `main` (bloquear push direto, exigir PR) | governança do repo | Décio | pronto pra fazer
- [ ] SEG-05 | Digest `python:3.11-slim` no Dockerfile | fixar hash após build Railway | Décio | pronto pra fazer
- [ ] SEG-06 | Hash SHA-256 do modelo Tucano 2 GGUF | rastreabilidade do modelo | Décio | pronto pra fazer
- [ ] SEG-07 | Banner CEP/UFPR — incluir `/~flock.js` e cookie `__cf_bm` | conformidade legal | Décio | aguarda aprovação CEP

## Integrações — Mapa da Inovação (pendências)

- [ ] INT-01 | Extrator Lattes via PPGPP/UFPR — formulário para atendimento@cnpq.br | acesso institucional a dados de pesquisadores | Décio | ação institucional
- [ ] INT-02 | Transferegov — desbloqueio via contato MCTI (HTTP 403 Cloudflare) | fonte de convênios federais | Décio | ação institucional
- [ ] INT-03 | PNIPE/MCTI — exportação via parceria MCTI (SPA sem API) | 3.046 laboratórios inacessíveis | Décio | ação institucional
- [ ] INT-04 | Conectar `LeiBemCalculadora.tsx` ao endpoint `/api/v1/mcti/lei-do-bem` | funcionalidade incompleta | Décio | independente
- [ ] INT-05 | Validar tabela SIDRA 4093 (PNAD/CNAE trimestral) como proxy de emprego setorial | dado mais granular que CAGED | Décio | independente

## Integração Motor ↔ Mapa — bases exclusivas

> Diagnóstico de 21/09/2026: levantamento das 29 bases por origem.
> Bases exclusivas do Mapa não chegam ao Motor de busca — atores relevantes ficam invisíveis na busca inteligente.

| Categoria | Bases | Registros |
|-----------|-------|-----------|
| 🔵 Exclusivas do Motor | 18 bases (INPI, PNCP, Transparência, IPEAData, SIDRA, CAPES, Anatel, SISAB, ANTT/ANAC, CVM, Lei do Bem, ABVCAP, FAPESP, Lattes, PNAD, BrasilAPI, MCTI Indicadores, Editais) | — (contexto, não locais) |
| 🟢 Compartilhadas | OpenAlex, ABStartups, MCTI/FORMICT | 5.407 registros |
| 🟠 Exclusivas do Mapa | OTD/CGEE, LISP Brasil, EMBRAPII, SINAPAD | 607 registros |

- [ ] INT-06 | Expor OTD/CGEE (393 registros) ao Motor de busca | labs e ICTs do observatório CGEE/MCTI invisíveis na busca | Décio | independente
- [ ] INT-07 | Expor LISP Brasil (108 registros) ao Motor de busca | laboratórios de inovação do setor público invisíveis na busca | Décio | independente
- [ ] INT-08 | Expor EMBRAPII (96 registros) ao Motor de busca | unidades credenciadas aparecem no mapa mas não na busca por parceiro ICT | Décio | bloqueado por QLD-02 (sem coord real)
- [ ] INT-09 | Expor SINAPAD (10 registros) ao Motor de busca | centros de supercomputação invisíveis na busca | Décio | independente
- [ ] INT-10 | Investigar abstartups_2025 vs startupbase — são a mesma base ou complementares? | evitar duplicata conceitual entre mapa e motor | Décio | independente

## Documentação

- [ ] DOC-01 | Fichas de fonte: completar as 8 fontes ativas em `docs/fontes/` | proveniência para a tese | Décio | em andamento
- [ ] DOC-02 | Runbook de ingestão de locais em `docs/operacao/ingestao-locais.md` | operação sem depender de uma pessoa só | Décio | pronto pra fazer
- [ ] DOC-03 | Mover relatórios de auditoria para `docs/security-audit/` | organização do repo | Décio | pronto pra fazer
