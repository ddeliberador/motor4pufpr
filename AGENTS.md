# Project architecture rules

- Keep the consolidated public data-source catalog on `/bases`; `/documentacao` only links to it, so source metadata has one public home.
- Gráficos e painéis do BI guardam apenas a receita da consulta (`custom_charts`/`custom_dashboards`/`dashboard_items`) e reexecutam contra as bases reais, para nunca congelar números.
