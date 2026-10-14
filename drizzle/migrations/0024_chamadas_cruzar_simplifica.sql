CREATE OR REPLACE FUNCTION public.chamadas_cruzar() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare n int;
begin
  delete from chamada_projeto_relacionado where chamada_id is not null;
  insert into chamada_projeto_relacionado (chamada_id, cod_projeto, termos_em_comum, n_termos, origem)
  with pl as (select cod_projeto::text cod_projeto, lex from embrapii_projetos p, unnest(tsvector_to_array(to_tsvector('portuguese', coalesce(proj_titulo_publico,'')))) lex where length(lex) >= 4),
  df as (select lex, count(distinct cod_projeto) n from pl group by lex),
  cl as (select c.chamada_id, lex from chamadas_publicas c, unnest(tsvector_to_array(to_tsvector('portuguese', c.nome || ' ' || coalesce(c.tema,'')))) lex
         where length(lex) >= 4 and lex not in (select termo from desafio_termos_ignorados)
           and not exists (select 1 from chamada_desafio v where v.chamada_id = c.chamada_id))
  select cl.chamada_id, pl.cod_projeto, array_agg(cl.lex order by cl.lex), count(*)::int, 'termos'
  from cl join pl using (lex) join df using (lex) where df.n <= 40 group by 1,2 having count(*) >= 2;
  insert into chamada_projeto_relacionado (chamada_id, cod_projeto, termos_em_comum, n_termos, origem)
  select chamada_id, cod_projeto, array_agg(distinct t order by t), count(distinct t)::int, 'herdado'
  from (select v.chamada_id, r.cod_projeto, unnest(r.termos_em_comum) t
        from chamada_desafio v join desafio_projeto_relacionado r using (desafio_id)) s
  group by 1,2;
  get diagnostics n = row_count;
  select count(*) into n from chamada_projeto_relacionado;
  return n;
end $$;
REVOKE EXECUTE ON FUNCTION public.chamadas_cruzar() FROM anon, authenticated;
SELECT public.chamadas_cruzar();