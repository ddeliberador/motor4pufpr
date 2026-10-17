-- lovable-cron-fallback-reviewed: lote limitado por taxa da API; job se desagenda quando a fila esvazia (drain), religado só pela rodada mensal
create type public.precisao_coordenada as enum ('endereco', 'cep', 'municipio');

create table public.cnpj_cadastro (
  cnpj text primary key check (cnpj ~ '^[0-9]{14}$'),
  razao_social text, nome_fantasia text, situacao_cadastral text, data_abertura date,
  porte text, mei boolean, cnae_principal text, cnae_principal_descricao text,
  cnaes_secundarios text[] not null default '{}',
  logradouro text, numero text, complemento text, bairro text,
  cep text check (cep is null or cep ~ '^[0-9]{8}$'),
  municipio_ibge text, municipio text, uf character(2),
  capturado_em timestamptz not null default now(),
  fonte text not null default 'brasilapi_cnpj',
  versao_conector text
);
grant select on public.cnpj_cadastro to authenticated;
grant all on public.cnpj_cadastro to service_role;
alter table public.cnpj_cadastro enable row level security;
create policy "cnpj_cadastro leitura autenticada" on public.cnpj_cadastro for select to authenticated using (true);

create table public.cnpj_geocodificado (
  cnpj text primary key references public.cnpj_cadastro(cnpj) on delete cascade,
  latitude double precision, longitude double precision,
  precisao public.precisao_coordenada not null,
  metodo text not null, fonte_coordenada text not null,
  lat_cep double precision, lon_cep double precision,
  lat_municipio double precision, lon_municipio double precision,
  geocodificado_em timestamptz not null default now()
);
grant select on public.cnpj_geocodificado to authenticated;
grant all on public.cnpj_geocodificado to service_role;
alter table public.cnpj_geocodificado enable row level security;
create policy "cnpj_geocodificado leitura autenticada" on public.cnpj_geocodificado for select to authenticated using (true);

create table public.cnpj_pendencias (
  cnpj text primary key,
  motivo text not null,
  http_status integer,
  tentativas integer not null default 1,
  ultima_tentativa timestamptz not null default now()
);
grant select on public.cnpj_pendencias to authenticated;
grant all on public.cnpj_pendencias to service_role;
alter table public.cnpj_pendencias enable row level security;
create policy "cnpj_pendencias leitura autenticada" on public.cnpj_pendencias for select to authenticated using (true);

create table public.cep_coordenada (
  cep text primary key check (cep ~ '^[0-9]{8}$'),
  latitude double precision, longitude double precision,
  municipio_ibge text, municipio text, uf character(2),
  servico text, http_status integer,
  consultado_em timestamptz not null default now()
);
grant select on public.cep_coordenada to authenticated;
grant all on public.cep_coordenada to service_role;
alter table public.cep_coordenada enable row level security;
create policy "cep_coordenada leitura autenticada" on public.cep_coordenada for select to authenticated using (true);

create or replace view public.vw_cnpj_conhecidos with (security_invoker = true) as
select distinct c as cnpj from (
  select regexp_replace(cnpj, '\D', '', 'g') c from public.vw_atores_sni
  union all select regexp_replace(empresa_cnpj, '\D', '', 'g') from public.embrapii_projeto_empresa
  union all select regexp_replace(cnpj, '\D', '', 'g') from public.research_locations
  union all select regexp_replace(cnpj, '\D', '', 'g') from public.staging_locations
) s where c ~ '^[0-9]{14}$';
revoke all on public.vw_cnpj_conhecidos from anon, authenticated;
grant select on public.vw_cnpj_conhecidos to service_role;

create or replace function public.cnpj_fila(p_limite integer)
returns table(cnpj text) language sql stable security definer set search_path to 'public' as $$
  select k.cnpj from public.vw_cnpj_conhecidos k
  left join public.cnpj_cadastro c using (cnpj)
  left join public.cnpj_pendencias p using (cnpj)
  where (c.cnpj is null or c.capturado_em < now() - interval '90 days')
    and (p.cnpj is null or p.ultima_tentativa < now() - interval '30 days')
  order by (c.cnpj is not null), k.cnpj
  limit p_limite
$$;
revoke execute on function public.cnpj_fila(integer) from public, anon, authenticated;

create or replace view public.vw_atores_localizados as
select c.cnpj, c.razao_social, c.cnae_principal, c.cnae_principal_descricao, c.uf, c.municipio, c.mei,
  case when c.mei and g.precisao = 'endereco' then (case when g.lat_cep is not null then 'cep' else 'municipio' end)::public.precisao_coordenada
       else g.precisao end as precisao,
  case when c.mei and g.precisao = 'endereco' then coalesce(g.lat_cep, g.lat_municipio) else g.latitude end as latitude,
  case when c.mei and g.precisao = 'endereco' then coalesce(g.lon_cep, g.lon_municipio) else g.longitude end as longitude,
  g.fonte_coordenada, g.geocodificado_em, c.capturado_em
from public.cnpj_cadastro c join public.cnpj_geocodificado g using (cnpj);
grant select on public.vw_atores_localizados to anon, authenticated;
grant all on public.vw_atores_localizados to service_role;

create or replace function public.coleta_cnpj_disparar()
returns bigint language sql security definer set search_path to 'public', 'net' as $$
  select net.http_post(
    url := 'https://jtoeinerhvxxgoeicrif.supabase.co/functions/v1/coleta-cnpj',
    headers := jsonb_build_object('Content-Type','application/json','x-coleta-key', public.vault_read_secret_by_name('coleta_temporal_key')),
    body := '{"esperar":true}'::jsonb,
    timeout_milliseconds := 180000);
$$;
revoke execute on function public.coleta_cnpj_disparar() from public, anon, authenticated;

create or replace function public.coleta_cnpj_agendar(p_ligar boolean)
returns text language plpgsql security definer set search_path to 'public', 'cron' as $$
begin
  if p_ligar then
    if not exists (select 1 from cron.job where jobname = 'coleta-cnpj-lotes') then
      perform cron.schedule('coleta-cnpj-lotes', '*/10 * * * *', 'select public.coleta_cnpj_disparar()');
    end if;
    return 'agendado';
  end if;
  if exists (select 1 from cron.job where jobname = 'coleta-cnpj-lotes') then
    perform cron.unschedule('coleta-cnpj-lotes');
  end if;
  return 'desagendado';
end $$;
revoke execute on function public.coleta_cnpj_agendar(boolean) from public, anon, authenticated;
grant execute on function public.coleta_cnpj_agendar(boolean) to service_role;
grant execute on function public.cnpj_fila(integer) to service_role;
