CREATE TABLE public.agenda_coletas (
  job text PRIMARY KEY,
  funcao text NOT NULL,
  cron text NOT NULL,
  descricao text,
  ultima_execucao timestamptz,
  ultimo_status text,
  ultima_mensagem text
);
GRANT SELECT ON public.agenda_coletas TO anon, authenticated;
GRANT ALL ON public.agenda_coletas TO service_role;
ALTER TABLE public.agenda_coletas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agenda_coletas leitura publica" ON public.agenda_coletas FOR SELECT TO anon, authenticated USING (true);