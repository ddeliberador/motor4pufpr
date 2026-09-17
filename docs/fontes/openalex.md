# Fonte: OpenAlex — Instituições de Pesquisa Brasileiras
**Órgão responsável:** OurResearch (EUA) — base aberta, sem fins lucrativos  
**URL:** https://openalex.org  
**Acesso:** API REST pública, sem autenticação (polite pool com User-Agent)  
**Licença:** CC0 (domínio público)  
**Periodicidade da fonte:** atualização contínua pela OpenAlex  
**Nossa frequência de coleta:** diária, às 03:00 UTC (pg_cron via `locations-refresh`)  
**Primeira coleta:** 2026-01-27 (estimado)  
**Registros ativos:** 1.971 (medido 2026-09-17)

## Endpoint consultado

```
GET https://api.openalex.org/institutions
  ?filter=country_code:br
  &select=id,display_name,works_count,cited_by_count,ror,type,geo
  &sort=works_count:desc
  &per_page=200
  &page={1..12}
```

## Campos usados e para quê

| Campo OpenAlex | Campo no banco | Uso |
|----------------|---------------|-----|
| `display_name` | `nome` | Nome canônico da instituição |
| `type` + heurística de nome | `tipo` | Classificação: Universidade / ICT / Instituto |
| `geo.region` | `uf` | Inferido via dicionário região→UF |
| `geo.city` | `municipio` | Município da sede |
| `geo.latitude/longitude` | `latitude/longitude` | Coordenada fornecida pela OpenAlex |
| `id` (URL OpenAlex) | `fonte_url` | Link para a entidade |
| objeto completo | `raw_metadata` | Preservado para reprocessamento |

## Transformações aplicadas

- `geo.region` → UF: dicionário em `UF_NOMES/REGIAO_PARA_UF` no código da Edge Function
- Tipo inferido por heurística de nome (`tipoOpenAlex()`) — "universidade", "university" → Universidade; "instituto federal" → Instituto de Pesquisa; fallback → ICT
- Deduplicação dentro do lote por `norm(nome) + uf` antes do INSERT

## Limitações conhecidas

- `geo.region` nem sempre mapeia para uma UF brasileira — registro fica com `uf = null`
- Tipo "ICT" é um fallback genérico para tudo que não casa na heurística de nome
- Não tem CNPJ — impossível deduplicar com fontes brasileiras por chave forte
- Cobertura: instituições com maior número de publicações (sort por `works_count`) — pequenas ICTs sem produção científica indexada não aparecem

## Chave / credencial

Nenhuma. Header `User-Agent: Motor4P-UFPR/1.0 (mailto:pesquisa@ufpr.br)` para acesso ao polite pool (sem limite de taxa declarado para polite pool).
