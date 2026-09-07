ALTER TABLE public.search_snapshots
  ADD COLUMN IF NOT EXISTS uf text,
  ADD COLUMN IF NOT EXISTS municipio_ibge text;

CREATE INDEX IF NOT EXISTS search_snapshots_tema_uf_mun_idx
  ON public.search_snapshots (tema_normalizado, uf, municipio_ibge, created_at DESC);