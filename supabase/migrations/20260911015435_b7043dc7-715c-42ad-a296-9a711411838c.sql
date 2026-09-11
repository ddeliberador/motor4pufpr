CREATE TABLE public.city_geocode (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cidade text NOT NULL,
  uf text NOT NULL,
  lat numeric,
  lon numeric,
  fonte_geocode text NOT NULL DEFAULT 'nominatim',
  nota text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (cidade, uf)
);

GRANT SELECT ON public.city_geocode TO anon;
GRANT SELECT, INSERT, UPDATE ON public.city_geocode TO authenticated;
GRANT ALL ON public.city_geocode TO service_role;

ALTER TABLE public.city_geocode ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_city_geocode" ON public.city_geocode FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "auth_insert_city_geocode" ON public.city_geocode FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_city_geocode" ON public.city_geocode FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_city_geocode_updated_at BEFORE UPDATE ON public.city_geocode
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();