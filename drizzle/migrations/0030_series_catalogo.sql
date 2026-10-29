-- Catálogo vivo das séries: o Mapa só lista indicadores que têm dado de verdade.
create or replace function public.series_catalogo()
returns table(indicador_id text, entidade_tipo text, segmento text, ano_min integer, ano_max integer, entidades bigint, periodos bigint)
language sql stable security invoker set search_path = public as $$
  select indicador_id, entidade_tipo, coalesce(segmento,'') as segmento,
         min(extract(year from periodo_referencia))::int, max(extract(year from periodo_referencia))::int,
         count(distinct entidade_chave), count(distinct periodo_referencia)
  from public.v_series_validas
  where entidade_tipo in ('uf','municipio') and valor is not null
  group by 1,2,3
$$;
grant execute on function public.series_catalogo() to anon, authenticated, service_role;
