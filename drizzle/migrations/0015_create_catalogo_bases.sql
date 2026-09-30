CREATE TYPE public.caminho_consumo AS ENUM ('gold_tabela','funcao_mapa','snapshot_publico','api_cliente','funcao_motor');

CREATE TABLE public.catalogo_bases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  nome text NOT NULL,
  mantenedor text,
  nacionalidade text,
  uso text,
  nota text,
  licenca text,
  url text,
  situacao text NOT NULL DEFAULT 'Ativa',
  ativa boolean NOT NULL DEFAULT true,
  usos text[] NOT NULL DEFAULT '{}',
  grupo text,
  camada_mapa text,
  pilar text,
  subpilar text,
  tipo_acesso text,
  autenticacao text,
  proximo_passo text,
  caminho_consumo public.caminho_consumo,
  alvo text,
  colunas jsonb NOT NULL DEFAULT '[]'::jsonb,
  doc_md text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.catalogo_bases TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.catalogo_bases TO authenticated;
GRANT ALL ON public.catalogo_bases TO service_role;

ALTER TABLE public.catalogo_bases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalogo_leitura_publica" ON public.catalogo_bases FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalogo_admin_insert" ON public.catalogo_bases FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "catalogo_admin_update" ON public.catalogo_bases FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "catalogo_admin_delete" ON public.catalogo_bases FOR DELETE TO authenticated USING (public.is_admin());

CREATE TRIGGER catalogo_bases_updated_at BEFORE UPDATE ON public.catalogo_bases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.mapa_inovacao_fontes IS 'DEPRECATED: substituída por catalogo_bases (fonte única do catálogo).';