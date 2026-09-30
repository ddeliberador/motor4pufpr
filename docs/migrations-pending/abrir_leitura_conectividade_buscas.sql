-- Libera leitura pública (somente SELECT) de duas bases que já alimentam o Mapa e o Motor,
-- para uso no construtor de gráficos e em painéis publicados. Escrita continua bloqueada.
GRANT SELECT ON public.infra_backhaul_municipio TO anon, authenticated;
CREATE POLICY "leitura_publica_backhaul" ON public.infra_backhaul_municipio
  FOR SELECT TO anon, authenticated USING (true);

-- search_snapshots guarda só tema e índices agregados (sem usuário/IP).
GRANT SELECT ON public.search_snapshots TO anon, authenticated;
CREATE POLICY "leitura_publica_snapshots" ON public.search_snapshots
  FOR SELECT TO anon, authenticated USING (true);
