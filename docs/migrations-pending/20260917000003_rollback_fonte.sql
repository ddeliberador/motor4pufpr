-- ADR-0001 — Issue ARQ-03
-- RPC rollback_fonte(): reverte Gold para estado anterior de uma fonte
--
-- Staging nunca é deletado — o histórico sempre permite rollback.
-- DELETE + INSERT dentro da mesma transação: Gold nunca fica vazio no meio.
--
-- Depende de: 20260917000001 e 20260917000002
--
-- Verificação:
--   SELECT COUNT(*) FROM research_locations WHERE fonte = 'openalex'; -- antes
--   SELECT rollback_fonte('openalex', now() - interval '1 day');
--   SELECT COUNT(*) FROM research_locations WHERE fonte = 'openalex'; -- depois (> 0)

CREATE OR REPLACE FUNCTION public.rollback_fonte(
  p_fonte       text,
  p_snapshot_at timestamptz DEFAULT now() - interval '1 day'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restored integer := 0;
BEGIN
  DELETE FROM research_locations WHERE fonte = p_fonte;

  INSERT INTO research_locations (
    nome, tipo, uf, municipio,
    latitude, longitude,
    fonte, fonte_url, cnpj,
    raw_metadata, quality_score, quality_flags,
    data_coleta, created_at, updated_at
  )
  SELECT
    nome,
    COALESCE(canonical_type, tipo),
    uf, municipio,
    latitude, longitude,
    fonte, COALESCE(fonte_url, ''), cnpj,
    raw_payload, quality_score, quality_flags,
    now(), now(), now()
  FROM staging_locations
  WHERE fonte = p_fonte
    AND promoted_at IS NOT NULL
    AND promoted_at <= p_snapshot_at;

  GET DIAGNOSTICS v_restored = ROW_COUNT;
  RETURN v_restored;
END;
$$;

REVOKE ALL ON FUNCTION public.rollback_fonte FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rollback_fonte TO service_role;

COMMENT ON FUNCTION public.rollback_fonte IS
  'ADR-0001 ARQ-03. Reverte research_locations (Gold) para estado anterior de uma fonte usando histórico do Staging.';
