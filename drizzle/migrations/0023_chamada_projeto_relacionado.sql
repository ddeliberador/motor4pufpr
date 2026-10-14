CREATE TABLE public.chamada_projeto_relacionado (
  chamada_id integer NOT NULL REFERENCES public.chamadas_publicas(chamada_id) ON DELETE CASCADE,
  cod_projeto text NOT NULL,
  termos_em_comum text[] NOT NULL DEFAULT '{}',
  n_termos integer NOT NULL,
  origem text NOT NULL CHECK (origem IN ('termos','herdado')),
  calculado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chamada_id, cod_projeto)
);
GRANT SELECT ON public.chamada_projeto_relacionado TO anon, authenticated;
GRANT ALL ON public.chamada_projeto_relacionado TO service_role;
ALTER TABLE public.chamada_projeto_relacionado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública" ON public.chamada_projeto_relacionado FOR SELECT USING (true);

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
  select v.chamada_id, r.cod_projeto,
         array(select distinct t from unnest(array_agg_flat) t order by t), max(r.n_termos), 'herdado'
  from (select v.chamada_id, r.cod_projeto, max(r.n_termos) n_termos from chamada_desafio v join desafio_projeto_relacionado r using (desafio_id) group by 1,2) r0
  cross join lateral (select 1) z
  join chamada_desafio v on v.chamada_id = r0.chamada_id
  join desafio_projeto_relacionado r on r.desafio_id = v.desafio_id and r.cod_projeto = r0.cod_projeto
  cross join lateral (select r.termos_em_comum array_agg_flat) w
  group by v.chamada_id, r.cod_projeto
  on conflict do nothing;
  select count(*) into n from chamada_projeto_relacionado;
  return n;
end $$;
REVOKE EXECUTE ON FUNCTION public.chamadas_cruzar() FROM anon, authenticated;