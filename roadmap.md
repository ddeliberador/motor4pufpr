# Roadmap — Camada permanente research_locations

- [ ] Migration `research_locations` (RLS: leitura pública, escrita service role)
- [ ] Edge function `locations-ingest` (openalex, embrapii, inep_censo_superior, mcti_formict)
- [ ] Exportação CSV/JSON sempre com `fonte` e `fonte_url`
- [ ] Rodar as 4 ingestões uma vez e reportar contagem real por fonte
- [ ] Registrar falhas explicitamente (EMBRAPII/INEP), sem estimativa ou dado inventado
