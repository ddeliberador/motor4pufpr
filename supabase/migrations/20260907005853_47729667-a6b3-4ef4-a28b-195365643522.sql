CREATE TABLE public.community_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL CHECK (type IN ('duvida','correcao','sugestao')),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 4000),
  context_query text,
  context_persona text,
  email text,
  status text NOT NULL DEFAULT 'novo' CHECK (status IN ('novo','em_analise','publicado','arquivado')),
  faq_question text,
  faq_answer text
);

GRANT INSERT ON public.community_feedback TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_feedback TO authenticated;
GRANT ALL ON public.community_feedback TO service_role;

ALTER TABLE public.community_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_submit_feedback" ON public.community_feedback
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'novo' AND faq_question IS NULL AND faq_answer IS NULL);

CREATE POLICY "admin_read_feedback" ON public.community_feedback
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_update_feedback" ON public.community_feedback
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "admin_delete_feedback" ON public.community_feedback
  FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_community_feedback_updated_at
  BEFORE UPDATE ON public.community_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_community_feedback_status ON public.community_feedback (status, created_at DESC);

-- View pública: somente entradas publicadas, sem email/message brutos.
-- security_invoker=false (padrão) para que a view leia a tabela base com privilégios do dono,
-- já que anon não tem SELECT na tabela base.
CREATE VIEW public.faq_public
WITH (security_invoker = false, security_barrier = true) AS
  SELECT id, type, faq_question, faq_answer, created_at
  FROM public.community_feedback
  WHERE status = 'publicado' AND faq_question IS NOT NULL AND faq_answer IS NOT NULL;

GRANT SELECT ON public.faq_public TO anon, authenticated;