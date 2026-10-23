# ADR-0003 — Séries municipais das Camadas de IA (coroplético)
Data: 2026-10-21  
Status: aceita e implementada (branch `mapa-maplibre`), primeira carga pendente no Railway  
Decidido por: Décio Dalton Deliberador Filho

## Contexto

Com o mapa em MapLibre e a malha municipal (ADR-0002), o Mapa da Inovação
passou a poder pintar os 5.570 municípios. Faltava dado com essa chave. A
pergunta foi: o que existe de público, por município, dentro das 7 camadas de
IA, para popular o mapa ao máximo sem inventar cobertura.

## Decisão

1. **Reusar a camada temporal.** Nada de tabela nova por fonte: as séries
   entram em `observacoes` com `entidade_tipo = 'municipio'` e
   `entidade_chave` = código IBGE, passando por `ingest_runs`, `indicadores` e
   `agenda_coletas` como as séries por UF. O Mapa lê `v_series_validas`.
2. **Coletores no Railway, não em Edge Function.** Os arquivos têm de
   centenas de MB (ANATEL, CAPES) a dezenas de GB (CNPJ); o backend Python
   baixa em disco, agrega em streaming e entrega só o resultado, em lotes, à
   Edge Function `series-municipais`, autenticado pela `MCTI_API_KEY`; a
   função grava pela camada temporal compartilhada (`_shared/temporal.ts`),
   então o Railway não precisa da service role do banco
   (`backend/app/services/series_municipais`). Disparo por
   CLI ou `POST /api/v1/coletas/municipal/{fonte}`; `agenda_coletas` registra
   `funcao = 'railway'`.
3. **Uma base por camada onde há base aberta**: ANEEL GD (L1), ANATEL banda
   larga (L2), CNPJ CNAE 631 (L3), CNPJ CNAE 62 (L5), CAPES Sucupira (L6), e
   IBGE população como base de normalização. L4 e L7 ficam explicitamente sem
   coroplético, com o motivo na interface.
4. **Leitura tolerante.** Cabeçalhos casados por candidatos normalizados,
   separador e codificação detectados, `--amostra` e `--simular` para testar
   sem gravar, e falha explícita (nada gravado) quando uma coluna não é
   encontrada ou a coleta não produz observações.
5. **No Mapa**, o coroplético é um controle da aba Camadas de IA: indicador,
   segmento, normalização por 10 mil habitantes e régua de tempo. Classes por
   quantis (5), município sem dado em cinza, cor via `feature-state`.

## Consequências

- O mapa ganha cobertura municipal real em cinco camadas, com série histórica
  (pedido do Prof. Shima) e normalização por população.
- A primeira carga precisa ser disparada no Railway com `SUPABASE_URL`
  configurada (a `MCTI_API_KEY` já existe lá); os formatos das fontes foram
  implementados pelo layout publicado e testados com arquivos sintéticos, e a
  primeira execução real deve ser feita com `--amostra --simular`.
- Bases pesadas (CNPJ) levam horas: rodar mensalmente, fora do horário de uso.

## Adendo (2026-10-22): nível municipal dentro das camadas, síntese e ano único

- O controle "Coroplético municipal" à parte foi removido. Cada camada da
  coluna lateral ganhou um bloco "Municípios" com os seus indicadores
  (`MunicipiosDaCamada`); escolher um pinta os 5.570 municípios com ele.
- O mapa abre na aba Camadas de IA com as 7 layers ligadas e os municípios
  preenchidos pela **síntese das camadas**: para cada camada com base
  municipal, o município recebe o posto percentual (0–100) no último período
  até o ano em foco; a síntese é a média das camadas com dado. L4 e L7 não
  entram (sem base municipal). Município sem dado em nenhuma camada fica cinza.
  A síntese é um resumo de posição relativa, não uma medida absoluta de
  maturidade; serve para leitura comparativa e precisa ser explicada assim.
- A barra de série histórica passou a ter um **ano único** (`anoFoco`) para
  tudo que está ligado; cada visão lê o seu recorte desse ano.
- As coletas ganharam um painel em Gestão da Pesquisa → Coletas (só
  administradores), via Edge Function `coletas-municipais`, que repassa ao
  Railway com a `MCTI_API_KEY`. Não é mais preciso terminal para a carga.

## Adendo 2 (out/2026): interações entre atores pelo mesmo canal

O canal Railway → função `series-municipais` ganhou a ação `interacoes`, que recebe lotes de linhas da tabela `interacoes` e grava via `interacoes_upsert(jsonb)` (upsert por id, UF validada por regex). O primeiro coletor é `openalex_coautoria` (ver `docs/fontes/interacoes.md`). A decisão de reaproveitar o canal, em vez de criar outra função, mantém uma só porta autenticada pela `MCTI_API_KEY` para tudo que o Railway escreve no banco.
