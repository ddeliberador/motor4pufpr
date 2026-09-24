# Roadmap — Camada permanente research_locations

## Camadas de IA do Mapa
- [x] Layer 1 — Energia: lazy load ANEEL, símbolos por geração e legenda dinâmica
- [x] Layer 3 — Infraestrutura Lógica: lazy load PeeringDB, datacenters e legenda dinâmica
- [x] Validar Layers 1 e 3 isoladas e simultâneas em desktop/mobile; falha pública do SIGEL permanece explícita quando a origem não responde

- [x] Migration `research_locations` (RLS: leitura pública, escrita service role)
- [x] Edge function `locations-ingest` (openalex, embrapii, inep_censo_superior, mcti_formict)
- [x] Exportação CSV/JSON sempre com `fonte` e `fonte_url` (`src/lib/researchLocations.ts`)
- [x] Rodar as 4 ingestões e reportar contagem real por fonte
- [ ] INEP bloqueado: `download.inep.gov.br` não aceita conexão nem do sandbox nem da função (TLS/conexão recusada). Depende de rota alternativa oficial ou de rodar a coleta em rede que alcance o domínio gov.br.

## Lote ABStartups 2025
- [x] Tabela de cache `city_geocode` (leitura pública, escrita autenticada)
- [x] Geocodificação Nominatim das 395 cidades (391 com coordenada; 4 marcadas como erro da fonte)
- [x] Função `bulk-ingest` (carga em lote protegida por `BULK_INGEST_KEY`)
- [ ] Inserir os 3.306 registros `abstartups_2025` em `research_locations` — aguardando o CSV do usuário

## Painel de políticas públicas no Mapa
- [ ] Adicionar curadoria por layer, painel flutuante e controle de abertura
- [ ] Validar expansão, recolhimento, fechamento e reabertura no navegador

