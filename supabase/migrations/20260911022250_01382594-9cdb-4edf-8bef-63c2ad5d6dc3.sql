DROP POLICY IF EXISTS "tmp_insert_research_locations" ON public.research_locations;
REVOKE INSERT ON public.research_locations FROM anon;