REVOKE ALL ON public.community_feedback FROM anon;
GRANT INSERT ON public.community_feedback TO anon;
GRANT SELECT (id, type, faq_question, faq_answer, created_at, status) ON public.community_feedback TO anon;

REVOKE ALL ON public.community_feedback FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_feedback TO authenticated;