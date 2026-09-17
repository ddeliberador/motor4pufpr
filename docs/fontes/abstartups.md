# Fonte: ABStartups / StartupBase — Ecossistema de Startups
**Órgão responsável:** Associação Brasileira de Startups (ABStartups)  
**URL:** https://startupbase.abstartups.com.br  
**Acesso:** Sem API pública — dados do Mapeamento do Ecossistema Brasileiro de Startups 2025 ingeridos manualmente  
**Licença:** Uso acadêmico / pesquisa — confirmar com ABStartups para publicação  
**Periodicidade da fonte:** anual (Mapeamento 2025 publicado em 2025)  
**Nossa frequência de coleta:** manual — ingestão única do mapeamento  
**Registros ativos:** 3.310 (medido 2026-09-17, fonte `abstartups_2025`)

## Problema crítico de qualidade

**88% dos registros (2.921) estão geocodificados no centroide do município.**  
O mapeamento não fornece endereço por startup — a geocodificação foi feita por
município, jogando todas as startups de uma cidade no mesmo ponto.  
Ver QLD-02 no backlog para a solução planejada.

## Campos usados e para quê

| Campo origem | Campo no banco | Uso |
|-------------|---------------|-----|
| Nome da startup | `nome` | Identificação |
| Município | `municipio` | Localização declarada |
| UF | `uf` | Estado |
| Centroide do município | `latitude/longitude` | **Impreciso** — ver problema acima |

## Transformações aplicadas

- Geocodificação por centroide de município (não por endereço)
- Tipo fixo: "Startup" para todos os registros

## Limitações conhecidas

- Sem CNPJ
- Sem endereço real por startup
- Sem URL individual por startup (StartupBase não tem API aberta)
- Coordenadas imprecisas para 88% dos registros
- Cobertura: apenas startups que se cadastraram voluntariamente na plataforma ABStartups

## Chave / credencial

Nenhuma — dado do mapeamento anual, não via API.
