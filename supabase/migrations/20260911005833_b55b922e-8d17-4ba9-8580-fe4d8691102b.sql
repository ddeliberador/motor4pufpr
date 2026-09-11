ALTER TABLE public.build_log
  ADD COLUMN IF NOT EXISTS eh_achado_pesquisa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nota_desenvolvimento text;