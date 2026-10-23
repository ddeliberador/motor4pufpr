-- Interações além da cooperação EMBRAPII (aba Interação do Mapa).
-- 1) Vista de fluxos UF→UF para qualquer fonte/tipo/dimensão (a vw_interacao_fluxo_uf
--    original, filtrada em dimensao = 'acao', continua intacta para os sistemas estaduais).
create or replace view public.vw_interacao_fluxo_uf_tipos with (security_invoker = true) as
select l.fonte, l.tipo, l.dimensao, l.origem_helice, l.destino_helice, l.ano,
       coalesce(l.tecnologia, 'Não classificado') as tecnologia,
       l.origem_uf, co.lat as origem_lat, co.lon as origem_lon,
       l.destino_uf, cd.lat as destino_lat, cd.lon as destino_lon,
       -- Linhas com metadados.peso (ex.: coautoria OpenAlex, uma linha por par-ano com o número de obras) pesam o peso; as demais, 1.
       sum(coalesce((l.metadados->>'peso')::numeric, 1))::bigint as lacos,
       count(distinct l.referencia) as projetos,
       count(distinct l.destino_id) as destinos,
       sum(l.valor) as valor_rateado
from public.vw_interacao_lacos l
left join public.uf_centroides co on co.uf = l.origem_uf
left join public.uf_centroides cd on cd.uf = l.destino_uf
group by l.fonte, l.tipo, l.dimensao, l.origem_helice, l.destino_helice, l.ano, coalesce(l.tecnologia, 'Não classificado'),
         l.origem_uf, co.lat, co.lon, l.destino_uf, cd.lat, cd.lon;
grant select on public.vw_interacao_fluxo_uf_tipos to anon, authenticated, service_role;

-- Catálogo do que existe em interacoes (fonte, tipo, dimensão, hélices, anos, laços).
create or replace view public.vw_interacao_catalogo with (security_invoker = true) as
select fonte, tipo, dimensao, origem_helice, destino_helice, min(ano) as ano_min, max(ano) as ano_max,
       sum(coalesce((metadados->>'peso')::numeric, 1))::bigint as lacos,
       count(distinct tecnologia) filter (where tecnologia is not null) as tecnologias
from public.interacoes group by 1,2,3,4,5;
grant select on public.vw_interacao_catalogo to anon, authenticated, service_role;

-- 2) Desafio público → solução (projeto EMBRAPII relacionado): governo → ICT, dimensão ação.
create or replace function public.desafios_derivar_interacoes()
returns integer language plpgsql security definer set search_path to 'public' as $$
declare n integer;
begin
  insert into public.interacoes (id, fonte, tipo, dimensao, origem_helice, origem_subtipo, origem_id, origem_nome, origem_uf,
    destino_helice, destino_subtipo, destino_id, destino_nome, destino_uf, data_evento, valor, referencia, tecnologia, metadados, atualizado_em)
  select 'desafios|' || r.desafio_id || '|' || r.cod_projeto, 'desafios', 'desafio_solucao', 'acao',
         -- desafios_publicos.uf é texto livre ("BR", "Nordeste", "Amazônia Legal"); só siglas valem como UF,
         -- o resto fica em metadados.abrangencia e o nó de origem sem UF (sem arco no mapa, mas contado).
         'governo', d.esfera, d.desafio_id, d.orgao,
         case when upper(trim(d.uf)) ~ '^[A-Z]{2}$' and upper(trim(d.uf)) <> 'BR' then upper(trim(d.uf))::character(2) end,
         'ict', u.tipo_instituicao, u.co_unidade::text, u.unidade_embrapii, u.uf,
         coalesce(make_date(d.ano, 1, 1), p.dt_contrato), d.valor_rs, r.cod_projeto, p.cl_techab_n1,
         jsonb_build_object('desafio', d.nome, 'projeto', p.proj_titulo_publico, 'termos_em_comum', r.termos_em_comum, 'n_termos', r.n_termos,
                            'abrangencia', nullif(trim(d.uf), ''),
                            'metodo', 'cruzamento textual desafios_cruzar(); correspondência não é prova de contratação'),
         now()
  from public.desafio_projeto_relacionado r
  join public.desafios_publicos d on d.desafio_id = r.desafio_id
  join public.embrapii_projetos p on p.cod_projeto = r.cod_projeto
  left join public.embrapii_unidades u on u.co_unidade = p.ue_codigo
  on conflict (id) do update set valor = excluded.valor, tecnologia = excluded.tecnologia, metadados = excluded.metadados, atualizado_em = now();
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.desafios_derivar_interacoes() from public, anon, authenticated;
grant execute on function public.desafios_derivar_interacoes() to service_role;

-- 3) Gravação em lote de interações vindas do Railway (coautoria OpenAlex etc.), pela função series-municipais.
create or replace function public.interacoes_upsert(p_linhas jsonb)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare n integer;
begin
  insert into public.interacoes (id, fonte, tipo, dimensao, origem_helice, origem_subtipo, origem_id, origem_nome, origem_uf,
    destino_helice, destino_subtipo, destino_id, destino_nome, destino_uf, data_evento, valor, referencia, tecnologia, metadados, atualizado_em)
  select x.id, x.fonte, x.tipo, x.dimensao, x.origem_helice, x.origem_subtipo, x.origem_id, x.origem_nome,
         case when upper(trim(x.origem_uf)) ~ '^[A-Z]{2}$' then upper(trim(x.origem_uf))::character(2) end,
         x.destino_helice, x.destino_subtipo, x.destino_id, x.destino_nome,
         case when upper(trim(x.destino_uf)) ~ '^[A-Z]{2}$' then upper(trim(x.destino_uf))::character(2) end,
         x.data_evento, x.valor, x.referencia, x.tecnologia, x.metadados, now()
  from jsonb_to_recordset(p_linhas) as x(id text, fonte text, tipo text, dimensao text, origem_helice text, origem_subtipo text, origem_id text, origem_nome text, origem_uf text,
       destino_helice text, destino_subtipo text, destino_id text, destino_nome text, destino_uf text, data_evento date, valor numeric, referencia text, tecnologia text, metadados jsonb)
  on conflict (id) do update set valor = excluded.valor, data_evento = excluded.data_evento, tecnologia = excluded.tecnologia,
    origem_uf = excluded.origem_uf, destino_uf = excluded.destino_uf, origem_nome = excluded.origem_nome, destino_nome = excluded.destino_nome,
    metadados = excluded.metadados, atualizado_em = now();
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.interacoes_upsert(jsonb) from public, anon, authenticated;
grant execute on function public.interacoes_upsert(jsonb) to service_role;

insert into public.agenda_coletas (job, funcao, cron, descricao) values
  ('interacoes:openalex_coautoria', 'railway', 'anual', 'OpenAlex: coautoria entre instituições brasileiras por ano (ict↔ict, resultado)')
on conflict (job) do nothing;
