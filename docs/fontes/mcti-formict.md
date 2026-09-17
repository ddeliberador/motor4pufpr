# Fonte: MCTI / FORMICT — ICTs não respondentes
**Órgão responsável:** Ministério da Ciência, Tecnologia e Inovação (MCTI)  
**URL:** https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/propriedade-intelectual-e-transferencia-de-tecnologia  
**Acesso:** Download de PDF (lista de ICTs não respondentes ao FORMICT)  
**Licença:** Dado público federal — uso livre com citação  
**Periodicidade da fonte:** anual (publicado ~outubro do ano seguinte)  
**Nossa frequência de coleta:** diária às 03:00 UTC (tenta 2024, 2023, 2022)  
**Registros ativos:** 121 (medido 2026-09-17)

## PDFs consumidos (em ordem de tentativa)

```
2024: .../ListadeICTAB20243doart.17doDecreton9.283181.pdf
2023: .../Listaem15102024dasICTSnaorespondentesFormictAB2023.pdf
2022: .../ListadeICTSnaorespondentesAB2022.pdf
```

## Limitação estrutural documentada

**Esta fonte lista apenas ICTs NÃO RESPONDENTES ao FORMICT.**  
A base consolidada do FORMICT (dados.gov.br) traz CNPJ mascarado e sem razão social — não é possível identificar nominalmente as ICTs respondentes a partir do arquivo estruturado. A identificação nominal exige leitura manual do Apêndice dos relatórios PDF.

Isso significa que a fonte `mcti_formict` no banco **não é** uma lista completa de ICTs brasileiras — é uma lista parcial de não-respondentes.

## Extração e enriquecimento

1. Download do PDF via HTTP
2. Extração de texto via `unpdf` (npm)
3. Regex para pares CNPJ + razão social no texto limpo
4. Enriquecimento de cada CNPJ via BrasilAPI (`/api/cnpj/v1/{cnpj}`) em lotes de 4, com `sleep(700ms)` entre lotes
5. `uf` e `municipio` vêm da BrasilAPI, não do PDF

## Campos usados e para quê

| Origem | Campo no banco | Uso |
|--------|---------------|-----|
| PDF (regex) | `cnpj` | Chave canônica forte |
| BrasilAPI ou PDF | `nome` | Razão social (BrasilAPI prevalece sobre PDF) |
| BrasilAPI | `uf`, `municipio` | Localização real |
| URL do PDF | `fonte_url` | Proveniência |

## Limitações conhecidas

- Lista parcial: apenas não-respondentes
- Regex de extração pode falhar se o PDF tiver formatação não-padrão
- BrasilAPI tem rate limit (~60/min) — lotes de 4 com sleep mitigam mas não eliminam falhas
- Sem coordenada — todos chegam sem lat/lng

## Chave / credencial

Nenhuma para o PDF. BrasilAPI: pública, sem chave.
