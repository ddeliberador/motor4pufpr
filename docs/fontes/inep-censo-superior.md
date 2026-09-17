# Fonte: INEP — Censo da Educação Superior
**Órgão responsável:** Instituto Nacional de Estudos e Pesquisas Educacionais Anísio Teixeira (INEP/MEC)  
**URL:** https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/censo-da-educacao-superior  
**Acesso:** Download de ZIP de microdados (HTTP Range via zipjs — não baixa o ZIP inteiro)  
**Licença:** Dados públicos do governo federal — uso livre com citação  
**Periodicidade da fonte:** anual (referência do ano anterior publicada em ~dezembro)  
**Nossa frequência de coleta:** diária às 03:00 UTC (tenta 2024, 2023, 2022 em ordem)  
**Registros ativos:** parte de 515 universidades/IES (medido 2026-09-17)

## Arquivo consumido

```
CADASTRO_IES_{ANO}.CSV dentro do ZIP:
https://download.inep.gov.br/microdados/microdados_censo_da_educacao_superior_{ano}.zip
```

Leitura via HTTP Range (`ZipReader` + `HttpRangeReader`) — extrai só o arquivo
`CADASTRO_IES*.CSV` sem baixar o pacote inteiro de microdados (~500MB).

## Campos usados e para quê

| Campo INEP | Campo no banco | Uso |
|-----------|---------------|-----|
| `NO_IES` | `nome` | Nome da instituição |
| `TP_ORGANIZACAO_ACADEMICA` | `tipo` | 1 = Universidade; demais = IES |
| `SG_UF_IES` | `uf` | UF da sede |
| `NO_MUNICIPIO_IES` ou IBGE | `municipio` | Município (enriquecido via API IBGE se ausente) |
| `CO_IES` | `raw_metadata.co_ies` | Código interno INEP |
| `CO_MUNICIPIO_IES` | `raw_metadata.co_municipio_ibge` | Código IBGE do município |

## Transformações aplicadas

- Se `NO_MUNICIPIO_IES` ausente: busca nome do município via API IBGE (`/api/v1/localidades/municipios`) por `CO_MUNICIPIO_IES`
- Tipo: `TP_ORGANIZACAO_ACADEMICA == "1"` → "Universidade"; demais → "Instituição de Ensino Superior"
- Encoding: CSV em iso-8859-1, convertido na leitura

## Limitações conhecidas

- Sem lat/lng — INEP não fornece coordenada. Ficam como `null` no banco.
- Sem CNPJ no arquivo `CADASTRO_IES` — impossível deduplicar com fontes brasileiras por CNPJ
- Arquivo ZIP de ~500MB; a leitura via HTTP Range falha se o servidor não suportar `Range` (raro, mas acontece)
- Defasagem: referência 2023 publicada em 2024; dados de 2024 só disponíveis em ~dez/2024

## Chave / credencial

Nenhuma. Acesso público.
