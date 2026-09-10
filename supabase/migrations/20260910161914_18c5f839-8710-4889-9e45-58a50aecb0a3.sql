DROP POLICY IF EXISTS tmp_insert_otd ON public.research_locations;
REVOKE INSERT ON public.research_locations FROM anon;