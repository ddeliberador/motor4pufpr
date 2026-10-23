# Interações entre atores (tabela `interacoes`) — o que alimenta a aba Interação do Mapa

A aba Interação do `/mapa` lê a view `vw_interacao_fluxo_uf_tipos` (fonte, tipo, dimensão, hélices, ano, tecnologia, par de UFs com centroides, laços, projetos, destinos, valor rateado) e o catálogo `vw_interacao_catalogo` (o que existe, com anos e laços por tipo). Cada linha de `interacoes` liga duas hélices (ICT, empresa, governo) numa dimensão (ação, recurso, resultado). A view original `vw_interacao_fluxo_uf` (só dimensão ação) continua servindo os sistemas estaduais e não deve mudar.

Linhas com `metadados.peso` contam o peso como laços (coautoria OpenAlex: uma linha por par e ano com o número de obras); as demais contam 1.

## Tipos disponíveis (catálogo em `src/components/mapa/CamadaInteracao.tsx`)

| fonte:tipo | Dimensão | Hélices | De onde vem | Observações |
|---|---|---|---|---|
| `embrapii:cooperacao_pdi` | ação | ICT → empresa | projetos EMBRAPII (`embrapii_projetos` × unidades), derivação já existente | tem a camada de unidades credenciadas |
| `embrapii:aporte_empresa` | recurso | empresa → ICT | contrapartida da empresa no projeto | mesma base, sentido inverso |
| `embrapii:financiamento_publico` | recurso | governo → ICT | recurso não reembolsável EMBRAPII | origem sem UF (nacional): aparece como círculo na UF que recebe |
| `embrapii:pedido_pi` | resultado | ICT → empresa | pedidos de PI dos projetos | |
| `desafios:desafio_solucao` | ação | governo → ICT | `desafios_derivar_interacoes()`: `desafio_projeto_relacionado` ⋈ `desafios_publicos` ⋈ `embrapii_projetos` ⋈ `embrapii_unidades` | correspondência textual, não contratação; `desafios_publicos.uf` é texto livre ("BR", "Nordeste"): só siglas viram UF, o resto fica em `metadados.abrangencia` |
| `openalex:coautoria` | resultado | ICT ↔ ICT | coletor Railway `openalex_coautoria` (ver abaixo) | gravado via `interacoes_upsert` pela função `series-municipais` (ação `interacoes`) |

Tipos cuja coleta ainda não rodou aparecem desabilitados na aba com a explicação, nunca com dado inventado.

## Coletor OpenAlex (coautoria)

- Código: `backend/app/services/series_municipais/coletores/openalex_coautoria.py`; disparo em Gestão da Pesquisa → Coletas (fonte `openalex_coautoria`) ou `python -m app.services.series_municipais.cli openalex_coautoria`.
- Método: instituições do Brasil (`type:education|facility`, `works_count > 300`) e, para cada instituição e ano desde 2014, `GET /works?filter=authorships.institutions.lineage:I…,publication_year:A&group_by=authorships.institutions.lineage`. Cada grupo é um par A–B no ano; o par aparece dos dois lados e fica com o maior valor; pares com menos de 3 obras não entram. UF por `geo.region`.
- Limites: o `group_by` devolve os 200 maiores coautores de cada instituição, então pares pequenos entre instituições muito produtivas podem faltar; o número de obras é afiliação dupla, não projeto conjunto. Variável opcional `OPENALEX_MAILTO` no Railway coloca as consultas no polite pool.
- Ainda não executado contra a API real (o ambiente de desenvolvimento não alcança api.openalex.org); a primeira execução deve ser acompanhada em Coletas.

## Candidatos a próximos tipos

- CNPq bolsas e auxílios (governo → ICT/pesquisador, recurso).
- PNCP contratações de IA (governo → empresa, recurso).
- Patentes INPI com cotitularidade ICT–empresa (resultado).
