create or replace view public.v_series_validas with (security_invoker = true) as
select * from public.v_observacoes_vigentes
where periodo_referencia >= date '1950-01-01' and periodo_referencia <= current_date;
grant select on public.v_series_validas to anon, authenticated, service_role;