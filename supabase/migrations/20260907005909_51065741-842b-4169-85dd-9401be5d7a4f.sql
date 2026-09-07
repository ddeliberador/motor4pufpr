ALTER VIEW public.faq_public SET (security_invoker = true);

-- Acesso público restrito por coluna + por linha (só publicadas)
GRANT SELECT (id, type, faq_question, faq_answer, created_at, status) ON public.community_feedback TO anon;

CREATE POLICY "public_read_published_faq" ON public.community_feedback
  FOR SELECT TO anon USING (status = 'publicado');