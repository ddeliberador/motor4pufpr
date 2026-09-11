CREATE POLICY "tmp_insert_research_locations" ON public.research_locations FOR INSERT TO anon WITH CHECK (true);
GRANT INSERT ON public.research_locations TO anon;