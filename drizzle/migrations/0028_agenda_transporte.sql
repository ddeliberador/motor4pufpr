-- Séries de transporte por UF (visão regional): coletas no Railway pelo canal series-municipais.
insert into public.agenda_coletas (job, funcao, cron, descricao) values
  ('series-uf:antaq_portos', 'railway', 'anual', 'ANTAQ: toneladas movimentadas por UF e ano (uf.porto_toneladas)'),
  ('series-uf:anac_aero', 'railway', 'anual', 'ANAC: passageiros embarcados por UF e ano (uf.aero_passageiros)')
on conflict (job) do nothing;
