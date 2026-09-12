-- build_log
DROP POLICY IF EXISTS "auth_insert_build_log" ON public.build_log;
DROP POLICY IF EXISTS "auth_update_build_log" ON public.build_log;
DROP POLICY IF EXISTS "auth_delete_build_log" ON public.build_log;
CREATE POLICY admin_insert_build_log ON public.build_log FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY admin_update_build_log ON public.build_log FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY admin_delete_build_log ON public.build_log FOR DELETE TO authenticated USING (public.is_admin());

-- science_specialization_index
DROP POLICY IF EXISTS "auth_insert_science_specialization" ON public.science_specialization_index;
DROP POLICY IF EXISTS "auth_update_science_specialization" ON public.science_specialization_index;
DROP POLICY IF EXISTS "auth_delete_science_specialization" ON public.science_specialization_index;
CREATE POLICY admin_insert_science_specialization ON public.science_specialization_index FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY admin_update_science_specialization ON public.science_specialization_index FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY admin_delete_science_specialization ON public.science_specialization_index FOR DELETE TO authenticated USING (public.is_admin());

-- regional_institutes
DROP POLICY IF EXISTS "auth_insert_regional_institutes" ON public.regional_institutes;
DROP POLICY IF EXISTS "auth_update_regional_institutes" ON public.regional_institutes;
DROP POLICY IF EXISTS "auth_delete_regional_institutes" ON public.regional_institutes;
CREATE POLICY admin_insert_regional_institutes ON public.regional_institutes FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY admin_update_regional_institutes ON public.regional_institutes FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY admin_delete_regional_institutes ON public.regional_institutes FOR DELETE TO authenticated USING (public.is_admin());

-- city_geocode
DROP POLICY IF EXISTS "auth_insert_city_geocode" ON public.city_geocode;
DROP POLICY IF EXISTS "auth_update_city_geocode" ON public.city_geocode;
REVOKE INSERT, UPDATE ON public.city_geocode FROM authenticated;
GRANT ALL ON public.city_geocode TO service_role;

-- anexo de texto no diário
ALTER TABLE public.build_log ADD COLUMN IF NOT EXISTS anexo_texto text;