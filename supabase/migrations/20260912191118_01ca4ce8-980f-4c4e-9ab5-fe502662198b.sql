CREATE TABLE public.mapa_inovacao_fontes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pilar text NOT NULL,
  subpilar text,
  fonte text NOT NULL,
  dados_chave text,
  tipo_acesso text,
  endpoint_url text,
  autenticacao text,
  status_pesquisa text,
  proximo_passo text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mapa_inovacao_fontes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.mapa_inovacao_fontes TO authenticated;
GRANT ALL ON public.mapa_inovacao_fontes TO service_role;
ALTER TABLE public.mapa_inovacao_fontes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_mapa_fontes" ON public.mapa_inovacao_fontes FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_mapa_fontes" ON public.mapa_inovacao_fontes FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin_update_mapa_fontes" ON public.mapa_inovacao_fontes FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_delete_mapa_fontes" ON public.mapa_inovacao_fontes FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER update_mapa_inovacao_fontes_updated_at BEFORE UPDATE ON public.mapa_inovacao_fontes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();