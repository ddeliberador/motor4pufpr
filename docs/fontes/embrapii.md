# Fonte: EMBRAPII — Unidades Credenciadas
**Órgão responsável:** Empresa Brasileira de Pesquisa e Inovação Industrial (EMBRAPII)  
**URL:** https://embrapii.org.br/unidades/  
**Acesso:** API REST pública do WordPress (`/wp-json/wp/v2/units`)  
**Licença:** Dado público institucional — uso livre com citação  
**Periodicidade da fonte:** sem periodicidade declarada pela EMBRAPII  
**Nossa frequência de coleta:** diária às 03:00 UTC  
**Registros ativos:** 96 (medido 2026-09-17, fonte `embrapii`)  
**Atenção:** há também 75 registros de fonte `otd_cgee` classificados como "Unidade Embrapii" — ver QLD-01 no backlog

## Endpoint consultado

```
GET https://embrapii.org.br/wp-json/wp/v2/units?per_page=100&page={1..5}
```

## Campos usados e para quê

| Campo ACF (WordPress) | Campo no banco | Uso |
|----------------------|---------------|-----|
| `title.rendered` | `nome` | Nome da unidade (decodificado de HTML entities) |
| `acf.uf_state` | `uf` | Sigla da UF |
| `acf.city` | `municipio` | Cidade |
| `link` | `fonte_url` | URL da página da unidade |
| `acf.website` | `raw_metadata.website` | Site próprio da unidade |
| objeto completo `acf` | `raw_metadata` | Preservado |

## Transformações aplicadas

- Decodificação de HTML entities (`&#8211;`, `&amp;`, etc.) via `decodeHtml()`
- UF validada contra `UF_NOMES` — valores inválidos ficam `null`
- **Sem coordenada:** EMBRAPII não fornece lat/lng na API; `latitude/longitude = null` para todos os 96 registros

## Limitações conhecidas

- **Zero coordenadas** — todos os 96 registros chegam sem lat/lng. Score de qualidade médio: 32,9.
- Sem CNPJ na API WordPress
- `institution_type` no `acf` nem sempre preenchido
- Sobreposição com `otd_cgee`: INATEL e Instituto Atlântico aparecem nas duas fontes com casing diferente — ver QLD-01

## Chave / credencial

Nenhuma. Header `User-Agent: Mozilla/5.0 Motor4P-UFPR/1.0`.
