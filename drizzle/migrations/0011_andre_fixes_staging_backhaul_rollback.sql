-- PRs #27, #30, #31, #37 (maia-andre). Delta efetivo sobre produção.
REVOKE ALL ON public.staging_locations FROM anon;
DROP POLICY IF EXISTS "staging_admin_all" ON public.staging_locations;
CREATE POLICY "staging_admin_all" ON public.staging_locations FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.promote_staging_to_gold(
  p_fonte text DEFAULT NULL, p_min_score integer DEFAULT 55, p_promoted_by text DEFAULT 'auto'
)
RETURNS TABLE(promoted integer, skipped integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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
      nome, tipo, uf, municipio, latitude, longitude, fonte, fonte_url, cnpj,
      raw_metadata, quality_score, quality_flags, enriched_at, enrichment_source,
      data_coleta, created_at, updated_at
    ) VALUES (
      v_row.nome, COALESCE(v_row.canonical_type, v_row.tipo), v_row.uf, v_row.municipio,
      v_row.latitude, v_row.longitude, v_row.fonte, COALESCE(v_row.fonte_url, ''), v_row.cnpj,
      v_row.raw_payload, v_row.quality_score, v_row.quality_flags, now(),
      'staging_promotion_' || p_promoted_by, now(), now(), now()
    )
    ON CONFLICT (fonte, lower(nome), coalesce(uf, '')) DO UPDATE SET
      tipo              = EXCLUDED.tipo,
      municipio         = COALESCE(EXCLUDED.municipio, research_locations.municipio),
      latitude          = CASE WHEN EXCLUDED.latitude IS NOT NULL AND EXCLUDED.longitude IS NOT NULL
                            THEN EXCLUDED.latitude ELSE research_locations.latitude END,
      longitude         = CASE WHEN EXCLUDED.latitude IS NOT NULL AND EXCLUDED.longitude IS NOT NULL
                            THEN EXCLUDED.longitude ELSE research_locations.longitude END,
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

    UPDATE staging_locations SET promoted_at = now(), promoted_by = p_promoted_by, updated_at = now()
    WHERE id = v_row.id;
    v_promoted := v_promoted + 1;
  END LOOP;

  SELECT COUNT(*) INTO v_skipped FROM staging_locations
  WHERE (p_fonte IS NULL OR fonte = p_fonte) AND quality_score < p_min_score AND promoted_at IS NULL;

  RETURN QUERY SELECT v_promoted, v_skipped;
END;
$$;
REVOKE ALL ON FUNCTION public.promote_staging_to_gold FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_staging_to_gold TO service_role;

CREATE OR REPLACE FUNCTION public.rollback_fonte(
  p_fonte text, p_snapshot_at timestamptz DEFAULT now() - interval '1 day'
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_restored integer := 0;
BEGIN
  DELETE FROM research_locations WHERE fonte = p_fonte;
  INSERT INTO research_locations (
    nome, tipo, uf, municipio, latitude, longitude, fonte, fonte_url, cnpj,
    raw_metadata, quality_score, quality_flags, data_coleta, created_at, updated_at
  )
  SELECT s.nome, COALESCE(s.canonical_type, s.tipo), s.uf, s.municipio, s.latitude, s.longitude,
    s.fonte, COALESCE(s.fonte_url, ''), s.cnpj, s.raw_payload, s.quality_score, s.quality_flags,
    now(), now(), now()
  FROM (
    SELECT DISTINCT ON (fonte, lower(nome), coalesce(uf, '')) *
    FROM staging_locations
    WHERE fonte = p_fonte AND promoted_at IS NOT NULL AND promoted_at <= p_snapshot_at
    ORDER BY fonte, lower(nome), coalesce(uf, ''), promoted_at DESC, created_at DESC
  ) s;
  GET DIAGNOSTICS v_restored = ROW_COUNT;
  RETURN v_restored;
END;
$$;
REVOKE ALL ON FUNCTION public.rollback_fonte FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rollback_fonte TO service_role;

CREATE TABLE IF NOT EXISTS public.infra_backhaul_municipio (
  codigo_ibge  text PRIMARY KEY CHECK (codigo_ibge ~ '^\d{7}$'),
  municipio    text NOT NULL,
  uf           text NOT NULL,
  latitude     double precision NOT NULL,
  longitude    double precision NOT NULL,
  tem_backhaul boolean NOT NULL,
  tipo         text NOT NULL,
  ano          text NOT NULL,
  fonte        text NOT NULL,
  coletado_em  timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.infra_backhaul_municipio FROM anon, authenticated;
GRANT ALL ON public.infra_backhaul_municipio TO service_role;
ALTER TABLE public.infra_backhaul_municipio ENABLE ROW LEVEL SECURITY;