# Transporte na visão regional (portos, aeroportos, ferrovias, rodovias)

Camada da aba Regional do `/mapa`, fora das 7 camadas de IA. Dois pedaços: a **geometria atual** dos ativos, em snapshots `public/transporte/*.geojson` gerados por `scripts/transporte-geo.py`, e as **séries anuais por UF** em `v_series_validas` (entidade_tipo `uf`), coletadas no Railway e somadas por região na visão regional, que a barra de tempo percorre.

## Geometria (snapshots)

| Arquivo | Fonte | Licença | Recorte |
|---|---|---|---|
| `aeroportos.geojson` (138) | OurAirports, `airports.csv` | domínio público | Brasil, `large_airport` e `medium_airport`; `regular` = voo regular; UF de `iso_region` |
| `portos.geojson` (37) | `scripts/portos-organizados.json`: portos organizados da ANTAQ, coordenadas aproximadas cadastradas manualmente | dado público | marcados `aproximado: true`; terminais de uso privado não entram |
| `ferrovias.geojson` (275 trechos) | Natural Earth 1:10m `ne_10m_railroads` | domínio público | recorte Brasil, UF pelo ponto médio, simplificado 0,01° |
| `rodovias.geojson` (2.028 trechos) | Natural Earth 1:10m `ne_10m_roads` | domínio público | idem; `tipo` Major Highway / Road / Unknown |

Escala 1:10m: serve à leitura regional, não ao detalhe municipal. A evolução histórica da geometria (quando cada trecho entrou em operação) não existe nessas fontes; o que evolui no tempo são as séries abaixo. Regenerar: `python3 scripts/transporte-geo.py` (baixa as fontes para `.cache-transporte/`).

## Séries por UF (Railway, canal `series-municipais` com `entidade_tipo = 'uf'`)

| Indicador | Coletor / job | Fonte | Método |
|---|---|---|---|
| `uf.porto_toneladas` | `antaq_portos` / `series-uf:antaq_portos` | ANTAQ, Estatístico Aquaviário (`{ano}Atracacao.zip`, `{ano}Carga.zip`) | soma de `VLPesoCargaBruta` por UF da atracação, desde 2010 |
| `uf.aero_passageiros` | `anac_aero` / `series-uf:anac_aero` | ANAC, microdados `basica{ano}-{mes}.zip` | `nr_passag_pagos + nr_passag_gratis` por `sg_uf_origem`, desde 2010 |

Ambos entram em `INDICADORES_REGIONAIS` (camada "Transporte") e ficam "sem dado" até a coleta rodar em Gestão da Pesquisa → Coletas. Nenhum dos dois foi executado contra a fonte real a partir do ambiente de desenvolvimento (sem acesso a antaq.gov.br e anac.gov.br); a primeira rodada deve ser acompanhada, e a URL da pasta da ANAC pode ser trocada pela variável `ANAC_BASICA_URL` no Railway.

Ferrovias e rodovias ficam só com a geometria: a ANTT publica carga por concessionária (não por UF) e o SNV do DNIT muda de formato a cada edição; entram quando houver série por UF validada.
