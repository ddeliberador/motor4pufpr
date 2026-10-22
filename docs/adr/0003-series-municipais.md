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
