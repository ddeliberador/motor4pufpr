DELETE FROM public.research_authors a
USING public.research_authors b
WHERE a.user_id = b.user_id
  AND a.name = b.name
  AND a.created_at > b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS research_authors_user_name_unique
  ON public.research_authors(user_id, name);