# Transporte na visão regional (portos, aeroportos, ferrovias, rodovias)

Tema Transporte da camada **L2 · Infraestrutura física** na aba Regional do `/mapa` (a ficha regional agrupa os indicadores pelas sete camadas de IA; camada sem série por estado aparece dita, não escondida). Dois pedaços: a **geometria atual** dos ativos, em snapshots `public/transporte/*.geojson` gerados por `scripts/transporte-geo.py`, e as **séries anuais por UF** em `v_series_validas` (entidade_tipo `uf`), coletadas no Railway e somadas por região na visão regional, que a barra de tempo percorre.

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
| `uf.ferro_tu` | `antt_ferro` / `series-uf:antt_ferro` | ANTT, CKAN `producao-origem-destino` (ou `ANTT_FERRO_PACOTE`) | soma de TU por UF de origem e ano |
| `uf.rodo_veiculos` | `antt_rodo` / `series-uf:antt_rodo` | ANTT, CKAN `volume-trafego-praca-pedagio` (ou `ANTT_RODO_PACOTE`) | soma do volume por UF (coluna ou sigla no nome da praça) e ano; só rodovias concedidas |

Os quatro entram em `INDICADORES_REGIONAIS` (camadaId `L2`, tema "Transporte") e ficam "sem dado" até a coleta rodar em Gestão da Pesquisa → Coletas. Nenhum foi executado contra a fonte real a partir do ambiente de desenvolvimento (sem acesso a antaq.gov.br, anac.gov.br e dados.antt.gov.br); a primeira rodada deve ser acompanhada. Os coletores da ANTT descobrem os CSVs pelo CKAN e casam colunas por nome tolerante (`indice`), e param com o cabeçalho na mensagem quando não encontram UF/volume, para ajustar os candidatos. Variáveis opcionais no Railway: `ANAC_BASICA_URL`, `ANTT_CKAN_URL`, `ANTT_FERRO_PACOTE`, `ANTT_RODO_PACOTE`.

O que as séries medem é fluxo (toneladas, passageiros, TU, veículos), não a extensão da malha: a extensão pavimentada por UF (SNV/DNIT) ainda não tem série estável para entrar.
