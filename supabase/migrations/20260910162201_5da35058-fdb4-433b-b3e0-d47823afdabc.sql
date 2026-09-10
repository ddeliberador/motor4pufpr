CREATE TABLE public.science_specialization_index (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  area_en text NOT NULL,
  grande_area_en text NOT NULL,
  area_pt text NOT NULL,
  grande_area_pt text NOT NULL,
  quadrante integer,
  ie numeric,
  participacao_brasil_pct numeric,
  volume_brasil integer,
  crescimento_pct numeric,
  fonte text NOT NULL DEFAULT 'octi_cgee_wos',
  fonte_url text NOT NULL DEFAULT 'https://octi.cgee.org.br/panoramas/brasil/outros/painel-wos',
  periodo text NOT NULL DEFAULT '2023-2025',
  data_coleta timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.science_specialization_index TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.science_specialization_index TO authenticated;
GRANT ALL ON public.science_specialization_index TO service_role;
ALTER TABLE public.science_specialization_index ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_read_science_specialization ON public.science_specialization_index FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY auth_insert_science_specialization ON public.science_specialization_index FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY auth_update_science_specialization ON public.science_specialization_index FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_delete_science_specialization ON public.science_specialization_index FOR DELETE TO authenticated USING (true);
CREATE UNIQUE INDEX science_specialization_area_key ON public.science_specialization_index (lower(area_en));
CREATE INDEX science_specialization_area_pt_idx ON public.science_specialization_index (lower(area_pt));
CREATE TRIGGER trg_science_specialization_updated BEFORE UPDATE ON public.science_specialization_index FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();