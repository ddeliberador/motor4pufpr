-- ADR-0001 — Issue ARQ-02
-- RPC promote_staging_to_gold(): promoção transacional Staging → Gold
-- Justificativa de plpgsql vs Edge Function: atomicidade garantida pelo Postgres.
-- Edge Function orquestrando REST não tem transação — falha de rede deixa estado inconsistente.

CREATE OR REPLACE FUNCTION public.promote_staging_to_gold(
  p_fonte        text    DEFAULT NULL,
  p_min_score    integer DEFAULT 70,
  p_promoted_by  text    DEFAULT 'auto'
)
RETURNS TABLE(promoted integer, skipped integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promoted integer := 0;
  v_skipped  integer := 0;
  v_row      staging_locations%ROWTYPE;
BEGIN
  -- Promove registros qualificados (score >= limiar, ainda não promovidos)
  FOR v_row IN
    SELECT * FROM staging_locations
    WHERE (p_fonte IS NULL OR fonte = p_fonte)
      AND quality_score >= p_min_score
      AND promoted_at IS NULL
    FOR UPDATE SKIP LOCKED
  LOOP
    INSERT INTO research_locations (
      nome, tipo, uf, municipio,
      latitude, longitude,
      fonte, fonte_url, cnpj,
      raw_metadata, quality_score, quality_flags,
      enriched_at, enrichment_source,
      data_coleta, created_at, updated_at
    ) VALUES (
      v_row.nome,
      COALESCE(v_row.canonical_type, v_row.tipo),
      v_row.uf,
      v_row.municipio,
      v_row.latitude,
      v_row.longitude,
      v_row.fonte,
      COALESCE(v_row.fonte_url, ''),
      v_row.cnpj,
      v_row.raw_payload,
      v_row.quality_score,
      v_row.quality_flags,
      now(),
      'staging_promotion_' || p_promoted_by,
      now(),
      now(),
      now()
    )
    ON CONFLICT (fonte, lower(nome), coalesce(uf, '')) DO UPDATE SET
      tipo              = EXCLUDED.tipo,
      quality_score     = EXCLUDED.quality_score,
      quality_flags     = EXCLUDED.quality_flags,
      enrichment_source = EXCLUDED.enrichment_source,
      updated_at        = now();

    -- Marca como promovido no Staging (nunca deleta — mantém histórico)
    UPDATE staging_locations
    SET
      promoted_at = now(),
      promoted_by = p_promoted_by,
      updated_at  = now()
    WHERE id = v_row.id;

    v_promoted := v_promoted + 1;
  END LOOP;

  -- Conta quantos ficaram abaixo do limiar (fila de revisão)
  SELECT COUNT(*) INTO v_skipped
  FROM staging_locations
  WHERE (p_fonte IS NULL OR fonte = p_fonte)
    AND quality_score < p_min_score
    AND promoted_at IS NULL;

  RETURN QUERY SELECT v_promoted, v_skipped;
END;
$$;

-- Apenas admins podem chamar a promoção
REVOKE ALL ON FUNCTION public.promote_staging_to_gold FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_staging_to_gold TO service_role;

COMMENT ON FUNCTION public.promote_staging_to_gold IS
  'ADR-0001 ARQ-02. Promove staging_locations → research_locations dentro de uma transação. Idempotente: rodar duas vezes não duplica. Verificação: SELECT * FROM promote_staging_to_gold(''openalex'', 70, ''test'') duas vezes — segunda deve retornar promoted=0.';