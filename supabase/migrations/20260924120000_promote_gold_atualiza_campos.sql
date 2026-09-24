-- promote_staging_to_gold: o upsert no Gold passa a atualizar localização e
-- metadados, não só tipo e score.
--
-- Problema
-- --------
-- Na versão aplicada pela drizzle/migrations/0009, quando o registro já existe
-- no Gold (mesma chave fonte + lower(nome) + uf), o ON CONFLICT só regrava
-- tipo, quality_score, quality_flags e enrichment_source. Município, latitude,
-- longitude, fonte_url, cnpj, raw_metadata e data_coleta ficam congelados na
-- primeira carga: se a fonte corrigir uma coordenada, a Staging recebe o valor
-- novo, o registro é marcado como promovido e o mapa continua mostrando o
-- ponto antigo — sem erro em lugar nenhum.
--
-- O que muda
-- ----------
-- 1. O ON CONFLICT atualiza municipio, latitude/longitude, fonte_url, cnpj,
--    raw_metadata e data_coleta.
-- 2. Valor ausente na Staging NÃO apaga valor presente no Gold (COALESCE).
--    Isso importa: a ingestão da EMBRAPII sempre envia latitude/longitude
--    nulas, e o Gold tem coordenadas para parte dessas unidades. Sobrescrever
--    direto apagaria esses pontos do mapa.
-- 3. Latitude e longitude andam juntas: só são trocadas quando a Staging traz
--    as duas. Nunca sai do upsert um par misturado (lat nova + lon velha).
-- 4. raw_metadata é mesclado (Gold || Staging): chaves novas ou alteradas vêm
--    da fonte, chaves que só existem no Gold são preservadas.
-- 5. O laço processa a Staging em ordem de chegada (created_at, id). Sem
--    ORDER BY, com duas linhas pendentes para a mesma chave, a mais antiga
--    podia ser aplicada por último e desfazer a mais nova.
--
-- Assinatura, limiar padrão (55), SECURITY DEFINER, GRANT e retorno são os
-- mesmos da 0009. Aplicar sobre a produção só troca o corpo da função.
--
-- Depende da camada Staging em supabase/migrations
-- (20260920120100_camada_staging_adr_0001.sql, PR #28).

CREATE OR REPLACE FUNCTION public.promote_staging_to_gold(
  p_fonte        text    DEFAULT NULL,
  p_min_score    integer DEFAULT 55,
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
  FOR v_row IN
    SELECT * FROM staging_locations
    WHERE (p_fonte IS NULL OR fonte = p_fonte)
      AND quality_score >= p_min_score
      AND promoted_at IS NULL
    ORDER BY created_at, id
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
      municipio         = COALESCE(EXCLUDED.municipio, research_locations.municipio),
      latitude          = CASE
                            WHEN EXCLUDED.latitude IS NOT NULL AND EXCLUDED.longitude IS NOT NULL
                            THEN EXCLUDED.latitude
                            ELSE research_locations.latitude
                          END,
      longitude         = CASE
                            WHEN EXCLUDED.latitude IS NOT NULL AND EXCLUDED.longitude IS NOT NULL
                            THEN EXCLUDED.longitude
                            ELSE research_locations.longitude
                          END,
      fonte_url         = COALESCE(NULLIF(EXCLUDED.fonte_url, ''), research_locations.fonte_url),
      cnpj              = COALESCE(EXCLUDED.cnpj, research_locations.cnpj),
      raw_metadata      = COALESCE(research_locations.raw_metadata, '{}'::jsonb)
                          || COALESCE(EXCLUDED.raw_metadata, '{}'::jsonb),
      quality_score     = EXCLUDED.quality_score,
      quality_flags     = EXCLUDED.quality_flags,
      enriched_at       = EXCLUDED.enriched_at,
      enrichment_source = EXCLUDED.enrichment_source,
      data_coleta       = EXCLUDED.data_coleta,
      updated_at        = now();

    UPDATE staging_locations
    SET
      promoted_at = now(),
      promoted_by = p_promoted_by,
      updated_at  = now()
    WHERE id = v_row.id;

    v_promoted := v_promoted + 1;
  END LOOP;

  SELECT COUNT(*) INTO v_skipped
  FROM staging_locations
  WHERE (p_fonte IS NULL OR fonte = p_fonte)
    AND quality_score < p_min_score
    AND promoted_at IS NULL;

  RETURN QUERY SELECT v_promoted, v_skipped;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_staging_to_gold FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_staging_to_gold TO service_role;

COMMENT ON FUNCTION public.promote_staging_to_gold IS
  'ADR-0001 ARQ-02. Promove staging_locations → research_locations em transação única, em ordem de chegada. Limiar padrão 55 (revisado de 70: teto realista de fontes sem CNPJ/endereço). Upsert atualiza localização e metadados sem apagar valor presente no Gold com nulo da Staging. Idempotente: segunda chamada retorna promoted=0.';

-- Verificação (SQL Editor, depois de aplicar):
--   SELECT pg_get_functiondef('public.promote_staging_to_gold(text,integer,text)'::regprocedure)
--     ~ 'ORDER BY created_at, id' AS corpo_novo;          -- deve ser true
