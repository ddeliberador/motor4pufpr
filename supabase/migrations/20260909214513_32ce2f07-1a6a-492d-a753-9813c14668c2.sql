CREATE TABLE public.research_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'Instituto de Pesquisa',
  uf text,
  municipio text,
  latitude numeric,
  longitude numeric,
  fonte text NOT NULL,
  fonte_url text NOT NULL,
  cnpj text,
  data_coleta timestamp with time zone NOT NULL DEFAULT now(),
  raw_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT research_locations_fonte_check CHECK (fonte IN ('openalex','embrapii','inep_censo_superior','mcti_formict')),
  CONSTRAINT research_locations_uf_check CHECK (uf IS NULL OR char_length(uf) = 2)
);

CREATE UNIQUE INDEX research_locations_unique_key
  ON public.research_locations (fonte, lower(nome), coalesce(uf, ''));
CREATE INDEX research_locations_uf_idx ON public.research_locations (uf);
CREATE INDEX research_locations_fonte_idx ON public.research_locations (fonte);
CREATE INDEX research_locations_tipo_idx ON public.research_locations (tipo);

GRANT SELECT ON public.research_locations TO anon;
GRANT SELECT ON public.research_locations TO authenticated;
GRANT ALL ON public.research_locations TO service_role;

ALTER TABLE public.research_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_research_locations"
  ON public.research_locations FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "service_manage_research_locations"
  ON public.research_locations FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_research_locations_updated_at
  BEFORE UPDATE ON public.research_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();