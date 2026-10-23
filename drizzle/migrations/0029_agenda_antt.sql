-- Séries de transporte por UF (L2 · Infraestrutura física): ferrovias e rodovias concedidas, ANTT.
insert into public.agenda_coletas (job, funcao, cron, descricao) values
  ('series-uf:antt_ferro', 'railway', 'anual', 'ANTT: carga ferroviária originada por UF e ano (uf.ferro_tu)'),
  ('series-uf:antt_rodo', 'railway', 'anual', 'ANTT: veículos nas praças de pedágio das concessões federais por UF e ano (uf.rodo_veiculos)')
on conflict (job) do nothing;
