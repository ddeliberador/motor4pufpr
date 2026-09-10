CREATE POLICY tmp_insert_lisp ON public.research_locations FOR INSERT TO anon WITH CHECK (fonte = 'lisp_brasil_mapeamento');
GRANT INSERT ON public.research_locations TO anon;