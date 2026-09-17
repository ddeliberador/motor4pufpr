# Documentação — Motor da Inovação
**Projeto:** Motor 4P UFPR · Doutorado em Políticas Públicas  
**Repositório:** ddeliberador/motor4pufpr  
**Convenção:** pt-BR, kebab-case sem acento, tudo markdown, versionado junto do código.

---

## O que tem aqui

| Pasta | Conteúdo |
|-------|----------|
| `adr/` | Decisões de arquitetura — uma por arquivo, numeradas, imutáveis |
| `backlog/` | O que falta fazer, priorizado, com dono |
| `fontes/` | Ficha de cada base de dados ingerida pelo Motor |
| `operacao/` | Runbooks: como rodar, o que fazer quando quebra |
| `security-audit/` | Relatórios dos ciclos de auditoria de segurança |

## Regras

1. A doc entra no mesmo commit da mudança.
2. Um arquivo por decisão. ADR não se reescreve — se substitui.
3. Todo texto diz como conferir aquilo no código. Sem verificação, é ficção.
4. Documento gerado por agente não entra sem revisão humana.

## Relação com o build_log

- `build_log` (tabela Supabase) = narrativa pública, aparece no Diário de Construção do site  
- `docs/adr/` = registro técnico, versionado junto do código  

A decisão nasce no ADR. A entrada do build_log referencia o número do ADR.  
Os dois contam a mesma história.

## Índice de ADRs

| Nº | Título | Status | Data |
|----|--------|--------|------|
| [ADR-0001](adr/0001-staging-gold-mapa.md) | Arquitetura de dados em duas camadas (Staging → Gold) | proposta | 2026-09-17 |

## Índice de fontes

| Fonte | Arquivo | Status |
|-------|---------|--------|
| OpenAlex | [openalex.md](fontes/openalex.md) | ativo |
| INEP — Censo da Educação Superior | [inep-censo-superior.md](fontes/inep-censo-superior.md) | ativo |
| EMBRAPII | [embrapii.md](fontes/embrapii.md) | ativo |
| MCTI / FORMICT | [mcti-formict.md](fontes/mcti-formict.md) | ativo |
| ABStartups / StartupBase | [abstartups.md](fontes/abstartups.md) | ativo |
| OTD/CGEE | [otd-cgee.md](fontes/otd-cgee.md) | ativo |
| SINAPAD | [sinapad.md](fontes/sinapad.md) | ativo |
| LISP Brasil | [lisp-brasil.md](fontes/lisp-brasil.md) | ativo |
