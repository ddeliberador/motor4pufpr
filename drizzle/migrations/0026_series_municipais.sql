-- Séries municipais das Camadas de IA (ADR-0003).
-- As observações já cabem em public.observacoes (entidade_tipo = 'municipio',
-- entidade_chave = código IBGE de 7 dígitos); aqui entram só o índice de leitura,
-- a função que lista os períodos disponíveis de um indicador municipal (o
-- PostgREST não faz DISTINCT) e a agenda dos coletores, que rodam no Railway.

create index if not exists ix_observacoes_municipio
  on public.observacoes (indicador_id, periodo_referencia, segmento)
  where entidade_tipo = 'municipio';

-- Períodos disponíveis (vigentes) de um indicador municipal, com cobertura.
create or replace function public.mun_serie_periodos(p_indicador text, p_segmento text default '')
returns table(periodo_referencia date, granularidade text, municipios bigint)
language sql stable security invoker set search_path to 'public' as $$
  select periodo_referencia, granularidade, count(distinct entidade_chave)
  from public.v_series_validas
  where indicador_id = p_indicador and entidade_tipo = 'municipio' and coalesce(segmento, '') = coalesce(p_segmento, '')
  group by periodo_referencia, granularidade
  order by periodo_referencia
$$;
grant execute on function public.mun_serie_periodos(text, text) to anon, authenticated, service_role;

-- Segmentos disponíveis de um indicador municipal.
create or replace function public.mun_serie_segmentos(p_indicador text)
returns table(segmento text, periodos bigint)
language sql stable security invoker set search_path to 'public' as $$
  select coalesce(segmento, ''), count(distinct periodo_referencia)
  from public.v_series_validas
  where indicador_id = p_indicador and entidade_tipo = 'municipio'
  group by 1 order by 1
$$;
grant execute on function public.mun_serie_segmentos(text) to anon, authenticated, service_role;

-- Agenda: a função 'railway' indica que o job é disparado no backend
-- (POST /api/v1/coletas/municipal/{fonte}), não pelo pg_cron.
insert into public.agenda_coletas (job, funcao, cron, descricao) values
  ('series-municipais:ibge_pop',  'railway', 'anual (julho)',   'IBGE SIDRA: população residente por município (base de normalização)'),
  ('series-municipais:anatel_bl', 'railway', 'mensal',          'ANATEL: acessos de banda larga fixa por município (L2), total e fibra'),
  ('series-municipais:aneel_gd',  'railway', 'mensal',          'ANEEL: geração distribuída por município (L1), potência e unidades acumuladas'),
  ('series-municipais:cnpj_cnae', 'railway', 'mensal',          'Receita/CNPJ: estabelecimentos ativos CNAE 62 (L5) e 631 (L3) por município'),
  ('series-municipais:capes_ppg', 'railway', 'anual',           'CAPES Sucupira: programas de pós-graduação por município (L6), total e Computação')
on conflict (job) do nothing;
