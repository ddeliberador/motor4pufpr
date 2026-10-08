# Project architecture rules

- Keep the consolidated public data-source catalog on `/bases`; `/documentacao` only links to it, so source metadata has one public home.
- Gráficos e painéis do BI guardam apenas a receita da consulta (`custom_charts`/`custom_dashboards`/`dashboard_items`) e reexecutam contra as bases reais, para nunca congelar números.
- Bases do construtor de BI leem pela mesma camada de consumo do `/mapa` (Gold, função `map-infrastructure`, snapshots em `public/`), nunca abrindo tabelas fechadas — um só caminho de dados por base.
- Exiba todo grau de dependência em uma escala compartilhada de 0–100, com as mesmas faixas do índice CD do Motor, por meio do termômetro reutilizável.
- Mantenha a relação entre eixos do PBIA e camadas de IA em um único cenário analítico, evitando painéis narrativos duplicados.
- A "Nota de capacidade" (Cenário 2) é calculada no cliente a partir de `capacidade_pesos`, `v_capacidade_uf_contagens` e `indicadores_uf`; indicador sem linhas fica indisponível (fora da nota), nunca zero.
- Dados de interação (EMBRAPII) são lidos só das views `vw_interacao_*`/`vw_embrapii_*` e de `interacao_metricas_rede`, com paginação; percentuais sempre como razão de somas — evita distorção por média de percentuais.
