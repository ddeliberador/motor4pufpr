GRANT SELECT ON public.infra_backhaul_municipio TO anon, authenticated;
DROP POLICY IF EXISTS "public_read_backhaul" ON public.infra_backhaul_municipio;
CREATE POLICY "public_read_backhaul"
  ON public.infra_backhaul_municipio
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.mapa_inovacao_fontes TO anon, authenticated;
DROP POLICY IF EXISTS "auth_read_mapa_fontes" ON public.mapa_inovacao_fontes;
DROP POLICY IF EXISTS "public_read_mapa_fontes" ON public.mapa_inovacao_fontes;
CREATE POLICY "public_read_mapa_fontes"
  ON public.mapa_inovacao_fontes
  FOR SELECT
  TO anon, authenticated
  USING (true);