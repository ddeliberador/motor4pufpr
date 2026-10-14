-- Carga única (idempotente) de indicadores_uf para observacoes. Executada em 14/10/2026.
-- Coleta fixa 5e1f0000-0000-4000-8000-000000000001: rodar de novo não duplica (índice ux_observacoes_idem).
insert into ingest_runs (id, job_id, fonte, ok, found, inserted, escopo, versao_conector)
values ('5e1f0000-0000-4000-8000-000000000001','backfill:indicadores_uf','indicadores_uf',true,
  (select count(*) from indicadores_uf where indicador in ('doutores_titulados','mestres_titulados','patentes_residentes') and ano between 2020 and 2024),0,
  '{"tabela":"indicadores_uf","anos":[2020,2024],"ufs":27}','backfill-indicadores-uf-v1')
on conflict (id) do nothing;

insert into indicadores (id, nome, unidade, natureza, periodicidade, metodologia)
select 'uf.'||indicador, initcap(replace(indicador,'_',' ')), max(unidade), 'fluxo', 'anual', 'Carga única a partir de indicadores_uf ('||max(fonte)||')'
from indicadores_uf where indicador in ('doutores_titulados','mestres_titulados','patentes_residentes') group by indicador
on conflict (id) do nothing;

insert into observacoes (indicador_id, entidade_tipo, entidade_chave, segmento, periodo_referencia, granularidade, valor, origem_temporal, capturado_em, coleta_id, metadados)
select 'uf.'||indicador, 'uf', uf, '', make_date(ano,1,1), 'ano', valor, 'serie_da_fonte', coalesce(coletado_em, now()),
  '5e1f0000-0000-4000-8000-000000000001', jsonb_build_object('fonte',fonte,'fonte_url',fonte_url,'metodo',metodo)
from indicadores_uf where indicador in ('doutores_titulados','mestres_titulados','patentes_residentes') and ano between 2020 and 2024
on conflict (indicador_id, entidade_tipo, entidade_chave, segmento, periodo_referencia, coleta_id) where coleta_id is not null do nothing;
