# Backlog — Motor da Inovação
**Projeto:** Motor 4P UFPR  
**Repositório:** [ddeliberador/motor4pufpr](https://github.com/ddeliberador/motor4pufpr)  
**Preview:** https://id-preview--980435df-379c-4f49-964c-17fd72b669fc.lovable.app  
**Backend:** https://motor4pufpr-copy-production-5681.up.railway.app/api/v1  
**Última atualização:** 17/09/2026

---

## Status geral

| Frente | Estado |
|--------|--------|
| Segurança (ciclo André Maia) | ✅ Encerrado — commit a0f2e7e |
| Integrações Mapa da Inovação | ✅ 24 de 27 bases integradas |
| Qualidade da base de locais | 🔄 Em desenho |
| Arquitetura de dados (Medallion) | 📋 Backlog |
| CI/CD + testes automatizados | 📋 Backlog |

---

## Em desenho — Arquitetura de dados em duas camadas

### Contexto

A tabela `research_locations` hoje recebe tudo direto das APIs — dado bruto, dado qualificado e dado ruim convivem no mesmo lugar. Com 6.009 registros, 88% das startups estão geocodificadas no centroide do município (ponto único), sem endereço real. O mapa fica com pontos empilhados e informações incompletas.

### Decisão arquitetural

Adotar duas camadas em vez de uma tabela única:

```
APIs externas
     │
     ▼
┌──────────────────────────────────────┐
│  STAGING  (nova tabela)              │
│  • Recebe dado bruto das APIs        │
│  • Normaliza: nome, tipo, coordenada │
│  • Calcula quality_score (0–100)     │
│  • Classifica flags de problema      │
│  • Dado ruim fica aqui (score < 70)  │
└───────────────┬──────────────────────┘
                │ promoção automática (score ≥ 70)
                │ ou manual via painel de gestão
                ▼
┌──────────────────────────────────────┐
│  GOLD — research_locations (atual)   │
│  • Só dado aprovado                  │
│  • Alimenta mapa + Motor             │
│  • Nunca recebe ingestão direta      │
│  • Versionado (promoted_at)          │
└──────────────────────────────────────┘
```

### Score de qualidade (já implementado em 17/09/2026)

| Critério | Pontos |
|----------|--------|
| Coordenada com precisão real (não centroide) | 30 |
| CNPJ válido (14 dígitos) | 20 |
| URL da fonte presente | 15 |
| Endereço real no metadata | 15 |
| Nome não-genérico | 10 |
| Tipo padronizado (< 50 chars) | 10 |
| **Máximo** | **100** |

**Threshold de promoção automática:** score ≥ 70  
**Fila de revisão manual:** score 40–69  
**Retorna ao enriquecimento:** score < 40

### Distribuição atual dos scores (17/09/2026)

| Faixa | Registros | % |
|-------|-----------|---|
| 🟢 80–100 ótimo | 19 | 0,3% |
| 🟡 60–79 bom | 5.206 | 86,6% |
| 🟠 40–59 médio | 684 | 11,4% |
| 🔴 20–39 ruim | 100 | 1,7% |

### Impacto estimado em performance e custo

- Staging: ~5 MB adicionais — dentro do plano gratuito Supabase (cota: 500 MB)
- Query do mapa: sem mudança — continua em `research_locations` com índice (2,4ms por UF)
- Edge Functions: +1 trigger em background por ingestão — 0,025% da cota gratuita
- **Custo adicional: zero**

### Tarefas — Arquitetura de dados

- [ ] Criar tabela `staging_locations` com colunas: `raw_payload jsonb`, `fonte`, `quality_score`, `quality_flags`, `promoted_at`, `promoted_by`
- [ ] Migrar Edge Functions para inserir em `staging_locations` (não mais direto em `research_locations`)
- [ ] Criar trigger de promoção automática (score ≥ 70 → copia para `research_locations`)
- [ ] Criar fila de revisão manual no painel `/gestao-pesquisa` → aba "Qualidade"
- [ ] Enriquecimento passivo: buscar endereço real via BrasilAPI/CNPJ para registros com centroide
- [ ] Migrar os 6.009 registros atuais para Staging como dado histórico retroativo
- [ ] Criar view `quality_dashboard` (materializada) para o painel de monitor

---

## Backlog — outros itens

### Segurança (pendências do ciclo André Maia)

- [ ] CI/CD: workflow GitHub Actions (`npm ci` + `vitest run` + `npm audit` + `pip-audit`)
- [ ] pytest no backend — `backend/tests/test_auth.py` (401 sem chave, 200 com chave)
- [ ] Tags de versão no GitHub (`git tag v0.1.0 a0f2e7e`)
- [ ] Proteção de branch `main` no GitHub (bloquear push direto, exigir PR)
- [ ] Digest `python:3.11-slim` no Dockerfile (fixar hash após build Railway)
- [ ] Hash SHA-256 do modelo Tucano 2 GGUF
- [ ] Banner de consentimento CEP/UFPR — incluir `/~flock.js` e cookie `__cf_bm`
- [ ] Rate limit na telemetria antes de ativar `TELEMETRY_ENABLED=true`

### Integrações — pendências do Mapa da Inovação

- [ ] Extrator Lattes via PPGPP/UFPR — enviar formulário para `atendimento@cnpq.br` (Resolução Normativa CNPq nº 01/2023)
- [ ] Transferegov — desbloqueio via contato institucional MCTI (atualmente: HTTP 403 Cloudflare)
- [ ] PNIPE/MCTI — solicitação de exportação via parceria MCTI (SPA sem API)
- [ ] ANPD/Marco IA — integrar via API Câmara quando PL tiver número
- [ ] Conectar `LeiBemCalculadora.tsx` ao endpoint `/api/v1/mcti/lei-do-bem`
- [ ] Validar tabela SIDRA 4093 (PNAD/CNAE trimestral) como proxy de emprego setorial

### Motor — melhorias funcionais

- [ ] Painel de qualidade da base no `/gestao-pesquisa`
- [ ] Deduplicação dos tipos ("Unidade EMBRAPII" e "Unidade Embrapii" — 171 registros afetados)
- [ ] Geocodificação real das 2.921 startups com coordenada no centroide do município
- [ ] Campo de busca por nome/município no `PanoramaEstadualTab`

---

## Fluxo de trabalho com o André Maia

Issue no GitHub → PR → code review pelo agente → merge por Décio → Lovable sincroniza com a `main`.

**Repositório:** https://github.com/ddeliberador/motor4pufpr/pulls

---

## Referências

- [Relatório de Fechamento — ciclo de segurança](./relatorio-fechamento-seguranca.md) *(a criar)*
- [Relatório de Integração — Mapa da Inovação](./relatorio-mapa-inovacao.md) *(a criar)*
- [Arquitetura atual das Edge Functions](./arquitetura-edge-functions.md) *(a criar)*
