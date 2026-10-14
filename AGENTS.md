# Project architecture rules

- Normalize datacenter state names and abbreviations to canonical UF codes in the shared frontend loader before aggregation, so charts, cards and lists count each state consistently without dropping installations.

- Scenario 1 cards and state panels share MetricaCartao for primary metric presentation, keeping icon, value, label and unavailable states consistent without changing data sources.

- Keep the consolidated public data-source catalog on `/bases`; `/documentacao` only links to it, so source metadata has one public home.
- Scenario 1 shares the loaded energy-balance rows and selected UF between the balance map and infrastructure crossover; this avoids duplicate reads and keeps state selection synchronized.
- Scenario 1 state detail panels consume already loaded infrastructure data and deterministic evidence-based signals, not new queries or AI-generated viability claims; this keeps drill-down consistent with the charts.
- Gráficos e painéis do BI guardam apenas a receita da consulta (`custom_charts`/`custom_dashboards`/`dashboard_items`) e reexecutam contra as bases reais, para nunca congelar números.
- Bases do construtor de BI leem pela mesma camada de consumo do `/mapa` (Gold, função `map-infrastructure`, snapshots em `public/`), nunca abrindo tabelas fechadas — um só caminho de dados por base.
- Exiba todo grau de dependência em uma escala compartilhada de 0–100, com as mesmas faixas do índice CD do Motor, por meio do termômetro reutilizável.
- Mantenha a relação entre eixos do PBIA e camadas de IA em um único cenário analítico, evitando painéis narrativos duplicados.
- A "Nota de capacidade" (Cenário 2) é calculada no cliente a partir de `capacidade_pesos`, `v_capacidade_uf_contagens` e `indicadores_uf`; indicador sem linhas fica indisponível (fora da nota), nunca zero.
- Dados de interação (EMBRAPII) são lidos só das views `vw_interacao_*`/`vw_embrapii_*` e de `interacao_metricas_rede`, com paginação; percentuais sempre como razão de somas — evita distorção por média de percentuais.
- State-system analysis reads existing state views through the frontend client with server-side UF filters and ordered pagination; actor drill-down resolves multi-label classifications in bounded ID batches so no join or schema change is required.
- Cenário 1 lê energia de `vw_energia_uf`/`vw_energia_uf_tipo` e cabos de `vw_cabos_uf`, derivadas das mesmas tabelas que a função `map-infrastructure` serve ao Mapa e ao BI; fonte que falha mostra "indisponível", nunca zero, e só cabos com `internacional = true` contam como conexão com o exterior. Balanço energético (geração × consumo, classes, per capita) vem de `vw_energia_balanco_uf`, `vw_energia_consumo_classe_uf` e `vw_energia_serie_uf` (EPE); a situação do estado compara sua relação geração/consumo com a do Brasil, nunca com 100%, porque a geração inclui perdas e autoprodução.
- Apontamentos de infraestrutura por UF (pontos críticos, oportunidades, contexto) vêm só de `fn_uf_infra_apontamentos`, com regras em `infra_regras_uf`; o cliente passa a contagem de datacenters que exibe e não escreve apontamentos próprios.
