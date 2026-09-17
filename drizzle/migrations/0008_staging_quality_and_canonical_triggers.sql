-- Gatilho de qualidade + classificação canônica na camada Staging (ADR-0001)
-- staging_locations usa raw_payload (não raw_metadata), então precisa de função própria.

CREATE OR REPLACE FUNCTION public.trg_staging_qualify()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- 1. Score de qualidade (mesma régua do Gold, lendo raw_payload)
  NEW.quality_score := calc_quality_score(
    NEW.latitude, NEW.longitude, NEW.cnpj, NEW.fonte_url,
    NEW.nome, NEW.municipio, NEW.raw_payload
  );

  NEW.quality_flags := jsonb_build_object(
    'sem_lat',      (NEW.latitude IS NULL),
    'sem_cnpj',     (NEW.cnpj IS NULL OR length(regexp_replace(COALESCE(NEW.cnpj,''), '\D','','g')) <> 14),
    'sem_url',      (NEW.fonte_url IS NULL OR NEW.fonte_url NOT LIKE 'http%'),
    'sem_endereco', NOT (NEW.raw_payload ? 'endereco' OR NEW.raw_payload ? 'address' OR NEW.raw_payload ? 'logradouro'),
    'coord_centroide', (
      NEW.latitude IS NOT NULL AND
      (NEW.latitude * 1000) = ROUND(NEW.latitude * 1000) AND
      ABS(NEW.latitude - ROUND(NEW.latitude, 1)) < 0.01
    ),
    'tipo_composto', (length(COALESCE(NEW.tipo,'')) > 50)
  );

  -- 2. Tipo canônico via classify_tipo (mesma lógica do dataLake.ts)
  NEW.canonical_type := classify_tipo(NEW.nome, NEW.tipo, NEW.raw_payload);

  -- 3. Chave canônica de deduplicação (fonte + nome normalizado + uf)
  NEW.canonical_key := lower(NEW.fonte) || '|' || lower(trim(NEW.nome)) || '|' || lower(COALESCE(NEW.uf, ''));

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_staging_qualify ON public.staging_locations;
CREATE TRIGGER trg_staging_qualify
  BEFORE INSERT OR UPDATE ON public.staging_locations
  FOR EACH ROW EXECUTE FUNCTION public.trg_staging_qualify();

COMMENT ON FUNCTION public.trg_staging_qualify IS
  'ADR-0001. Calcula quality_score/quality_flags, canonical_type (classify_tipo) e canonical_key em toda escrita na Staging. Score nunca depende do conector.';