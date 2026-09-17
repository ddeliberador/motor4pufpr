-- ADR-0001 — Issue ARQ-03
-- RPC rollback_fonte(): reverte Gold para estado anterior de uma fonte
-- Staging nunca é deletado, então o histórico sempre permite rollback

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
  -- Remove registros atuais da fonte no Gold
  DELETE FROM research_locations WHERE fonte = p_fonte;

  -- Reinsere a partir do Staging (estado no momento do snapshot)
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
  'ADR-0001 ARQ-03. Restaura research_locations (Gold) para o estado de uma fonte em um momento anterior, a partir do histórico de staging_locations. Nunca deixa o Gold vazio — DELETE e INSERT dentro da mesma transação.';