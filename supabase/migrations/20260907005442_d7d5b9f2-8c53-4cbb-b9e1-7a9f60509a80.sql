CREATE TABLE public.search_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  tema_normalizado text NOT NULL,
  tema_original text,
  gt numeric,
  cd numeric,
  aue numeric,
  ei numeric,
  total_papers integer,
  total_contracts integer,
  trl numeric,
  source_count integer
);

GRANT SELECT ON public.search_snapshots TO anon, authenticated;
GRANT ALL ON public.search_snapshots TO service_role;

ALTER TABLE public.search_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_snapshots" ON public.search_snapshots
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "service_insert_snapshots" ON public.search_snapshots
  FOR INSERT TO service_role WITH CHECK (true);

CREATE INDEX idx_search_snapshots_tema ON public.search_snapshots (tema_normalizado, created_at);