-- Fecha o acesso do papel anon à camada Staging (ADR-0001)
--
-- Situação corrigida:
--   staging_locations nasceu com os privilégios default do Supabase para
--   tabelas novas em public, o que dá SELECT ao anon no nível de tabela.
--   O que barrava a leitura anônima era a policy "staging_admin_all" não ter
--   cláusula TO: ela vale para todos os papéis, chama public.is_admin(), e o
--   anon não tem EXECUTE nessa função (REVOKE em 20260908165434). O resultado
--   era um erro de permissão, não uma negativa de leitura.
--
--   Ou seja: o dado não vazava, mas por efeito colateral. O COMMENT da tabela
--   afirma "anon nunca tem acesso" sem nenhum REVOKE que sustente a afirmação.
--
-- Depois desta migration:
--   - anon perde o privilégio de tabela (negativa no nível certo);
--   - "staging_admin_all" passa a valer só para authenticated, como as demais
--     policies que usam is_admin() (build_log, research_locations,
--     location_enrichment, ingest_jobs, ingest_runs).
--
-- Verificação (sem autenticação, com a chave publishable do projeto):
--   curl -s -o /dev/null -w '%{http_code}\n' \
--     "$VITE_SUPABASE_URL/rest/v1/staging_locations?select=id&limit=1" \
--     -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY"
--   Antes:  401 {"code":"42501","message":"permission denied for function is_admin"}
--   Depois: 401 {"code":"42501","message":"permission denied for table staging_locations"}
--
-- Idempotente e independente de ordem: não faz nada se a tabela ainda não existe.

DO $$
BEGIN
  IF to_regclass('public.staging_locations') IS NULL THEN
    RAISE NOTICE 'staging_locations ainda não existe; nada a fazer.';
    RETURN;
  END IF;

  REVOKE ALL ON public.staging_locations FROM anon;

  DROP POLICY IF EXISTS "staging_admin_all" ON public.staging_locations;
  CREATE POLICY "staging_admin_all"
    ON public.staging_locations
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
END
$$;
