-- Issue #32: termos de busca não podem ser lidos por visitantes. Só a edge function (service_role) lê.
DROP POLICY IF EXISTS "public_read_snapshots" ON public.search_snapshots;
REVOKE SELECT ON public.search_snapshots FROM anon, authenticated;
GRANT ALL ON public.search_snapshots TO service_role;