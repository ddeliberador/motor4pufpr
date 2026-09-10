ALTER TABLE public.research_locations DROP CONSTRAINT IF EXISTS research_locations_fonte_check;
ALTER TABLE public.research_locations ADD CONSTRAINT research_locations_fonte_check CHECK (fonte IN ('openalex','embrapii','inep_censo_superior','mcti_formict','sinapad','lisp_brasil_mapeamento','otd_cgee'));
CREATE POLICY tmp_insert_otd ON public.research_locations FOR INSERT TO anon WITH CHECK (fonte = 'otd_cgee');
GRANT INSERT ON public.research_locations TO anon;