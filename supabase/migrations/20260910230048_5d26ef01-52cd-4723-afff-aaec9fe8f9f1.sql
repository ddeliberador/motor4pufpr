CREATE TABLE public.build_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data date NOT NULL,
  categoria text NOT NULL CHECK (categoria IN ('fonte_de_dado','decisao_arquitetura','obstaculo_institucional','correcao_bug','integracao_externa')),
  titulo text NOT NULL,
  descricao text,
  fonte text,
  dificuldade text,
  resolucao text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.build_log TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.build_log TO authenticated;
GRANT ALL ON public.build_log TO service_role;

ALTER TABLE public.build_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_build_log" ON public.build_log FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "auth_insert_build_log" ON public.build_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_build_log" ON public.build_log FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_build_log" ON public.build_log FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_build_log_data ON public.build_log (data DESC);