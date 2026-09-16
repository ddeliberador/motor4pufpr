CREATE TABLE public.location_enrichment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.research_locations(id) ON DELETE CASCADE,
  fonte text NOT NULL,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  fonte_coleta text NOT NULL,
  data_coleta timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id)
);

GRANT SELECT ON public.location_enrichment TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.location_enrichment TO authenticated;
GRANT ALL ON public.location_enrichment TO service_role;

ALTER TABLE public.location_enrichment ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_read_location_enrichment ON public.location_enrichment
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY admin_insert_location_enrichment ON public.location_enrichment
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY admin_update_location_enrichment ON public.location_enrichment
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY admin_delete_location_enrichment ON public.location_enrichment
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE INDEX idx_location_enrichment_fonte ON public.location_enrichment(fonte);

CREATE TRIGGER update_location_enrichment_updated_at
  BEFORE UPDATE ON public.location_enrichment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();