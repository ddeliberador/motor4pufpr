# Fontes: séries municipais das Camadas de IA (coroplético do Mapa)

Cinco bases públicas com chave municipal (código IBGE de 7 dígitos), uma por
camada onde existe base aberta, agregadas no Railway e gravadas em
`observacoes` (`entidade_tipo = 'municipio'`). O Mapa lê `v_series_validas`
e pinta os 5.570 municípios (ADR-0003). Código: `backend/app/services/series_municipais`.

| Camada | Indicador (`indicadores.id`) | Fonte | Arquivo / API | Periodicidade | Segmentos |
|---|---|---|---|---|---|
| base | `mun.populacao` | IBGE SIDRA | tabelas 6579 (estimativa) e 4714 (Censo 2022), API JSON | anual | — |
| L1 | `mun.gd_potencia_kw`, `mun.gd_unidades` | ANEEL Dados Abertos | CSV "empreendimentos de geração distribuída" (CKAN) | mensal (série anual reconstruída) | `''`, `UFV` |
| L2 | `mun.bl_acessos` | ANATEL Dados Abertos | ZIP "Acessos Banda Larga Fixa" (CSV por ano) | mensal; guardado o último mês de cada ano | `''`, `fibra` |
| L3 | `mun.estab_dados` | Receita Federal, Dados Abertos CNPJ | Estabelecimentos0..9.zip + Municipios.zip | mensal (foto) | `''` |
| L5 | `mun.estab_ti` | Receita Federal, Dados Abertos CNPJ | idem | mensal (foto) | `''` |
| L6 | `mun.ppg` | CAPES Dados Abertos | CSVs "Coleta Sucupira, programas" (CKAN) | anual | `''`, `computacao` |
| L4 | — | — | não há base pública municipal; a camada aparece só pelos atores | — | — |
| L7 | — | — | MUNIC (IBGE) a validar por edição antes de entrar | — | — |

## Como disparar

No Railway (ou local, com `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`):

```
# teste sem gravar, lendo só 200 mil linhas por arquivo
python -m app.services.series_municipais.cli anatel_bl --amostra 200000 --simular

# coleta completa de uma fonte
python -m app.services.series_municipais.cli ibge_pop
python -m app.services.series_municipais.cli todas
```

Pela API (segundo plano, responde 202):

```
POST /api/v1/coletas/municipal/ibge_pop      X-API-Key: …
GET  /api/v1/coletas/municipal               (em andamento e últimos resultados)
```

Ordem sugerida da primeira carga: `ibge_pop` (minutos), `capes_ppg` (minutos),
`anatel_bl` (dezenas de minutos), `aneel_gd` (dezenas de minutos), `cnpj_cnae`
(uma a duas horas: dez arquivos de ~1 GB). Cada execução abre uma coleta em
`ingest_runs` e atualiza `agenda_coletas` (`funcao = 'railway'`).

## Cuidados metodológicos

- CNPJ: o município da RFB é o código TOM; a conversão para IBGE é por nome +
  UF e as linhas sem casamento ficam contadas em `escopo.sem_municipio`.
- ANEEL: série reconstruída pelo cadastro vigente; unidades desativadas não
  entram (anos antigos ficam subestimados). `origem_temporal = 'reconstruida'`.
- ANATEL: fibra identificada por "fibra" em Tecnologia ou Meio de Acesso.
- Normalização por 10 mil habitantes usa a população mais recente coletada.
- Nenhuma base é pintada por aproximação: município sem dado aparece cinza.
